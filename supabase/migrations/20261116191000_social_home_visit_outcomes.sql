-- CAPO — Resultados operacionais das visitas (sem prontuário ou relato social).
ALTER TABLE public.social_home_visit_patients
  ADD COLUMN IF NOT EXISTS outcome_reason text;

CREATE OR REPLACE FUNCTION public.set_social_home_visit_outcome_for_interface(
 p_block_id uuid,p_patient_id uuid,p_status text,p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth'
AS $function$
DECLARE
 v_professional uuid;
 v_actor_professional uuid;
 v_is_admin boolean;
BEGIN
 IF auth.uid() IS NULL THEN
   RAISE EXCEPTION 'Sessão inválida.' USING errcode='42501';
 END IF;
 IF NOT coalesce(public.has_accepted_current_legal_term(),false) THEN
   RAISE EXCEPTION 'Aceite do termo vigente obrigatório.' USING errcode='42501';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.user_accounts ua
   WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true
 ) THEN RAISE EXCEPTION 'Conta inativa.' USING errcode='42501'; END IF;

 v_is_admin:=public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional');
 v_actor_professional:=public.capo_effective_professional_id();
 IF NOT v_is_admin AND NOT public.has_app_role('profissional') THEN
   RAISE EXCEPTION 'Perfil não autorizado.' USING errcode='42501';
 END IF;
 SELECT ac.professional_id INTO v_professional
 FROM public.agenda_blocks b JOIN public.agenda_configs ac ON ac.id=b.agenda_config_id
 WHERE b.id=p_block_id AND b.is_active=true AND b.block_type='visita_domiciliar';
 IF v_professional IS NULL OR (
   NOT v_is_admin AND v_professional IS DISTINCT FROM v_actor_professional
 ) THEN RAISE EXCEPTION 'Acesso ao bloqueio não autorizado.' USING errcode='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.professional_specialties ps
   JOIN public.specialties s ON s.id=ps.specialty_id
   WHERE ps.professional_id=v_professional AND s.is_active=true
     AND lower(btrim(s.name))='assistência social'
 ) THEN RAISE EXCEPTION 'Somente Assistência Social pode registrar visita.' USING errcode='42501'; END IF;

 IF p_status NOT IN ('programada','realizada','nao_realizada','cancelada') THEN
   RAISE EXCEPTION 'Situação da visita inválida.' USING errcode='22023';
 END IF;
 IF p_status IN ('nao_realizada','cancelada')
     AND length(btrim(coalesce(p_reason,'')))<5 THEN
   RAISE EXCEPTION 'Informe motivo de pelo menos cinco caracteres.' USING errcode='22023';
 END IF;
 UPDATE public.social_home_visit_patients
 SET status=p_status,
     outcome_reason=CASE WHEN p_status IN ('nao_realizada','cancelada') THEN btrim(p_reason) ELSE NULL END,
     updated_by=auth.uid(),updated_at=now()
 WHERE block_id=p_block_id AND patient_id=p_patient_id AND is_active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paciente não vinculado a esta visita.' USING errcode='22023'; END IF;
 RETURN jsonb_build_object('success',true);
END;
$function$;
REVOKE ALL ON FUNCTION public.set_social_home_visit_outcome_for_interface(
  uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_social_home_visit_outcome_for_interface(
  uuid,uuid,text,text) TO authenticated;
