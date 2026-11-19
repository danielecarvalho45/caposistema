-- CAPO 19/11/2026: correção cirúrgica de isolamento do suporte TI/Notificações.
-- Chamados reais permanecem intocados; nenhum registro apagado ou transferido.

-- Separa chamados de suporte por identidade de origem, sem criar segundo banco.
create or replace function private.capo_support_ticket_visible_in_context(p_request_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,private,auth,pg_temp
as $$
  select coalesce((
    select coalesce(requester.is_homologation_account,false) =
           coalesce(viewer.is_homologation_account,false)
      and (
        not coalesce(viewer.is_homologation_account,false)
        or public.capo_homologation_context_enabled()
      )
    from public.technical_support_requests tsr
    join public.user_accounts requester on requester.id=tsr.requester_account_id
    join public.user_accounts viewer on viewer.auth_user_id=auth.uid() and viewer.is_active=true
    where tsr.id=p_request_id
    limit 1
  ),false);
$$;
revoke all on function private.capo_support_ticket_visible_in_context(uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_my_notifications_by_category_for_interface(p_category text DEFAULT 'general'::text, p_state text DEFAULT 'unread'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(notification_id uuid, notification_type text, title text, message text, priority text, status text, patient_id uuid, entity_type text, entity_id uuid, created_at timestamp with time zone, read_at timestamp with time zone, resolved_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_roles text[];
  v_limit integer;
  v_offset integer;
  v_is_homologation boolean := false;
  v_simulated_role text;
  v_state text := lower(btrim(coalesce(p_state,'unread')));
  v_category text := lower(btrim(coalesce(p_category,'general')));
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not public.has_accepted_current_legal_term() then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  select coalesce(array_agg(distinct lower(trim(ar.code))),array[]::text[])
    into v_roles
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
    and ar.is_active=true;

  if v_is_homologation then
    select lower(trim(ar.code))
      into v_simulated_role
    from public.homologation_contexts hc
    join public.app_roles ar on ar.id=hc.simulated_role_id and ar.is_active=true
    where hc.actor_account_id=v_account_id
      and hc.is_enabled=true
    limit 1;

    if v_simulated_role is not null
       and not (v_simulated_role=any(v_roles)) then
      v_roles:=array_append(v_roles,v_simulated_role);
    end if;
  end if;

  if v_category not in ('general','confirmations') then
    raise exception 'Categoria de notificações inválida.' using errcode='22023';
  end if;
  if v_state not in ('unread','read','resolved','all') then
    raise exception 'Filtro de notificações inválido.' using errcode='22023';
  end if;

  v_limit:=least(greatest(coalesce(p_limit,20),1),100);
  v_offset:=greatest(coalesce(p_offset,0),0);

  return query
  with scoped as (
    select
      n.*,
      private.capo_notification_patient_id(
        n.patient_id,n.entity_type,n.entity_id
      ) as effective_patient_id
    from public.notifications n
  ),
  authorized_notifications as (
    select n.*
    from scoped n
    where (n.entity_type is distinct from 'technical_support_requests' or private.capo_support_ticket_visible_in_context(n.entity_id))
      and (
      (
        n.effective_patient_id is not null
        and public.capo_patient_visible_in_current_context(n.effective_patient_id)
      )
      or (
        n.effective_patient_id is null
        and (
          not v_is_homologation
          or n.user_id=auth.uid()
          or (lower(trim(coalesce(n.target_role,'')))='administrador_tecnico'
              and n.entity_type='technical_support_requests'
              and private.capo_support_ticket_visible_in_context(n.entity_id))
        )
      )
    )
      and not (
        n.notification_type = 'patient_death'
        and n.entity_type in ('patients','patient')
        and exists (
          select 1
          from public.patients pd
          join public.user_accounts registrar on registrar.id = pd.death_recorded_by
          where pd.id = n.entity_id
            and registrar.auth_user_id = auth.uid()
        )
      )
      and (
        n.user_id=auth.uid()
        or lower(trim(n.target_role))=any(v_roles)
        or (
          lower(trim(n.target_role))='profissional'
          and exists(
            select 1 from unnest(v_roles) role_code
            where role_code not in (
              'administrador','administrativo_operacional',
              'coordenador','administrador_tecnico'
            )
          )
        )
        or 'administrador'=any(v_roles)
      )
      and (
        (v_category='confirmations' and n.notification_type in
          ('appointment_confirmation_unanswered','appointment_patient_reschedule'))
        or (v_category='general' and n.notification_type not in
          ('appointment_confirmation_unanswered','appointment_patient_reschedule'))
      )
      and (
        (v_state='unread' and n.resolved_at is null and n.read_at is null)
        or (v_state='read' and n.resolved_at is null and n.read_at is not null)
        or (v_state='resolved' and n.resolved_at is not null)
        or v_state='all'
      )
  )
  select
    n.id,n.notification_type,n.title,n.message,n.priority,n.status,
    n.patient_id,n.entity_type,n.entity_id,n.created_at,n.read_at,n.resolved_at,
    count(*) over()::bigint
  from authorized_notifications n
  order by
    case lower(coalesce(n.priority,'normal'))
      when 'urgente' then 1
      when 'alta' then 2
      when 'normal' then 3
      when 'baixa' then 4
      else 5
    end,
    n.created_at desc
  limit v_limit offset v_offset;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_notifications_by_state_for_interface(p_state text DEFAULT 'unread'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(notification_id uuid, notification_type text, title text, message text, priority text, status text, patient_id uuid, entity_type text, entity_id uuid, created_at timestamp with time zone, read_at timestamp with time zone, resolved_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_roles text[];
  v_limit integer;
  v_offset integer;
  v_is_homologation boolean := false;
  v_simulated_role text;
  v_state text := lower(btrim(coalesce(p_state,'unread')));
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not public.has_accepted_current_legal_term() then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  select coalesce(array_agg(distinct lower(trim(ar.code))),array[]::text[])
    into v_roles
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
    and ar.is_active=true;

  if v_is_homologation then
    select lower(trim(ar.code))
      into v_simulated_role
    from public.homologation_contexts hc
    join public.app_roles ar on ar.id=hc.simulated_role_id and ar.is_active=true
    where hc.actor_account_id=v_account_id
      and hc.is_enabled=true
    limit 1;

    if v_simulated_role is not null
       and not (v_simulated_role=any(v_roles)) then
      v_roles:=array_append(v_roles,v_simulated_role);
    end if;
  end if;

  if v_state not in ('unread','read','resolved','all') then
    raise exception 'Filtro de notificações inválido.' using errcode='22023';
  end if;

  v_limit:=least(greatest(coalesce(p_limit,20),1),100);
  v_offset:=greatest(coalesce(p_offset,0),0);

  return query
  with scoped as (
    select
      n.*,
      private.capo_notification_patient_id(
        n.patient_id,n.entity_type,n.entity_id
      ) as effective_patient_id
    from public.notifications n
  ),
  authorized_notifications as (
    select n.*
    from scoped n
    where (n.entity_type is distinct from 'technical_support_requests' or private.capo_support_ticket_visible_in_context(n.entity_id))
      and (
      (
        n.effective_patient_id is not null
        and public.capo_patient_visible_in_current_context(n.effective_patient_id)
      )
      or (
        n.effective_patient_id is null
        and (
          not v_is_homologation
          or n.user_id=auth.uid()
          or (lower(trim(coalesce(n.target_role,'')))='administrador_tecnico'
              and n.entity_type='technical_support_requests'
              and private.capo_support_ticket_visible_in_context(n.entity_id))
        )
      )
    )
      and not (
        n.notification_type = 'patient_death'
        and n.entity_type in ('patients','patient')
        and exists (
          select 1
          from public.patients pd
          join public.user_accounts registrar on registrar.id = pd.death_recorded_by
          where pd.id = n.entity_id
            and registrar.auth_user_id = auth.uid()
        )
      )
      and (
        n.user_id=auth.uid()
        or lower(trim(n.target_role))=any(v_roles)
        or (
          lower(trim(n.target_role))='profissional'
          and exists(
            select 1 from unnest(v_roles) role_code
            where role_code not in (
              'administrador','administrativo_operacional',
              'coordenador','administrador_tecnico'
            )
          )
        )
        or 'administrador'=any(v_roles)
      )
      and (
        (v_state='unread' and n.resolved_at is null and n.read_at is null)
        or (v_state='read' and n.resolved_at is null and n.read_at is not null)
        or (v_state='resolved' and n.resolved_at is not null)
        or v_state='all'
      )
  )
  select
    n.id,n.notification_type,n.title,n.message,n.priority,n.status,
    n.patient_id,n.entity_type,n.entity_id,n.created_at,n.read_at,n.resolved_at,
    count(*) over()::bigint
  from authorized_notifications n
  order by
    case lower(coalesce(n.priority,'normal'))
      when 'urgente' then 1
      when 'alta' then 2
      when 'normal' then 3
      when 'baixa' then 4
      else 5
    end,
    n.created_at desc
  limit v_limit offset v_offset;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_notifications_for_interface(p_only_unread boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(notification_id uuid, notification_type text, title text, message text, priority text, status text, patient_id uuid, entity_type text, entity_id uuid, created_at timestamp with time zone, read_at timestamp with time zone, resolved_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_roles text[];
  v_limit integer;
  v_offset integer;
  v_is_homologation boolean := false;
  v_simulated_role text;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not public.has_accepted_current_legal_term() then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  select coalesce(array_agg(distinct lower(trim(ar.code))),array[]::text[])
    into v_roles
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
    and ar.is_active=true;

  if v_is_homologation then
    select lower(trim(ar.code))
      into v_simulated_role
    from public.homologation_contexts hc
    join public.app_roles ar on ar.id=hc.simulated_role_id and ar.is_active=true
    where hc.actor_account_id=v_account_id
      and hc.is_enabled=true
    limit 1;

    if v_simulated_role is not null
       and not (v_simulated_role=any(v_roles)) then
      v_roles:=array_append(v_roles,v_simulated_role);
    end if;
  end if;

  v_limit:=least(greatest(coalesce(p_limit,20),1),100);
  v_offset:=greatest(coalesce(p_offset,0),0);

  return query
  with scoped as (
    select
      n.*,
      private.capo_notification_patient_id(
        n.patient_id,n.entity_type,n.entity_id
      ) as effective_patient_id
    from public.notifications n
  ),
  authorized_notifications as (
    select n.*
    from scoped n
    where (n.entity_type is distinct from 'technical_support_requests' or private.capo_support_ticket_visible_in_context(n.entity_id))
      and (
      (
        n.effective_patient_id is not null
        and public.capo_patient_visible_in_current_context(n.effective_patient_id)
      )
      or (
        n.effective_patient_id is null
        and (
          not v_is_homologation
          or n.user_id=auth.uid()
          or (lower(trim(coalesce(n.target_role,'')))='administrador_tecnico'
              and n.entity_type='technical_support_requests'
              and private.capo_support_ticket_visible_in_context(n.entity_id))
        )
      )
    )
      and not (
        n.notification_type = 'patient_death'
        and n.entity_type in ('patients','patient')
        and exists (
          select 1
          from public.patients pd
          join public.user_accounts registrar on registrar.id = pd.death_recorded_by
          where pd.id = n.entity_id
            and registrar.auth_user_id = auth.uid()
        )
      )
      and (
        n.user_id=auth.uid()
        or lower(trim(n.target_role))=any(v_roles)
        or (
          lower(trim(n.target_role))='profissional'
          and exists(
            select 1 from unnest(v_roles) role_code
            where role_code not in (
              'administrador','administrativo_operacional',
              'coordenador','administrador_tecnico'
            )
          )
        )
        or 'administrador'=any(v_roles)
      )
      and n.resolved_at is null
      and (
        not coalesce(p_only_unread,false)
        or n.read_at is null
      )
  )
  select
    n.id,n.notification_type,n.title,n.message,n.priority,n.status,
    n.patient_id,n.entity_type,n.entity_id,n.created_at,n.read_at,n.resolved_at,
    count(*) over()::bigint
  from authorized_notifications n
  order by
    case lower(coalesce(n.priority,'normal'))
      when 'urgente' then 1
      when 'alta' then 2
      when 'normal' then 3
      when 'baixa' then 4
      else 5
    end,
    n.created_at desc
  limit v_limit offset v_offset;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_technical_support_history_for_interface(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_allowed boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if p_request_id is null then
    raise exception 'Chamado técnico obrigatório.' using errcode='22023';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  v_allowed := public.has_app_role('administrador_tecnico') or public.has_app_role('administrador');
  if not v_allowed then
    raise exception 'Perfil sem autorização para consultar histórico técnico.' using errcode='42501';
  end if;

  if not exists(select 1 from public.technical_support_requests tsr where tsr.id=p_request_id and private.capo_support_ticket_visible_in_context(tsr.id)) then
    raise exception 'Solicitação de suporte não encontrada.' using errcode='22023';
  end if;

  select jsonb_build_object(
    'request_id',p_request_id,
    'events',coalesce(jsonb_agg(jsonb_build_object(
      'audit_id',x.id,
      'occurred_at',x.created_at,
      'action',upper(x.action),
      'actor_account_id',x.actor_account_id,
      'previous_status',x.old_data->>'status',
      'new_status',x.new_data->>'status',
      'previous_assigned_account_id',x.old_data->>'assigned_account_id',
      'new_assigned_account_id',x.new_data->>'assigned_account_id',
      'resolved_by_account_id',x.new_data->>'resolved_by_account_id',
      'requires_user_test',case when x.new_data ? 'requires_user_test' then (x.new_data->>'requires_user_test')::boolean else null end,
      'user_test_approved',case when x.new_data ? 'user_test_approved' then (x.new_data->>'user_test_approved')::boolean else null end,
      'started_at',x.new_data->>'started_at',
      'resolved_at',x.new_data->>'resolved_at',
      'user_tested_at',x.new_data->>'user_tested_at'
    ) order by x.created_at,x.id),'[]'::jsonb)
  ) into v_result
  from (
    select al.*,ua.id actor_account_id
    from public.audit_logs al
    left join public.user_accounts ua on ua.auth_user_id=al.user_id
    where al.entity_name='technical_support_requests'
      and al.record_id=p_request_id::text
  ) x;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_technical_support_requests_detailed_for_interface(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, requester_username text, assigned_username text, category text, affected_module text, subject text, description text, priority text, status text, technical_response text, requires_user_test boolean, user_test_result text, user_test_approved boolean, created_at timestamp with time zone, updated_at timestamp with time zone, started_at timestamp with time zone, resolved_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_status text := nullif(lower(btrim(coalesce(p_status,''))),'');
  v_can_manage boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  v_can_manage :=
    public.has_app_role('administrador_tecnico')
    or public.has_app_role('administrador');

  if v_status is not null
     and v_status not in (
       'pendente','em_atendimento','aguardando_teste','resolvida','cancelada'
     ) then
    raise exception 'Situação de suporte inválida.' using errcode='22023';
  end if;

  return query
  select
    tsr.id,
    requester.username,
    assigned.username,
    tsr.category,
    tsr.affected_module,
    tsr.subject,
    tsr.description,
    tsr.priority,
    tsr.status,
    tsr.technical_response,
    tsr.requires_user_test,
    tsr.user_test_result,
    tsr.user_test_approved,
    tsr.created_at,
    tsr.updated_at,
    tsr.started_at,
    tsr.resolved_at,
    count(*) over()::bigint
  from public.technical_support_requests tsr
  join public.user_accounts requester on requester.id=tsr.requester_account_id
  left join public.user_accounts assigned on assigned.id=tsr.assigned_account_id
  where (v_can_manage or tsr.requester_account_id=v_account_id)
    and private.capo_support_ticket_visible_in_context(tsr.id)
    and (v_status is null or tsr.status=v_status)
  order by
    case tsr.priority
      when 'critica' then 1
      when 'urgente' then 2
      when 'alta' then 3
      when 'normal' then 4
      when 'baixa' then 5
      else 6
    end,
    tsr.created_at desc
  limit least(greatest(coalesce(p_limit,20),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_technical_support_requests_for_interface(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, requester_username text, assigned_username text, category text, subject text, description text, priority text, status text, technical_response text, requires_user_test boolean, user_test_result text, created_at timestamp with time zone, updated_at timestamp with time zone, started_at timestamp with time zone, resolved_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_roles text[];
  v_status text;
  v_limit integer;
  v_offset integer;
  v_can_manage boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;

  select coalesce(array_agg(distinct lower(btrim(ar.code))),array[]::text[])
    into v_roles
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id;

  v_can_manage :=
    'administrador_tecnico'=any(v_roles)
    or 'administrador'=any(v_roles);

  v_status := nullif(lower(btrim(coalesce(p_status,''))),'');
  if v_status is not null
     and v_status not in (
       'pendente','em_atendimento','aguardando_teste','resolvida','cancelada'
     ) then
    raise exception 'Situação de suporte inválida.' using errcode='22023';
  end if;

  v_limit := least(greatest(coalesce(p_limit,20),1),100);
  v_offset := greatest(coalesce(p_offset,0),0);

  return query
  with authorized_requests as (
    select tsr.*
    from public.technical_support_requests tsr
    where (v_can_manage or tsr.requester_account_id=v_account_id)
    and private.capo_support_ticket_visible_in_context(tsr.id)
      and (v_status is null or tsr.status=v_status)
  )
  select
    tsr.id,
    requester.username,
    assigned.username,
    tsr.category,
    tsr.subject,
    tsr.description,
    tsr.priority,
    tsr.status,
    tsr.technical_response,
    tsr.requires_user_test,
    tsr.user_test_result,
    tsr.created_at,
    tsr.updated_at,
    tsr.started_at,
    tsr.resolved_at,
    count(*) over()::bigint
  from authorized_requests tsr
  join public.user_accounts requester on requester.id=tsr.requester_account_id
  left join public.user_accounts assigned on assigned.id=tsr.assigned_account_id
  order by
    case tsr.priority
      when 'critica' then 1
      when 'urgente' then 2
      when 'alta' then 3
      when 'normal' then 4
      when 'baixa' then 5
      else 6
    end,
    tsr.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_technical_support_request_for_interface(p_request_id uuid, p_action text, p_response text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_account_id uuid;
    v_requester_auth_id uuid;
    v_roles text[];
    v_action text;
    v_response text;
    v_request public.technical_support_requests%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Sessão não autenticada.'
            using errcode = '42501';
    end if;



    if not public.has_accepted_current_legal_term() then
        raise exception 'Aceite do termo vigente obrigatório.'
            using errcode = '42501';
    end if;

    select ua.id
      into v_account_id
      from public.user_accounts ua
     where ua.auth_user_id = auth.uid()
       and ua.is_active = true
     limit 1;

    if v_account_id is null then
        raise exception 'Conta inexistente ou inativa.'
            using errcode = '42501';
    end if;

    select coalesce(
        array_agg(distinct lower(trim(ar.code))),
        array[]::text[]
    )
      into v_roles
      from public.user_roles ur
      join public.app_roles ar
        on ar.id = ur.role_id
     where ur.user_account_id = v_account_id;

    if not (
        'administrador_tecnico' = any(v_roles)
        or 'administrador' = any(v_roles)
    ) then
        raise exception 'Perfil não autorizado a processar suporte.'
            using errcode = '42501';
    end if;

    v_action := lower(trim(coalesce(p_action, '')));
    v_response := nullif(trim(p_response), '');

    if v_action not in (
        'iniciar',
        'solicitar_teste',
        'resolver',
        'cancelar'
    ) then
        raise exception 'Ação de suporte inválida.';
    end if;

    if v_response is not null
       and length(v_response) > 2000 then
        raise exception 'A resposta excede 2000 caracteres.';
    end if;

    if v_action in ('solicitar_teste', 'resolver', 'cancelar')
       and (
           v_response is null
           or length(v_response) < 3
       ) then
        raise exception
            'A resposta ou justificativa deve possuir entre 3 e 2000 caracteres.';
    end if;

    select tsr.*
      into v_request
      from public.technical_support_requests tsr
     where tsr.id = p_request_id
       and private.capo_support_ticket_visible_in_context(tsr.id)
     for update;

    if not found then
        raise exception 'Solicitação de suporte não encontrada.';
    end if;

    select ua.auth_user_id
      into v_requester_auth_id
      from public.user_accounts ua
     where ua.id = v_request.requester_account_id;

    if v_action = 'iniciar' then
        if v_request.status <> 'pendente' then
            raise exception
                'Somente uma solicitação pendente pode ser iniciada.';
        end if;

        update public.technical_support_requests
           set status = 'em_atendimento',
               assigned_account_id = v_account_id,
               started_at = coalesce(started_at, now()),
               updated_at = now()
         where id = p_request_id;

    elsif v_action = 'solicitar_teste' then
        if v_request.status <> 'em_atendimento' then
            raise exception
                'O teste somente pode ser solicitado durante o atendimento.';
        end if;

        update public.technical_support_requests
           set status = 'aguardando_teste',
               assigned_account_id =
                   coalesce(assigned_account_id, v_account_id),
               technical_response = v_response,
               requires_user_test = true,
               updated_at = now()
         where id = p_request_id;

    elsif v_action = 'resolver' then
        if v_request.status not in (
            'em_atendimento',
            'aguardando_teste'
        ) then
            raise exception
                'A solicitação precisa estar em atendimento ou aguardando teste.';
        end if;

        update public.technical_support_requests
           set status = 'resolvida',
               assigned_account_id =
                   coalesce(assigned_account_id, v_account_id),
               technical_response = v_response,
               requires_user_test = false,
               resolved_at = now(),
               resolved_by_account_id = v_account_id,
               updated_at = now()
         where id = p_request_id;

    elsif v_action = 'cancelar' then
        if v_request.status not in (
            'pendente',
            'em_atendimento',
            'aguardando_teste'
        ) then
            raise exception
                'Esta solicitação não pode mais ser cancelada.';
        end if;

        update public.technical_support_requests
           set status = 'cancelada',
               assigned_account_id =
                   coalesce(assigned_account_id, v_account_id),
               technical_response = v_response,
               requires_user_test = false,
               resolved_at = now(),
               resolved_by_account_id = v_account_id,
               updated_at = now()
         where id = p_request_id;
    end if;

    perform public.capo_criar_notificacao(
        'usuario',
        v_requester_auth_id,
        case v_action
            when 'iniciar' then 'technical_support_started'
            when 'solicitar_teste' then 'technical_support_test_requested'
            when 'resolver' then 'technical_support_resolved'
            else 'technical_support_cancelled'
        end,
        case v_action
            when 'iniciar' then 'Suporte técnico iniciado'
            when 'solicitar_teste' then 'Teste solicitado pelo suporte'
            when 'resolver' then 'Solicitação de suporte resolvida'
            else 'Solicitação de suporte cancelada'
        end,
        case v_action
            when 'iniciar'
                then 'Sua solicitação de suporte está em atendimento.'
            when 'solicitar_teste'
                then 'O suporte solicitou que você realize um teste operacional.'
            when 'resolver'
                then 'Sua solicitação de suporte foi marcada como resolvida.'
            else
                'Sua solicitação de suporte foi cancelada.'
        end,
        'technical_support_requests',
        p_request_id,
        'normal'
    );

    return jsonb_build_object(
        'request_id', p_request_id,
        'action', v_action,
        'processed', true
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_technical_support_test_for_interface(p_request_id uuid, p_approved boolean, p_test_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_account_id uuid;
    v_test_result text;
    v_request public.technical_support_requests%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Sessão não autenticada.'
            using errcode = '42501';
    end if;



    if not public.has_accepted_current_legal_term() then
        raise exception 'Aceite do termo vigente obrigatório.'
            using errcode = '42501';
    end if;

    select ua.id
      into v_account_id
      from public.user_accounts ua
     where ua.auth_user_id = auth.uid()
       and ua.is_active = true
     limit 1;

    if v_account_id is null then
        raise exception 'Conta inexistente ou inativa.'
            using errcode = '42501';
    end if;

    if p_approved is null then
        raise exception 'Informe se o teste foi aprovado.';
    end if;

    v_test_result := trim(coalesce(p_test_result, ''));

    if length(v_test_result) not between 2 and 1000 then
        raise exception
            'O resultado do teste deve possuir entre 2 e 1000 caracteres.';
    end if;

    select tsr.*
      into v_request
      from public.technical_support_requests tsr
     where tsr.id = p_request_id
       and tsr.requester_account_id = v_account_id
       and private.capo_support_ticket_visible_in_context(tsr.id)
     for update;

    if not found then
        raise exception
            'Solicitação inexistente ou não pertencente ao usuário.'
            using errcode = '42501';
    end if;

    if v_request.status <> 'aguardando_teste'
       or not v_request.requires_user_test then
        raise exception
            'Esta solicitação não está aguardando teste do usuário.';
    end if;

    update public.technical_support_requests
       set status = 'em_atendimento',
           user_test_result = v_test_result,
           user_test_approved = p_approved,
           user_tested_at = now(),
           requires_user_test = false,
           updated_at = now()
     where id = p_request_id;

    perform public.capo_criar_notificacao(
        'administrador_tecnico',
        null,
        case
            when p_approved
                then 'technical_support_test_approved'
            else 'technical_support_test_failed'
        end,
        case
            when p_approved
                then 'Teste operacional aprovado'
            else 'Teste operacional não aprovado'
        end,
        'O solicitante enviou o resultado do teste de uma solicitação de suporte.',
        'technical_support_requests',
        p_request_id,
        case
            when p_approved then 'normal'
            else 'alta'
        end
    );

    perform public.capo_criar_notificacao(
        'administrador',
        null,
        case
            when p_approved
                then 'technical_support_test_approved'
            else 'technical_support_test_failed'
        end,
        case
            when p_approved
                then 'Teste operacional aprovado'
            else 'Teste operacional não aprovado'
        end,
        'O solicitante enviou o resultado do teste de uma solicitação de suporte.',
        'technical_support_requests',
        p_request_id,
        case
            when p_approved then 'normal'
            else 'alta'
        end
    );

    return jsonb_build_object(
        'request_id', p_request_id,
        'test_approved', p_approved,
        'status', 'em_atendimento',
        'submitted', true
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_notification_for_interface(p_notification_id uuid, p_action text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_account_id uuid;
    v_roles text[];
    v_action text;
    v_notes text;
    v_notification public.notifications%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Sessão não autenticada.'
            using errcode = '42501';
    end if;



    if not public.has_accepted_current_legal_term() then
        raise exception 'Aceite do termo vigente obrigatório.'
            using errcode = '42501';
    end if;

    select ua.id
      into v_account_id
      from public.user_accounts ua
     where ua.auth_user_id = auth.uid()
       and ua.is_active = true
     limit 1;

    if v_account_id is null then
        raise exception 'Conta inexistente ou inativa.'
            using errcode = '42501';
    end if;

    select coalesce(
        array_agg(distinct lower(trim(ar.code))),
        array[]::text[]
    )
      into v_roles
      from public.user_roles ur
      join public.app_roles ar
        on ar.id = ur.role_id
     where ur.user_account_id = v_account_id;

    v_action := lower(trim(coalesce(p_action, '')));
    v_notes := nullif(trim(p_notes), '');

    if v_action not in ('lida', 'resolvida') then
        raise exception 'Ação inválida. Utilize lida ou resolvida.';
    end if;

    if v_notes is not null and length(v_notes) > 500 then
        raise exception 'A observação excede 500 caracteres.';
    end if;

    select n.*
      into v_notification
      from public.notifications n
     where n.id = p_notification_id
       and (n.entity_type is distinct from 'technical_support_requests'
            or private.capo_support_ticket_visible_in_context(n.entity_id))
       and (
           n.user_id = auth.uid()

           or lower(trim(n.target_role)) = any(v_roles)

           or (
               lower(trim(n.target_role)) = 'profissional'
               and exists (
                   select 1
                     from unnest(v_roles) as role_code
                    where role_code not in (
                        'administrador',
                        'administrativo_operacional',
                        'coordenador',
                        'administrador_tecnico'
                    )
               )
           )

           or 'administrador' = any(v_roles)
       )
     for update;

    if not found then
        raise exception 'Notificação inexistente ou não autorizada.'
            using errcode = '42501';
    end if;

    update public.notifications n
       set read_at = coalesce(n.read_at, now()),
           resolved_at = case
               when v_action = 'resolvida'
                   then coalesce(n.resolved_at, now())
               else n.resolved_at
           end,
           resolved_by = case
               when v_action = 'resolvida'
                   then coalesce(n.resolved_by, auth.uid())
               else n.resolved_by
           end,
           notes = case
               when v_notes is not null then v_notes
               else n.notes
           end
     where n.id = p_notification_id
     returning n.*
      into v_notification;

    return jsonb_build_object(
        'notification_id', v_notification.id,
        'action', v_action,
        'read_at', v_notification.read_at,
        'resolved_at', v_notification.resolved_at,
        'resolved_by', v_notification.resolved_by
    );
end;
$function$;
