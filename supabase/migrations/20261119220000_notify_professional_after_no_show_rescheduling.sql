-- CAPO: resultado do agendamento do faltoso notifica o profissional de destino.
-- Mantém o encerramento existente do acompanhamento e a trilha no prontuário.
CREATE OR REPLACE FUNCTION public.close_no_show_followup_after_reschedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_patient_id uuid;
  v_followup_id uuid;
  v_professional_auth_id uuid;
  v_professional_name text;
  v_patient_name text;
begin
  if new.rescheduled_from_id is null
     or new.reschedule_origin is distinct from 'faltoso' then
    return new;
  end if;

  v_account_id := public.current_user_account_id();

  update public.patient_no_show_followups ns
     set rescheduled_appointment_id = new.id,
         active_search_status = 'encerrado',
         closed_at = coalesce(ns.closed_at, now()),
         closed_by = coalesce(ns.closed_by, v_account_id),
         updated_at = now()
   where ns.appointment_id = new.rescheduled_from_id
     and ns.active_search_status <> 'encerrado'
  returning ns.id, ns.patient_id into v_followup_id, v_patient_id;

  if v_followup_id is not null then
    insert into public.patient_timeline (
      patient_id, event_date, event_type, title, description, created_by
    )
    values (
      v_patient_id,
      now(),
      'faltoso_remarcado',
      'Acompanhamento de faltoso encerrado',
      'A remarcação foi efetivada e vinculada ao acompanhamento administrativo.',
      v_account_id
    );

    -- Notificação individual somente após o agendamento ter sido gravado
    -- e a ocorrência real de Faltosos ter sido encerrada nesta transação.
    select ua.auth_user_id into v_professional_auth_id
    from public.user_accounts ua
    where ua.professional_id = new.professional_id and ua.is_active=true
    order by ua.created_at desc limit 1;

    if v_professional_auth_id is not null and not exists (
      select 1 from public.notifications n
      where n.notification_type='no_show_rescheduled'
        and n.entity_type='patient_appointments'
        and n.entity_id=new.id
        and n.user_id=v_professional_auth_id
    ) then
      select pt.full_name into v_patient_name
      from public.patients pt where pt.id=new.patient_id;
      perform public.capo_criar_notificacao(
        null, v_professional_auth_id, 'no_show_rescheduled',
        'Consulta de faltoso remarcada',
        'A consulta de ' || coalesce(v_patient_name, 'paciente CAPO') ||
        ' foi remarcada para ' || to_char(new.appointment_date at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') ||
        '. Confira sua agenda.',
        'patient_appointments',new.id,'normal'
      );
    end if;
  end if;

  return new;
end;
$function$
;