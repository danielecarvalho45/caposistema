-- CAPO: atender administrativamente resposta negativa pelo link do familiar
-- sem retornar à fila de avaliação nem alterar o histórico cancelado.
CREATE OR REPLACE FUNCTION public.get_family_link_rebooking_context_for_interface(
 p_appointment_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $fn$
DECLARE v_old public.family_psychology_appointments%rowtype; v_payload jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false)
  OR NOT (public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional')) THEN
  RAISE EXCEPTION 'Sem autorização para consultar solicitação familiar.' USING errcode='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_accounts WHERE auth_user_id=auth.uid() AND is_active=true) THEN
  RAISE EXCEPTION 'Conta inativa.' USING errcode='42501';
 END IF;
 SELECT * INTO v_old FROM public.family_psychology_appointments WHERE id=p_appointment_id;
 IF v_old.id IS NULL OR v_old.attendance_status<>'cancelado'
    OR NOT EXISTS (
      SELECT 1 FROM public.family_psychology_confirmation_links l
      WHERE l.appointment_id=v_old.id AND l.decision='nao_comparecera'
    ) THEN
   RAISE EXCEPTION 'Solicitação de remarcação pelo link não localizada.' USING errcode='22023';
 END IF;
 PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);
 SELECT jsonb_build_object(
   'appointment_id',v_old.id,'professional_id',v_old.professional_id,
   'professional_name',pr.full_name,'family_name',fm.full_name,
   'family_phone',fm.phone,'previous_start',v_old.appointment_date,
   'appointment_kind',v_old.appointment_kind
 ) INTO v_payload
 FROM public.professionals pr JOIN public.family_members fm ON fm.id=v_old.family_member_id
 WHERE pr.id=v_old.professional_id;
 RETURN v_payload;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_family_link_rebooking_context_for_interface(uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_family_link_rebooking_context_for_interface(uuid)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.rebook_family_link_cancellation_for_interface(
 p_appointment_id uuid,p_new_slot_start timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $fn$
DECLARE
 v_old public.family_psychology_appointments%rowtype;
 v_account uuid;
 v_new_id uuid;
 v_slot_end timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false)
  OR NOT (public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional')) THEN
   RAISE EXCEPTION 'Remarcação por link é atribuição administrativa.' USING errcode='42501';
 END IF;
 SELECT id INTO v_account FROM public.user_accounts
 WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
 IF v_account IS NULL THEN RAISE EXCEPTION 'Conta inativa.' USING errcode='42501'; END IF;
 SELECT * INTO v_old FROM public.family_psychology_appointments
 WHERE id=p_appointment_id FOR UPDATE;
 IF v_old.id IS NULL OR v_old.attendance_status<>'cancelado'
    OR NOT EXISTS (
      SELECT 1 FROM public.family_psychology_confirmation_links l
      WHERE l.appointment_id=v_old.id AND l.decision='nao_comparecera'
    ) THEN
   RAISE EXCEPTION 'Consulta familiar cancelada pelo link não localizada.' USING errcode='22023';
 END IF;
 IF p_new_slot_start IS NULL OR p_new_slot_start<=clock_timestamp() THEN
   RAISE EXCEPTION 'Selecione horário futuro válido.' USING errcode='22023';
 END IF;
 PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);
 IF EXISTS (
  SELECT 1 FROM public.family_psychology_appointments fa
  WHERE fa.rescheduled_from_id=v_old.id AND fa.attendance_status NOT IN ('cancelado','remarcado')
 ) THEN
   RAISE EXCEPTION 'Esta solicitação já possui agendamento ativo.' USING errcode='22023';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.professionals pr
   JOIN public.professional_specialties ps ON ps.professional_id=pr.id
   JOIN public.specialties s ON s.id=ps.specialty_id
   WHERE pr.id=v_old.professional_id AND pr.status='ativo' AND pr.is_professional=true
     AND s.is_active=true AND lower(btrim(s.name))='psicologia'
 ) OR public.capo_family_psychology_ineligible_professional(v_old.family_link_id)
   IS NOT DISTINCT FROM v_old.professional_id THEN
   RAISE EXCEPTION 'Psicólogo não está elegível para o familiar.' USING errcode='42501';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_old.professional_id::text,0));
 SELECT slot_end INTO v_slot_end FROM public.get_available_appointment_slots(
   v_old.professional_id,(p_new_slot_start AT TIME ZONE 'America/Sao_Paulo')::date
 ) WHERE slot_start=p_new_slot_start LIMIT 1;
 IF v_slot_end IS NULL THEN RAISE EXCEPTION 'Vaga indisponível.' USING errcode='22023'; END IF;
 INSERT INTO public.family_psychology_appointments (
  waiting_list_id,family_link_id,family_member_id,source_patient_id,
  professional_id,specialty_id,appointment_date,appointment_end,attendance_status,
  general_notes,created_by,rescheduled_from_id,reschedule_reason
 ) VALUES (
  v_old.waiting_list_id,v_old.family_link_id,v_old.family_member_id,v_old.source_patient_id,
  v_old.professional_id,v_old.specialty_id,p_new_slot_start,v_slot_end,'agendado',
  v_old.general_notes,v_account,v_old.id,'Solicitação pelo link de confirmação'
 ) RETURNING id INTO v_new_id;
 UPDATE public.family_psychology_waiting_list
 SET scheduled_appointment_id=v_new_id,updated_at=clock_timestamp()
 WHERE id=v_old.waiting_list_id AND scheduled_appointment_id=v_old.id;
 UPDATE public.notifications
 SET status='resolvida',resolved_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp())
 WHERE entity_type='family_psychology_appointments' AND entity_id=v_old.id
 AND notification_type='appointment_patient_reschedule' AND resolved_at IS NULL;
 RETURN jsonb_build_object('success',true,'appointment_id',v_new_id,
   'professional_id',v_old.professional_id,'new_slot_start',p_new_slot_start);
END;
$fn$;
REVOKE ALL ON FUNCTION public.rebook_family_link_cancellation_for_interface(uuid,timestamptz)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebook_family_link_cancellation_for_interface(uuid,timestamptz)
 TO authenticated;
