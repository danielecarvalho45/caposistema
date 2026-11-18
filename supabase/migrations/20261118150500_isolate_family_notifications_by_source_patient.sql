-- Resolver paciente de origem das notificações familiares para aplicar isolamento já vigente.
CREATE OR REPLACE FUNCTION private.capo_notification_patient_id(p_patient_id uuid, p_entity_type text, p_entity_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_patient_id uuid := p_patient_id;
  v_type text := lower(btrim(coalesce(p_entity_type,'')));
begin
  if v_patient_id is not null or p_entity_id is null then
    return v_patient_id;
  end if;

  case v_type
    when 'patient' then
      return p_entity_id;
    when 'patients' then
      return p_entity_id;
    when 'family_psychology_appointment' then
      select x.source_patient_id into v_patient_id
      from public.family_psychology_appointments x where x.id=p_entity_id;
    when 'family_psychology_appointments' then
      select x.source_patient_id into v_patient_id
      from public.family_psychology_appointments x where x.id=p_entity_id;
    when 'transport_requests' then
      select x.patient_id into v_patient_id
      from public.transport_requests x where x.id=p_entity_id;
    when 'prescription_renewal_requests' then
      select x.patient_id into v_patient_id
      from public.prescription_renewal_requests x where x.id=p_entity_id;
    when 'administrative_request' then
      select x.patient_id into v_patient_id
      from public.administrative_requests x where x.id=p_entity_id;
    when 'administrative_requests' then
      select x.patient_id into v_patient_id
      from public.administrative_requests x where x.id=p_entity_id;
    when 'referrals' then
      select x.patient_id into v_patient_id
      from public.referrals x where x.id=p_entity_id;
    when 'interprofessional_referral' then
      select x.patient_id into v_patient_id
      from public.referrals x where x.id=p_entity_id;
    when 'interprofessional_referrals' then
      select x.patient_id into v_patient_id
      from public.referrals x where x.id=p_entity_id;
    when 'waiting_list' then
      select x.patient_id into v_patient_id
      from public.waiting_list x where x.id=p_entity_id;
    when 'patient_no_show_followup' then
      select x.patient_id into v_patient_id
      from public.patient_no_show_followups x where x.id=p_entity_id;
    when 'patient_no_show_followups' then
      select x.patient_id into v_patient_id
      from public.patient_no_show_followups x where x.id=p_entity_id;
    when 'patient_care_closures' then
      select x.patient_id into v_patient_id
      from public.patient_care_closures x where x.id=p_entity_id;
    when 'clinical_records' then
      select x.patient_id into v_patient_id
      from public.clinical_records x where x.id=p_entity_id;
    when 'nutrition_document_deliveries' then
      select d.patient_id into v_patient_id
      from public.nutrition_document_deliveries x
      join public.nutrition_plan_documents d on d.id=x.document_id
      where x.id=p_entity_id;
    else
      v_patient_id := null;
  end case;

  return v_patient_id;
end;
$function$
;
