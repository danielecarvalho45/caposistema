-- Filtros de categoria sobre os mesmos controles autenticados existentes.
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

REVOKE ALL ON FUNCTION public.get_my_notifications_by_category_for_interface(text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_notifications_by_category_for_interface(text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.capo_close_unanswered_on_manual_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
BEGIN
  IF NEW.result='confirmou' THEN
    UPDATE public.notifications n
       SET status='resolvida',resolved_at=COALESCE(n.resolved_at,clock_timestamp()),
           read_at=COALESCE(n.read_at,clock_timestamp())
     WHERE n.notification_type='appointment_confirmation_unanswered'
       AND n.entity_id=NEW.appointment_id
       AND n.entity_type=CASE WHEN TG_TABLE_NAME='appointment_previsit_contacts'
         THEN 'patient_appointments' ELSE 'family_psychology_appointments' END
       AND n.resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.capo_close_unanswered_on_manual_confirmation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_manual_confirmation_closes_unanswered ON public.appointment_previsit_contacts;
CREATE TRIGGER trg_capo_manual_confirmation_closes_unanswered AFTER INSERT ON public.appointment_previsit_contacts
FOR EACH ROW EXECUTE FUNCTION public.capo_close_unanswered_on_manual_confirmation();
DROP TRIGGER IF EXISTS trg_capo_family_manual_confirmation_closes_unanswered ON public.family_psychology_previsit_contacts;
CREATE TRIGGER trg_capo_family_manual_confirmation_closes_unanswered AFTER INSERT ON public.family_psychology_previsit_contacts
FOR EACH ROW EXECUTE FUNCTION public.capo_close_unanswered_on_manual_confirmation();

CREATE OR REPLACE FUNCTION public.capo_notify_unanswered_confirmation_links()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_row record;
  v_count integer:=0;
begin
  for v_row in
    select l.id,l.appointment_id,a.patient_id,pt.full_name
    from public.appointment_confirmation_links l
    join public.patient_appointments a on a.id=l.appointment_id
    join public.patients pt on pt.id=a.patient_id
    where l.decision is null and l.revoked_at is null and l.no_response_alert_at is null
      AND NOT EXISTS (SELECT 1 FROM public.appointment_previsit_contacts mc
        WHERE mc.appointment_id=a.id AND mc.result='confirmou')
      and l.issued_at<=clock_timestamp()-interval '1 hour'
      and a.attendance_status='agendado'
      and a.appointment_date>clock_timestamp()
      and a.appointment_date<=clock_timestamp()+interval '24 hours'
      and not exists (select 1 from public.notifications n
         where n.notification_type='appointment_confirmation_unanswered'
           and n.entity_type='patient_appointments' and n.entity_id=a.id)
    for update of l skip locked
  loop
    insert into public.notifications(notification_type,title,message,target_role,priority,status,patient_id,entity_type,entity_id)
    values ('appointment_confirmation_unanswered','Consulta aguardando confirmação',
      format('%s ainda não respondeu ao lembrete. Contate o paciente; o agendamento segue reservado.',v_row.full_name),
      'administrativo_operacional','normal','pendente',v_row.patient_id,'patient_appointments',v_row.appointment_id);
    update public.appointment_confirmation_links set no_response_alert_at=clock_timestamp() where id=v_row.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$function$

CREATE OR REPLACE FUNCTION public.capo_notify_unanswered_family_confirmation_links()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_row record; v_count integer:=0;
BEGIN
 FOR v_row IN
  SELECT l.id,l.appointment_id,a.source_patient_id,fm.full_name
  FROM public.family_psychology_confirmation_links l
  JOIN public.family_psychology_appointments a ON a.id=l.appointment_id
  JOIN public.family_members fm ON fm.id=a.family_member_id
  WHERE l.decision IS NULL AND l.revoked_at IS NULL
    AND l.no_response_alert_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.family_psychology_previsit_contacts mc
        WHERE mc.appointment_id=a.id AND mc.result='confirmou')
      AND l.issued_at<=clock_timestamp()-interval '1 hour'
    AND a.attendance_status='agendado'
    AND a.appointment_date>clock_timestamp()
    AND a.appointment_date<=clock_timestamp()+interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.notification_type='appointment_confirmation_unanswered'
      AND n.entity_type='family_psychology_appointments' AND n.entity_id=a.id
    )
  FOR UPDATE OF l SKIP LOCKED
 LOOP
  INSERT INTO public.notifications(
   notification_type,title,message,target_role,priority,status,
   patient_id,entity_type,entity_id
  ) VALUES (
   'appointment_confirmation_unanswered','Familiar aguardando confirmação',
   format('%s ainda não respondeu ao lembrete. Contate o Familiar/Cuidador; o horário permanece reservado.',v_row.full_name),
   'administrativo_operacional','normal','pendente',
   v_row.source_patient_id,'family_psychology_appointments',v_row.appointment_id
  );
  UPDATE public.family_psychology_confirmation_links
  SET no_response_alert_at=clock_timestamp() WHERE id=v_row.id;
  v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END;
$function$
