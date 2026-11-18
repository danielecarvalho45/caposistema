CREATE OR REPLACE FUNCTION public.get_home_link_reschedule_for_interface(p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false)
   OR NOT EXISTS(SELECT 1 FROM public.user_accounts WHERE auth_user_id=auth.uid() AND is_active) THEN
   RAISE EXCEPTION 'Sessão ou termo inválido.' USING ERRCODE='42501';
 END IF;
 IF NOT(public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional')) THEN
   RAISE EXCEPTION 'Perfil sem acesso à programação administrativa.' USING ERRCODE='42501';
 END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Data obrigatória.' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',coalesce((
   SELECT jsonb_agg(obj ORDER BY obj->>'slot_start',obj->>'professional_name')
   FROM (
     SELECT jsonb_build_object('appointment_id',a.id,'patient_id',a.patient_id,
       'patient_name',pt.full_name,'professional_id',a.professional_id,'professional_name',pr.full_name,
       'slot_date',p_date,'slot_start',a.appointment_date,'slot_end',a.appointment_end,
       'appointment_kind','paciente') obj
     FROM public.patient_appointments a
     JOIN public.patients pt ON pt.id=a.patient_id
     JOIN public.professionals pr ON pr.id=a.professional_id
     WHERE (a.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=p_date
       AND a.attendance_status='cancelado'
       AND public.capo_patient_visible_in_current_context(a.patient_id)
       AND EXISTS(SELECT 1 FROM public.appointment_confirmation_links l
           WHERE l.appointment_id=a.id AND l.decision='nao_comparecera')
       AND EXISTS(SELECT 1 FROM public.notifications n WHERE n.notification_type='appointment_patient_reschedule'
           AND n.entity_type='patient_appointments' AND n.entity_id=a.id AND n.resolved_at IS NULL)
       AND NOT EXISTS(SELECT 1 FROM public.patient_appointments successor WHERE successor.rescheduled_from_id=a.id
           AND lower(coalesce(successor.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada'))
     UNION ALL
     SELECT jsonb_build_object('appointment_id',a.id,'patient_id',a.source_patient_id,
       'patient_name',fm.full_name,'professional_id',a.professional_id,'professional_name',pr.full_name,
       'slot_date',p_date,'slot_start',a.appointment_date,'slot_end',a.appointment_end,
       'appointment_kind','familiar') obj
     FROM public.family_psychology_appointments a
     JOIN public.family_members fm ON fm.id=a.family_member_id
     JOIN public.professionals pr ON pr.id=a.professional_id
     WHERE (a.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=p_date
       AND a.attendance_status='cancelado'
       AND public.capo_patient_visible_in_current_context(a.source_patient_id)
       AND EXISTS(SELECT 1 FROM public.family_psychology_confirmation_links l
           WHERE l.appointment_id=a.id AND l.decision='nao_comparecera')
       AND EXISTS(SELECT 1 FROM public.notifications n WHERE n.notification_type='appointment_patient_reschedule'
           AND n.entity_type='family_psychology_appointments' AND n.entity_id=a.id AND n.resolved_at IS NULL)
       AND NOT EXISTS(SELECT 1 FROM public.family_psychology_appointments successor WHERE successor.rescheduled_from_id=a.id
           AND lower(coalesce(successor.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada'))
   ) scope
 ),'[]'::jsonb));
END;
$function$
;
