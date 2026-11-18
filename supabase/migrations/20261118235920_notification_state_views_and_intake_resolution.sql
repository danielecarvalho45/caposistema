-- CAPO: consulta de histórico por estado, mantendo a RPC do sino intocada.
-- Equivalência funcional Gestor/Titular e Administrativo Operacional; isolamento e autorização herdados da RPC canônica.
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

REVOKE ALL ON FUNCTION public.get_my_notifications_by_state_for_interface(text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_notifications_by_state_for_interface(text,integer,integer) TO authenticated;

-- Resolve somente os avisos de entrada da solicitação administrativa quando ela deixa de estar pendente.
-- Nunca encerra a entidade originária ao ler notificação; preserva histórico, e não mexe em feedback ao solicitante.
CREATE OR REPLACE FUNCTION public.capo_resolve_intake_notification_on_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    UPDATE public.notifications n
       SET resolved_at=COALESCE(n.resolved_at,clock_timestamp()),
           resolved_by=COALESCE(n.resolved_by,auth.uid())
     WHERE n.entity_type IN ('administrative_request','administrative_requests')
       AND n.entity_id=NEW.id
       AND n.notification_type IN ('administrative_request_new','administrative_request_resubmitted')
       AND n.target_role='administrativo_operacional'
       AND n.resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.capo_resolve_intake_notification_on_request_status() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_resolve_intake_notification_on_request_status ON public.administrative_requests;
CREATE TRIGGER trg_capo_resolve_intake_notification_on_request_status
AFTER UPDATE OF status ON public.administrative_requests
FOR EACH ROW EXECUTE FUNCTION public.capo_resolve_intake_notification_on_request_status();
