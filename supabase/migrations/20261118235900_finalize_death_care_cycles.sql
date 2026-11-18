-- Ciclos assistenciais cessam por óbito, sem confundir com alta/encerramento habitual.
-- Preserva o status obito do paciente, históricos, vínculos e ciclos próprios de familiares.
ALTER TABLE public.patient_care_cycle_specialties
  DROP CONSTRAINT patient_care_cycle_specialties_resolution_type_check;
ALTER TABLE public.patient_care_cycle_specialties
  ADD CONSTRAINT patient_care_cycle_specialties_resolution_type_check
  CHECK (resolution_type IS NULL OR resolution_type IN ('professional_closure','operational_withdrawal','obito'));

CREATE OR REPLACE FUNCTION public.capo_finalize_death_care_cycles(
  p_patient_id uuid, p_recorded_at timestamptz, p_account_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
DECLARE
  v_when timestamptz := COALESCE(p_recorded_at,clock_timestamp());
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=p_patient_id AND p.deceased=true AND p.status='obito') THEN
    RAISE EXCEPTION 'Finalização por óbito exige óbito registrado.' USING ERRCODE='22023';
  END IF;

  -- Encerramentos profissionais pendentes deixam de ser uma tarefa ativa,
  -- permanecendo auditados com justificativa explícita, sem simular conduta clínica.
  UPDATE public.patient_care_closures cc
     SET status='encerrado',
         closed_at=COALESCE(cc.closed_at,v_when),
         closure_notes=concat_ws(E'\n', NULLIF(cc.closure_notes,''), 'Encerramento administrativo por óbito; não equivale a alta ou encerramento profissional.'),
         updated_at=clock_timestamp()
   WHERE cc.patient_id=p_patient_id
     AND cc.status='pendente'
     AND EXISTS (
       SELECT 1 FROM public.patient_care_cycle_specialties cs
       JOIN public.patient_care_cycles c ON c.id=cs.care_cycle_id
       WHERE cs.id=cc.cycle_specialty_id
         AND c.patient_id=p_patient_id
         AND c.status IN ('ativo','encerramento_em_andamento')
     );

  UPDATE public.patient_care_cycle_specialties cs
     SET status='encerrada', resolution_type='obito',
         resolution_reason='Finalização administrativa do acompanhamento por óbito do paciente.',
         resolved_at=v_when, resolved_by=p_account_id,
         updated_at=clock_timestamp()
    FROM public.patient_care_cycles c
   WHERE cs.care_cycle_id=c.id AND c.patient_id=p_patient_id
     AND c.status IN ('ativo','encerramento_em_andamento')
     AND cs.status IN ('ativa','encerramento_pendente');

  UPDATE public.patient_care_cycles c
     SET status='encerrado', completed_at=v_when, updated_at=clock_timestamp()
   WHERE c.patient_id=p_patient_id
     AND c.status IN ('ativo','encerramento_em_andamento');
END;
$function$;

REVOKE ALL ON FUNCTION public.capo_finalize_death_care_cycles(uuid,timestamptz,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.capo_finalize_death_care_cycles_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
BEGIN
  IF NEW.deceased IS TRUE AND COALESCE(OLD.deceased,FALSE) IS FALSE THEN
    PERFORM public.capo_finalize_death_care_cycles(NEW.id,NEW.death_recorded_at,NEW.death_recorded_by);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.capo_finalize_death_care_cycles_trigger() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_capo_finalize_death_care_cycles ON public.patients;
CREATE TRIGGER trg_capo_finalize_death_care_cycles
AFTER UPDATE OF deceased ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.capo_finalize_death_care_cycles_trigger();

-- Saneamento apenas de pacientes que já possuem óbito e ciclo aberto, sem inventar registros.
DO $backfill$
DECLARE v RECORD;
BEGIN
 FOR v IN
   SELECT p.id,p.death_recorded_at,p.death_recorded_by
   FROM public.patients p
   WHERE p.deceased=true AND p.status='obito'
     AND EXISTS (
       SELECT 1 FROM public.patient_care_cycles c WHERE c.patient_id=p.id
       AND c.status IN ('ativo','encerramento_em_andamento')
     )
 LOOP
   PERFORM public.capo_finalize_death_care_cycles(v.id,v.death_recorded_at,v.death_recorded_by);
 END LOOP;
END;
$backfill$;
