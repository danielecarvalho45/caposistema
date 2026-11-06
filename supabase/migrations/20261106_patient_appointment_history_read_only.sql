-- CAPO: histórico de agendamentos por paciente (somente leitura).
CREATE OR REPLACE FUNCTION public.get_patient_appointment_history_for_interface(
  p_patient_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  appointment_id uuid,
  appointment_date timestamptz,
  appointment_end timestamptz,
  appointment_type text,
  attendance_status text,
  professional_name text,
  specialty_name text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_professional_id uuid;
  v_is_management boolean;
  v_is_professional boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(), false) THEN
    RAISE EXCEPTION 'Sessão ou termo legal inválido.' USING errcode='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true
  ) THEN
    RAISE EXCEPTION 'Conta inexistente ou inativa.' USING errcode='42501';
  END IF;
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Paciente obrigatório.' USING errcode='22023';
  END IF;
  PERFORM public.capo_assert_patient_read_context(p_patient_id);

  v_is_management := public.has_app_role('administrador')
    OR public.has_app_role('administrativo_operacional')
    OR public.has_app_role('coordenador');
  v_is_professional := public.has_app_role('profissional');
  v_professional_id := public.capo_effective_professional_id();

  IF NOT v_is_management AND NOT (v_is_professional AND v_professional_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Perfil sem autorização para consultar o histórico.' USING errcode='42501';
  END IF;

  IF NOT v_is_management AND NOT EXISTS (
    SELECT 1 FROM public.patient_appointments pa
    WHERE pa.patient_id=p_patient_id
      AND pa.professional_id=v_professional_id
  ) THEN
    RAISE EXCEPTION 'Paciente fora da atuação deste profissional.' USING errcode='42501';
  END IF;

  RETURN QUERY
  SELECT pa.id,pa.appointment_date,pa.appointment_end,pa.appointment_type,
         pa.attendance_status,pr.full_name,s.name,
         count(*) OVER()
  FROM public.patient_appointments pa
  JOIN public.professionals pr ON pr.id=pa.professional_id
  LEFT JOIN public.specialties s ON s.id=pa.specialty_id
  WHERE pa.patient_id=p_patient_id
    AND (v_is_management OR pa.professional_id=v_professional_id)
  ORDER BY pa.appointment_date DESC,pa.id DESC
  LIMIT least(greatest(coalesce(p_limit,50),1),100)
  OFFSET greatest(coalesce(p_offset,0),0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_patient_appointment_history_for_interface(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_patient_appointment_history_for_interface(uuid,integer,integer) TO authenticated;
