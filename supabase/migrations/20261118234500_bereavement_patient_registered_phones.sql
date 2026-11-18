-- Contatos de condolências: telefone principal/secundário cadastrados do paciente.
-- Preserva contexto e permissões originais; não depende de vínculo familiar.
CREATE OR REPLACE FUNCTION public.get_patient_bereavement_contact_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_professional_id uuid;
  v_social boolean:=false;
  v_patient public.patients%rowtype;
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
  IF NULLIF(btrim(v_patient.phone),'') IS NULL AND NULLIF(btrim(v_patient.phone_secondary),'') IS NULL THEN
    RETURN jsonb_build_object('contact_found',false,'message','Paciente sem telefone principal ou secundário cadastrado.','patient_name',v_patient.full_name);
  END IF;
  RETURN jsonb_build_object(
    'contact_found',true,
    'phone',NULLIF(btrim(v_patient.phone),''),
    'phone_secondary',NULLIF(btrim(v_patient.phone_secondary),''),
    'patient_name',v_patient.full_name
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_patient_bereavement_contact_for_interface(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_patient_bereavement_contact_for_interface(uuid) TO authenticated;
