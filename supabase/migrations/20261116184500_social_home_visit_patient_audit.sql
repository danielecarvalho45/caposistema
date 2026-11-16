-- CAPO — Histórico imutável das alterações da lista de pacientes da Visita Domiciliar.
CREATE TABLE IF NOT EXISTS public.social_home_visit_patient_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 block_id uuid NOT NULL REFERENCES public.agenda_blocks(id) ON DELETE RESTRICT,
 patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
 event_type text NOT NULL,
 visit_time time,
 status text NOT NULL,
 actor_id uuid NOT NULL,
 event_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_home_visit_event_block_idx
 ON public.social_home_visit_patient_events(block_id,event_at);
ALTER TABLE public.social_home_visit_patient_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_home_visit_patient_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.capo_audit_social_home_visit_patient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth'
AS $function$
DECLARE
 v_event text;
BEGIN
 IF TG_OP='INSERT' THEN
   v_event:='adicionado';
 ELSIF OLD.is_active AND NOT NEW.is_active THEN
   v_event:='retirado';
 ELSIF NOT OLD.is_active AND NEW.is_active THEN
   v_event:='reincluido';
 ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
   v_event:='status_alterado';
 ELSIF OLD.visit_time IS DISTINCT FROM NEW.visit_time THEN
   v_event:='horario_alterado';
 ELSE
   RETURN NEW;
 END IF;
 INSERT INTO public.social_home_visit_patient_events (
   block_id,patient_id,event_type,visit_time,status,actor_id
 ) VALUES (
   NEW.block_id,NEW.patient_id,v_event,NEW.visit_time,NEW.status,NEW.updated_by
 );
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.capo_audit_social_home_visit_patient() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_audit_social_home_visit_patient
 ON public.social_home_visit_patients;
CREATE TRIGGER trg_capo_audit_social_home_visit_patient
AFTER INSERT OR UPDATE ON public.social_home_visit_patients
FOR EACH ROW EXECUTE FUNCTION public.capo_audit_social_home_visit_patient();
