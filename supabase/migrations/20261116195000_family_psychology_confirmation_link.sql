-- CAPO: token de confirmação para consultas de Familiar/Cuidador.
-- Mantém intactas as RPCs e a tabela de links das consultas comuns.
CREATE TABLE IF NOT EXISTS public.family_psychology_confirmation_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL REFERENCES public.family_psychology_appointments(id) ON DELETE RESTRICT,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 decision text CHECK (decision IN ('comparecera','nao_comparecera')),
 responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS family_psychology_confirmation_links_appt_idx
 ON public.family_psychology_confirmation_links(appointment_id);
ALTER TABLE public.family_psychology_confirmation_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_psychology_confirmation_links FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.issue_family_psychology_confirmation_link_for_interface(
 p_appointment_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','extensions','pg_temp'
AS $fn$
DECLARE
 v_appointment public.family_psychology_appointments%rowtype;
 v_token text;
 v_expires timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false)
    OR NOT (public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional')) THEN
    RAISE EXCEPTION 'Sem autorização para emitir lembrete.' USING errcode='42501';
 END IF;
 SELECT * INTO v_appointment FROM public.family_psychology_appointments
  WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND OR v_appointment.attendance_status<>'agendado'
   OR v_appointment.appointment_date<=clock_timestamp() THEN
   RAISE EXCEPTION 'Consulta familiar indisponível para lembrete.' USING errcode='22023';
 END IF;
 PERFORM public.capo_assert_patient_write_context(v_appointment.source_patient_id);
 v_expires:=least(v_appointment.appointment_date,clock_timestamp()+interval '7 days');
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 UPDATE public.family_psychology_confirmation_links SET revoked_at=clock_timestamp()
 WHERE appointment_id=p_appointment_id AND decision IS NULL AND revoked_at IS NULL;
 INSERT INTO public.family_psychology_confirmation_links(appointment_id,token_hash,expires_at)
 VALUES (p_appointment_id,encode(extensions.digest(v_token,'sha256'),'hex'),v_expires);
 RETURN jsonb_build_object('token',v_token,'expires_at',v_expires);
END;
$fn$;
REVOKE ALL ON FUNCTION public.issue_family_psychology_confirmation_link_for_interface(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_family_psychology_confirmation_link_for_interface(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.read_family_psychology_confirmation_link(
 p_token_hash text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $fn$
DECLARE v_row record;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
   RAISE EXCEPTION 'Acesso restrito.' USING errcode='42501';
 END IF;
 IF p_token_hash !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('valid',false); END IF;
 SELECT l.decision,l.expires_at,l.revoked_at,
        a.attendance_status,a.appointment_date,pr.care_location,
        split_part(fm.full_name,' ',1) patient_first_name, pr.full_name professional_name
 INTO v_row
 FROM public.family_psychology_confirmation_links l
 JOIN public.family_psychology_appointments a ON a.id=l.appointment_id
 JOIN public.family_members fm ON fm.id=a.family_member_id
 JOIN public.professionals pr ON pr.id=a.professional_id
 WHERE l.token_hash=p_token_hash;
 IF NOT FOUND OR v_row.revoked_at IS NOT NULL OR v_row.expires_at<clock_timestamp() THEN
   RETURN jsonb_build_object('valid',false);
 END IF;
 RETURN jsonb_build_object('valid',true,'decision',v_row.decision,
   'appointment_date',v_row.appointment_date,'care_location',v_row.care_location,
   'patient_first_name',v_row.patient_first_name,'professional_name',v_row.professional_name,
   'available',v_row.attendance_status='agendado');
END;
$fn$;
REVOKE ALL ON FUNCTION public.read_family_psychology_confirmation_link(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_family_psychology_confirmation_link(text) TO service_role;

CREATE OR REPLACE FUNCTION public.respond_family_psychology_confirmation_link(
 p_token_hash text,p_decision text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $fn$
DECLARE
 v_link public.family_psychology_confirmation_links%rowtype;
 v_appointment public.family_psychology_appointments%rowtype;
 v_name text;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
   RAISE EXCEPTION 'Acesso restrito.' USING errcode='42501';
 END IF;
 IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_decision NOT IN ('comparecera','nao_comparecera') THEN
   RETURN jsonb_build_object('success',false,'reason','invalid');
 END IF;
 SELECT * INTO v_link FROM public.family_psychology_confirmation_links
 WHERE token_hash=p_token_hash FOR UPDATE;
 IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at<clock_timestamp() THEN
   RETURN jsonb_build_object('success',false,'reason','expired');
 END IF;
 IF v_link.decision IS NOT NULL THEN
   RETURN jsonb_build_object('success',v_link.decision=p_decision,
     'decision',v_link.decision,'already_recorded',true);
 END IF;
 SELECT * INTO v_appointment FROM public.family_psychology_appointments
 WHERE id=v_link.appointment_id FOR UPDATE;
 IF NOT FOUND OR v_appointment.attendance_status<>'agendado'
    OR v_appointment.appointment_date<=clock_timestamp() THEN
   RETURN jsonb_build_object('success',false,'reason','appointment_unavailable');
 END IF;
 UPDATE public.family_psychology_confirmation_links
 SET decision=p_decision,responded_at=clock_timestamp() WHERE id=v_link.id;
 IF p_decision='nao_comparecera' THEN
   UPDATE public.family_psychology_appointments
   SET attendance_status='cancelado',
       attendance_reason='Familiar informou que não poderá comparecer pelo link individual; remarcação administrativa solicitada.',
       attendance_updated_at=clock_timestamp(),
       attendance_updated_by=NULL,updated_at=clock_timestamp()
   WHERE id=v_appointment.id;
   SELECT full_name INTO v_name FROM public.family_members WHERE id=v_appointment.family_member_id;
   INSERT INTO public.notifications(
     notification_type,title,message,target_role,priority,status,
     patient_id,entity_type,entity_id
   ) VALUES (
     'appointment_patient_reschedule','Remarcação solicitada por Familiar/Cuidador',
     format('%s informou que não poderá comparecer à consulta de Psicologia. Providenciar remarcação administrativa.',coalesce(v_name,'Familiar')),
     'administrativo_operacional','alta','pendente',
     v_appointment.source_patient_id,'family_psychology_appointments',v_appointment.id
   );
 END IF;
 RETURN jsonb_build_object('success',true,'decision',p_decision,
   'appointment_released',p_decision='nao_comparecera');
END;
$fn$;
REVOKE ALL ON FUNCTION public.respond_family_psychology_confirmation_link(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_family_psychology_confirmation_link(text,text) TO service_role;
