-- CAPO §28.241: somente notificações não resolvidas na fila ativa.
-- Preserva autorização, contagem, paginação, ordem e auditoria existentes.
-- Nenhuma linha de notifications é atualizada ou excluída.
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
    where (
      (
        n.effective_patient_id is not null
        and public.capo_patient_visible_in_current_context(n.effective_patient_id)
      )
      or (
        n.effective_patient_id is null
        and (
          not v_is_homologation
          or n.user_id=auth.uid()
          or lower(trim(coalesce(n.target_role,'')))='administrador_tecnico'
        )
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

