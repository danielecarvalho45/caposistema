-- CAPO / Óbito e luto / aprovação VERDE / 18-11-2026.
-- Preserva status histórico 'obito' (excluído de ativos), família como paciente CAPO
-- e módulo de bloqueio de agenda previamente congelado.
CREATE OR REPLACE FUNCTION public.capo_bloquear_agendamento_obito()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
BEGIN
  -- Permite somente encerrar um agendamento existente; jamais criar/remarcar paciente falecido.
  IF TG_OP = 'UPDATE' AND NEW.patient_id=OLD.patient_id
     AND NEW.attendance_status IN ('cancelado','remarcado')
     AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
     AND NEW.appointment_end IS NOT DISTINCT FROM OLD.appointment_end
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.psychology_group_block_id IS NOT DISTINCT FROM OLD.psychology_group_block_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS(SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.deceased=true) THEN
    RAISE EXCEPTION 'Paciente com óbito registrado não pode receber novo agendamento.';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.capo_fluxo_obito()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp' AS $fn$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.deceased IS TRUE AND COALESCE(OLD.deceased,FALSE) IS FALSE THEN
    -- Atomicidade: em falha, nem o registro de óbito nem os cancelamentos são confirmados.
    -- Não cancelar consultas próprias de familiares/cuidadores no CAPO.
    UPDATE public.patient_appointments pa
       SET attendance_status='cancelado',
           attendance_reason='Cancelamento automático por óbito',
           attendance_notes='Consulta cancelada após registro de óbito do paciente no CAPO.',
           attendance_updated_at=clock_timestamp(),
           attendance_updated_by=NEW.death_recorded_by,
           updated_at=clock_timestamp()
     WHERE pa.patient_id=NEW.id
       AND pa.appointment_date>=clock_timestamp()
       AND pa.attendance_status IN ('agendado','confirmado');

    PERFORM public.capo_criar_notificacao(
      'administrativo_operacional',NULL,'patient_death','Óbito registrado',
      'Óbito registrado. Consultas futuras do paciente foram canceladas. Verifique as pendências e o acolhimento da família.',
      'patients',NEW.id,'alta');
    PERFORM public.capo_criar_notificacao(
      'coordenador',NULL,'patient_death','Óbito registrado',
      'Óbito registrado no CAPO. Acompanhe as providências administrativas e familiares.',
      'patients',NEW.id,'alta');

    -- Cada profissional ativo com login recebe aviso individual, inclusive sem
    -- consultas prévias com o paciente. Isolamento de homologação aplicado por contexto.
    FOR v_user_id IN
      SELECT DISTINCT ua.auth_user_id
      FROM public.professionals pr
      JOIN public.user_accounts ua ON ua.professional_id=pr.id
      WHERE pr.status='ativo' AND pr.is_professional=true
        AND ua.is_active=true AND ua.auth_user_id IS NOT NULL
        AND private.capo_professional_visible_in_current_context(pr.id)
    LOOP
      PERFORM public.capo_criar_notificacao(
        'profissional',v_user_id,'patient_death','Comunicado de óbito',
        'Foi registrado o óbito de um paciente CAPO. Consulte somente as informações permitidas ao seu perfil e acolha a família quando pertinente.',
        'patients',NEW.id,'alta');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$fn$;

-- O registro já existente no banco (caso anterior) também não deve deixar
-- consultas futuras pendentes. Preserva histórico e não cancela acompanhantes.
UPDATE public.patient_appointments pa
   SET attendance_status='cancelado',
       attendance_reason='Cancelamento automático por óbito',
       attendance_notes='Consulta futura cancelada por regularização de óbito previamente registrado.',
       attendance_updated_at=clock_timestamp(),
       updated_at=clock_timestamp()
  FROM public.patients p
 WHERE pa.patient_id=p.id AND p.deceased=true
   AND pa.appointment_date>=clock_timestamp()
   AND pa.attendance_status IN ('agendado','confirmado');

-- Consulta de contato permitido para condolências; jamais pressupor que o
-- telefone do paciente falecido seja o telefone de seu familiar.
CREATE OR REPLACE FUNCTION public.get_patient_bereavement_contact_for_interface(p_patient_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp' AS $fn$
DECLARE
  v_professional_id uuid;
  v_social boolean:=false;
  v_patient public.patients%rowtype;
  v_name text;
  v_phone text;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_accepted_current_legal_term(),false)
    OR NOT EXISTS(SELECT 1 FROM public.user_accounts ua WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true)
  THEN RAISE EXCEPTION 'Sessão ou termo vigente inválido.' USING ERRCODE='42501'; END IF;
  PERFORM public.capo_assert_patient_read_context(p_patient_id);
  SELECT * INTO v_patient FROM public.patients WHERE id=p_patient_id;
  IF v_patient.id IS NULL THEN RAISE EXCEPTION 'Paciente não localizado.'; END IF;
  SELECT public.capo_effective_professional_id() INTO v_professional_id;
  IF v_professional_id IS NOT NULL AND public.has_app_role('profissional') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.professional_specialties ps
      JOIN public.specialties sp ON sp.id=ps.specialty_id
      JOIN public.professionals pr ON pr.id=ps.professional_id
      WHERE ps.professional_id=v_professional_id AND pr.status='ativo'
      AND sp.is_active=true AND lower(btrim(sp.name))=lower('Assistência Social')
    ) INTO v_social;
  END IF;
  IF NOT (public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional') OR v_social)
  THEN RAISE EXCEPTION 'Perfil sem autorização para consultar contato de condolências.' USING ERRCODE='42501'; END IF;
  IF v_social AND NOT (public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional'))
     AND NOT EXISTS(SELECT 1 FROM public.social_followup_cycles s
                    WHERE s.patient_id=p_patient_id AND s.professional_id=v_professional_id
                      AND s.status IN ('ativo','encerrado'))
  THEN RAISE EXCEPTION 'Paciente fora do acompanhamento social autorizado.' USING ERRCODE='42501'; END IF;
  IF NOT COALESCE(v_patient.deceased,false) THEN
    RETURN jsonb_build_object('contact_found',false,'message','Óbito não registrado.');
  END IF;
  SELECT fm.full_name,fm.phone INTO v_name,v_phone
  FROM public.patient_family_links pfl
  JOIN public.family_members fm ON fm.id=pfl.family_member_id
  WHERE pfl.patient_id=p_patient_id
    AND pfl.unlinked_at IS NULL
    AND NULLIF(btrim(fm.phone),'') IS NOT NULL
  ORDER BY COALESCE(pfl.accepted_capo,false) DESC,pfl.linked_at DESC,pfl.id DESC
  LIMIT 1;
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('contact_found',false,'message','Nenhum familiar/cuidador vinculado possui telefone cadastrado.');
  END IF;
  RETURN jsonb_build_object('contact_found',true,'family_name',v_name,'phone',v_phone,'patient_name',v_patient.full_name);
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_patient_bereavement_contact_for_interface(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_patient_bereavement_contact_for_interface(uuid) TO authenticated;
