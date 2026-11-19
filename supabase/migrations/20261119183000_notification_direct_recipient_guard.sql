-- CAPO: VERDE Titular 19/11/2026 - corrigir exclusividade de notificacao pessoal sem retirar visibilidade institucional.
-- Corrige tres RPCs de leitura do sininho e RPC de leitura/resolucao. Sem updates dos dados de notificacoes.
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
      -- Avisos individuais pertencem exclusivamente ao destinatário, mesmo quando o leitor é Gestor/Titular.
      and (n.user_id is null or n.user_id=auth.uid())
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
$function$
;

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
      -- Avisos individuais pertencem exclusivamente ao destinatário, mesmo quando o leitor é Gestor/Titular.
      and (n.user_id is null or n.user_id=auth.uid())
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
$function$
;

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
      -- Avisos individuais pertencem exclusivamente ao destinatário, mesmo quando o leitor é Gestor/Titular.
      and (n.user_id is null or n.user_id=auth.uid())
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
$function$
;

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
       -- Não permitir que o privilégio institucional altere a leitura de aviso individual alheio.
       and (n.user_id is null or n.user_id=auth.uid())
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
$function$
;
