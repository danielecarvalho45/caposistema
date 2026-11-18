-- CAPO | Familiar/cuidador: uma pessoa vinculada por vez, substituicao auditavel,
-- prazo de dois meses apos obito e abertura automatica do luto.
-- Sem alterar agendas, obito clinico, bloqueios ou registros de familiares substituidos.

CREATE OR REPLACE FUNCTION public.capo_guard_family_link_after_death()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_patient public.patients%rowtype;
BEGIN
  SELECT * INTO v_patient FROM public.patients p WHERE p.id=NEW.patient_id FOR SHARE;
  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Paciente não localizado.' USING ERRCODE='22023';
  END IF;
  IF COALESCE(v_patient.deceased,false) THEN
    IF v_patient.death_date IS NULL
       OR (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date >
          (v_patient.death_date + INTERVAL '2 months')::date THEN
      RAISE EXCEPTION 'Prazo de dois meses após o óbito encerrado. Não é permitido criar ou substituir vínculo familiar.' USING ERRCODE='22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.capo_guard_family_link_after_death() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_guard_family_link_after_death ON public.patient_family_links;
CREATE TRIGGER trg_capo_guard_family_link_after_death
BEFORE INSERT ON public.patient_family_links
FOR EACH ROW EXECUTE FUNCTION public.capo_guard_family_link_after_death();

CREATE OR REPLACE FUNCTION public.capo_auto_start_family_bereavement(
  p_patient_id uuid, p_family_member_id uuid, p_account_id uuid,
  p_started_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
DECLARE
  v_social_professional_id uuid;
  v_when timestamptz := COALESCE(p_started_at,clock_timestamp());
  v_link public.patient_family_links%rowtype;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id=p_patient_id
      AND p.deceased=true AND p.status='obito'
  ) THEN
    RETURN;
  END IF;
  SELECT * INTO v_link
    FROM public.patient_family_links pfl
   WHERE pfl.patient_id=p_patient_id
     AND pfl.family_member_id=p_family_member_id
     AND pfl.unlinked_at IS NULL
   ORDER BY pfl.linked_at DESC,pfl.id DESC LIMIT 1;
  IF v_link.id IS NULL THEN RETURN; END IF;

  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Registro de luto exige responsável administrativo identificável.' USING ERRCODE='22023';
  END IF;

  -- Usa a assistente social ja vinculada ao acompanhamento do paciente.
  SELECT sfc.professional_id INTO v_social_professional_id
    FROM public.social_followup_cycles sfc
    JOIN public.professionals pr ON pr.id=sfc.professional_id
   WHERE sfc.patient_id=p_patient_id
     AND sfc.status IN ('ativo','encerrado')
     AND pr.status='ativo'
   ORDER BY (sfc.status='ativo') DESC,sfc.started_at DESC,sfc.id DESC LIMIT 1;

  INSERT INTO public.family_bereavement_cycles (
    family_member_id,patient_id,social_professional_id,status,
    started_at,started_by_account_id,start_notes,created_at,updated_at
  )
  SELECT p_family_member_id,p_patient_id,v_social_professional_id,'active',
    v_when,p_account_id,'Acompanhamento de luto aberto automaticamente após óbito.',clock_timestamp(),clock_timestamp()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.family_bereavement_cycles bc
    WHERE bc.family_member_id=p_family_member_id
      AND bc.patient_id=p_patient_id
  );
  -- Nao reabrir ciclo de luto ja resolvido.
  IF EXISTS (
    SELECT 1 FROM public.family_bereavement_cycles bc
    WHERE bc.family_member_id=p_family_member_id
      AND bc.patient_id=p_patient_id AND bc.status='active'
  ) THEN
    UPDATE public.family_members fm
       SET bereavement_active=true,
           bereavement_started_at=COALESCE(fm.bereavement_started_at,v_when),
           bereavement_ended_at=NULL,
           updated_at=clock_timestamp()
     WHERE fm.id=p_family_member_id AND fm.bereavement_active IS DISTINCT FROM true;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.capo_auto_start_family_bereavement(uuid,uuid,uuid,timestamptz)
FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.capo_auto_bereavement_on_death()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
DECLARE v_link record;
BEGIN
  IF NEW.deceased IS TRUE AND COALESCE(OLD.deceased,FALSE) IS FALSE THEN
    FOR v_link IN SELECT pfl.family_member_id,pfl.linked_by
      FROM public.patient_family_links pfl
      WHERE pfl.patient_id=NEW.id AND pfl.unlinked_at IS NULL
    LOOP
      PERFORM public.capo_auto_start_family_bereavement(
        NEW.id,v_link.family_member_id,COALESCE(NEW.death_recorded_by,v_link.linked_by),NEW.death_recorded_at
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.capo_auto_bereavement_on_death() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_auto_bereavement_on_death ON public.patients;
CREATE TRIGGER trg_capo_auto_bereavement_on_death
AFTER UPDATE OF deceased ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.capo_auto_bereavement_on_death();

CREATE OR REPLACE FUNCTION public.capo_auto_bereavement_on_family_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
BEGIN
  IF NEW.unlinked_at IS NULL THEN
    PERFORM public.capo_auto_start_family_bereavement(
      NEW.patient_id,NEW.family_member_id,NEW.linked_by,NEW.linked_at
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.capo_auto_bereavement_on_family_link() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_capo_auto_bereavement_on_family_link ON public.patient_family_links;
CREATE TRIGGER trg_capo_auto_bereavement_on_family_link
AFTER INSERT ON public.patient_family_links
FOR EACH ROW EXECUTE FUNCTION public.capo_auto_bereavement_on_family_link();

-- Corrigir apenas vinculos ativos de falecidos que ainda nao tenham ciclo de luto.
DO $backfill$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT p.id patient_id,p.death_recorded_at,p.death_recorded_by,
           pfl.family_member_id,pfl.linked_by
      FROM public.patients p
      JOIN public.patient_family_links pfl ON pfl.patient_id=p.id AND pfl.unlinked_at IS NULL
     WHERE p.deceased=true AND p.status='obito'
  LOOP
    PERFORM public.capo_auto_start_family_bereavement(
      v.patient_id,v.family_member_id,COALESCE(v.death_recorded_by,v.linked_by),
      v.death_recorded_at
    );
  END LOOP;
END;
$backfill$;
