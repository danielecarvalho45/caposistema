-- CAPO: Retorno de familiar/cuidador usa a mesma agenda oficial da Psicologia.
-- Não usa remarcação como retorno e não altera consultas anteriores.
ALTER TABLE public.family_psychology_appointments
  ADD COLUMN IF NOT EXISTS appointment_kind text NOT NULL DEFAULT 'primeira'
  CHECK (appointment_kind IN ('primeira','retorno'));
ALTER TABLE public.family_psychology_appointments
  ADD COLUMN IF NOT EXISTS return_from_id uuid
  REFERENCES public.family_psychology_appointments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS family_psychology_return_source_unique
  ON public.family_psychology_appointments(return_from_id)
  WHERE return_from_id IS NOT NULL AND attendance_status NOT IN ('cancelado','remarcado');

CREATE OR REPLACE FUNCTION public.capo_preserve_family_appointment_kind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $fn$
BEGIN
 IF NEW.rescheduled_from_id IS NOT NULL AND NEW.appointment_kind='primeira' THEN
   SELECT previous.appointment_kind,previous.return_from_id
     INTO NEW.appointment_kind,NEW.return_from_id
   FROM public.family_psychology_appointments previous
   WHERE previous.id=NEW.rescheduled_from_id;
 END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.capo_preserve_family_appointment_kind() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_preserve_family_appointment_kind
  ON public.family_psychology_appointments;
CREATE TRIGGER trg_capo_preserve_family_appointment_kind
BEFORE INSERT ON public.family_psychology_appointments
FOR EACH ROW EXECUTE FUNCTION public.capo_preserve_family_appointment_kind();

CREATE OR REPLACE FUNCTION public.create_family_psychology_return_for_interface(
 p_previous_appointment_id uuid,p_slot_start timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $fn$
DECLARE
 v_old public.family_psychology_appointments%rowtype;
 v_new_id uuid;
 v_slot_end timestamptz;
 v_account uuid;
 v_professional uuid;
 v_is_admin boolean;
 v_ineligible uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false) THEN
   RAISE EXCEPTION 'Sessão ou termo vigente inválido.' USING errcode='42501';
 END IF;
 v_is_admin:=public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional');
 IF NOT v_is_admin AND NOT public.has_app_role('profissional') THEN
   RAISE EXCEPTION 'Perfil sem autorização para retorno.' USING errcode='42501';
 END IF;
 SELECT id INTO v_account FROM public.user_accounts
 WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
 IF v_account IS NULL THEN RAISE EXCEPTION 'Conta inativa.' USING errcode='42501'; END IF;
 SELECT * INTO v_old FROM public.family_psychology_appointments
 WHERE id=p_previous_appointment_id FOR UPDATE;
 IF v_old.id IS NULL OR v_old.attendance_status NOT IN ('confirmado','realizado') THEN
   RAISE EXCEPTION 'O retorno exige atendimento familiar confirmado ou realizado.' USING errcode='22023';
 END IF;
 IF p_slot_start IS NULL OR p_slot_start<=clock_timestamp()
   OR p_slot_start<=v_old.appointment_date THEN
   RAISE EXCEPTION 'Informe horário futuro posterior ao atendimento anterior.' USING errcode='22023';
 END IF;
 v_professional:=v_old.professional_id;
 IF NOT v_is_admin AND public.capo_effective_professional_id() IS DISTINCT FROM v_professional THEN
   RAISE EXCEPTION 'Profissional só pode marcar o próprio retorno.' USING errcode='42501';
 END IF;
 PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);
 IF NOT EXISTS (
  SELECT 1 FROM public.professionals pr
  JOIN public.professional_specialties ps ON ps.professional_id=pr.id
  JOIN public.specialties s ON s.id=ps.specialty_id
  WHERE pr.id=v_professional AND pr.status='ativo' AND pr.is_professional=true
    AND s.is_active=true AND lower(btrim(s.name))='psicologia'
 ) THEN RAISE EXCEPTION 'Psicólogo inativo ou incompatível.' USING errcode='22023'; END IF;
 v_ineligible:=public.capo_family_psychology_ineligible_professional(v_old.family_link_id);
 IF v_professional=v_ineligible THEN
   RAISE EXCEPTION 'O psicólogo do paciente vinculado não pode atender este familiar.' USING errcode='42501';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_professional::text,0));
 SELECT slot_end INTO v_slot_end FROM public.get_available_appointment_slots(
   v_professional,(p_slot_start AT TIME ZONE 'America/Sao_Paulo')::date
 ) WHERE slot_start=p_slot_start LIMIT 1;
 IF v_slot_end IS NULL THEN RAISE EXCEPTION 'Vaga indisponível.' USING errcode='22023'; END IF;
 INSERT INTO public.family_psychology_appointments(
   waiting_list_id,family_link_id,family_member_id,source_patient_id,
   professional_id,specialty_id,appointment_date,appointment_end,
   attendance_status,created_by,appointment_kind,return_from_id
 ) VALUES (
   v_old.waiting_list_id,v_old.family_link_id,v_old.family_member_id,v_old.source_patient_id,
   v_professional,v_old.specialty_id,p_slot_start,v_slot_end,
   'agendado',v_account,'retorno',v_old.id
 ) RETURNING id INTO v_new_id;
 RETURN jsonb_build_object('success',true,'appointment_id',v_new_id,
   'professional_id',v_professional,'appointment_date',p_slot_start,
   'family_member_id',v_old.family_member_id,'appointment_kind','retorno');
END;
$fn$;
REVOKE ALL ON FUNCTION public.create_family_psychology_return_for_interface(uuid,timestamptz)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_family_psychology_return_for_interface(uuid,timestamptz)
 TO authenticated;
