-- CAPO 19/11/2026 — vínculo idempotente de agendamentos originados de encaminhamento
-- Mantém consulta existente e proíbe conclusão baseada apenas na aprovação.
CREATE OR REPLACE FUNCTION public.capo_complete_referral_on_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
DECLARE
 v_referral public.referrals%rowtype;
 v_count integer;
 v_requester_user uuid;
 v_actor_account uuid;
BEGIN
 IF NEW.attendance_status NOT IN ('agendado','confirmado')
    OR NEW.care_cycle_id IS NULL
    OR NEW.specialty_id IS NULL
    OR lower(coalesce(NEW.operational_origin,'')) NOT LIKE '%encaminhamento%' THEN
   RETURN NEW;
 END IF;
 SELECT count(*), (array_agg(r.id))[1] INTO v_count,v_referral.id
 FROM public.referrals r
 WHERE r.patient_id=NEW.patient_id
   AND r.target_professional_id=NEW.professional_id
   AND r.care_cycle_id=NEW.care_cycle_id
   AND r.requested_specialty_id=NEW.specialty_id
   AND r.destination='administrativo'
   AND r.status IN ('approved','in_progress')
   AND r.scheduled_appointment_id IS NULL
   AND r.approved_at <= NEW.created_at;
 IF v_count <> 1 THEN RETURN NEW; END IF;

 SELECT * INTO v_referral FROM public.referrals WHERE id=v_referral.id FOR UPDATE;
 IF v_referral.status NOT IN ('approved','in_progress')
    OR v_referral.scheduled_appointment_id IS NOT NULL THEN
   RETURN NEW;
 END IF;

 UPDATE public.referrals SET scheduled_appointment_id=NEW.id,status='completed',
   completed_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE id=v_referral.id;
 SELECT ua.id INTO v_actor_account FROM public.user_accounts ua
 WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true LIMIT 1;
 INSERT INTO public.referral_events(referral_id,event_type,from_status,to_status,detail,actor_user_account_id,actor_role,created_at)
 VALUES(v_referral.id,'completed',v_referral.status,'completed',
 'Agendamento confirmado na Agenda CAPO: '||NEW.id::text,
 v_actor_account,'sistema',clock_timestamp());

 SELECT ua.auth_user_id INTO v_requester_user FROM public.user_accounts ua
 WHERE ua.professional_id=v_referral.requesting_professional_id AND ua.is_active=true
 ORDER BY ua.created_at DESC LIMIT 1;
 IF v_requester_user IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.notifications n WHERE n.entity_type='referrals'
     AND n.entity_id=v_referral.id AND n.notification_type='referral_scheduled'
     AND n.user_id=v_requester_user
 ) THEN
   PERFORM public.capo_criar_notificacao(null,v_requester_user,'referral_scheduled',
      'Agendamento do encaminhamento realizado',
      'O paciente encaminhado foi agendado. Consulte o histórico no CAPO.',
      'referrals',v_referral.id,'normal');
 END IF;
 RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_capo_complete_referral_on_appointment_insert ON public.patient_appointments;
CREATE TRIGGER trg_capo_complete_referral_on_appointment_insert
AFTER INSERT ON public.patient_appointments
FOR EACH ROW EXECUTE FUNCTION public.capo_complete_referral_on_appointment_insert();

-- Regularização restrita ao encaminhamento e à consulta reais já auditados.
-- Não cria nova consulta; valida paciente, profissional, especialidade e ciclo.
DO $backfill$
DECLARE
 v_referral public.referrals%rowtype;
 v_appointment public.patient_appointments%rowtype;
 v_requester_user uuid;
BEGIN
 SELECT * INTO v_referral FROM public.referrals
 WHERE id='313de7f1-e4c6-4f51-8122-9115c5fc7433'::uuid FOR UPDATE;
 SELECT * INTO v_appointment FROM public.patient_appointments
 WHERE id='4360b6c3-3fb7-4e4c-b38f-1b7056f2c08f'::uuid;
 IF v_referral.id IS NULL OR v_appointment.id IS NULL THEN
  RAISE EXCEPTION 'Registro real do encaminhamento ou consulta ausente. Nenhum vínculo alterado.';
 END IF;
 IF v_referral.scheduled_appointment_id=v_appointment.id AND v_referral.status='completed' THEN
  RETURN;
 END IF;
 IF v_referral.scheduled_appointment_id IS NOT NULL
    OR v_referral.status NOT IN ('approved','in_progress')
    OR v_referral.patient_id<>v_appointment.patient_id
    OR v_referral.target_professional_id<>v_appointment.professional_id
    OR v_referral.requested_specialty_id<>v_appointment.specialty_id
    OR v_referral.care_cycle_id IS DISTINCT FROM v_appointment.care_cycle_id
    OR v_appointment.attendance_status NOT IN ('agendado','confirmado')
    OR v_referral.approved_at>v_appointment.created_at
    OR lower(coalesce(v_appointment.operational_origin,'')) NOT LIKE '%encaminhamento%'
 THEN RAISE EXCEPTION 'Vínculo de encaminhamento não validado. Nenhum dado alterado.'; END IF;

 UPDATE public.referrals
 SET status='completed',scheduled_appointment_id=v_appointment.id,
     completed_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE id=v_referral.id;
 INSERT INTO public.referral_events(referral_id,event_type,from_status,to_status,detail,actor_user_account_id,actor_role,created_at)
 VALUES(v_referral.id,'completed',v_referral.status,'completed',
 'Regularização de agendamento existente: '||v_appointment.id::text,
 NULL,'sistema',clock_timestamp());

 SELECT ua.auth_user_id INTO v_requester_user FROM public.user_accounts ua
 WHERE ua.professional_id=v_referral.requesting_professional_id AND ua.is_active=true
 ORDER BY ua.created_at DESC LIMIT 1;
 IF v_requester_user IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.notifications n WHERE n.entity_type='referrals'
     AND n.entity_id=v_referral.id AND n.notification_type='referral_scheduled'
     AND n.user_id=v_requester_user
 ) THEN
   PERFORM public.capo_criar_notificacao(null,v_requester_user,'referral_scheduled',
      'Agendamento do encaminhamento realizado',
      'O paciente encaminhado foi agendado. Consulte o histórico no CAPO.',
      'referrals',v_referral.id,'normal');
 END IF;
END;
$backfill$;
