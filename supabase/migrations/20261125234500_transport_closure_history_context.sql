-- Preservar acesso aos PDFs de encerramento históricos, sem emitir novos.
CREATE OR REPLACE FUNCTION public.get_transport_context_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid; v_professional_id uuid; v_admin boolean; v_social boolean; v_allowed boolean; v_result jsonb;
begin
  perform public.capo_assert_patient_read_context(p_patient_id);
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;
  select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.'; end if;
  v_admin := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');
  v_social := v_professional_id is not null and exists(
    select 1 from public.professionals pr join public.professional_specialties ps on ps.professional_id=pr.id join public.specialties sp on sp.id=ps.specialty_id
    where pr.id=v_professional_id and pr.status='ativo' and pr.is_professional=true and sp.is_active=true and sp.name='Assistência Social'
  );
  v_allowed := v_admin or (v_social and exists(select 1 from public.social_followup_cycles sfc where sfc.patient_id=p_patient_id and sfc.professional_id=v_professional_id and sfc.status='ativo'));
  if not v_allowed then raise exception 'Usuário sem autorização para este paciente no Transporte.'; end if;
  if not exists(select 1 from public.patients pt where pt.id=p_patient_id and pt.status='ativo' and pt.deceased=false) then raise exception 'Paciente inexistente, inativo ou falecido.'; end if;
  select jsonb_build_object(
    'patient',(select jsonb_build_object('patient_id',pt.id,'full_name',pt.full_name,'patient_number',pt.patient_number,'cms',pt.cms,'birth_date',pt.birth_date,'phone',pt.phone,'phone_secondary',pt.phone_secondary,'address',pt.address) from public.patients pt where pt.id=p_patient_id),
    'active_need',(select jsonb_build_object('cycle_id',nc.id,'status',nc.status,'started_at',nc.started_at,'recognized_by',coalesce(pr.full_name,ua.username),'cancellation_requested_at',nc.cancellation_requested_at,'cancellation_request_reason',nc.cancellation_request_reason) from public.transport_need_cycles nc join public.user_accounts ua on ua.id=nc.recognized_by left join public.professionals pr on pr.id=public.capo_effective_professional_id() where nc.patient_id=p_patient_id and nc.status='ativo'),
    'need_history',coalesce((select jsonb_agg(jsonb_build_object('cycle_id',nc.id,'status',nc.status,'started_at',nc.started_at,'recognized_by',coalesce(rp.full_name,ru.username),'closed_at',nc.closed_at,'closed_by',coalesce(cp.full_name,cu.username),'closure_reason',nc.closure_reason,'cancellation_requested_at',nc.cancellation_requested_at,'cancellation_request_reason',nc.cancellation_request_reason) order by nc.started_at desc) from public.transport_need_cycles nc join public.user_accounts ru on ru.id=nc.recognized_by left join public.professionals rp on rp.id=ru.professional_id left join public.user_accounts cu on cu.id=nc.closed_by left join public.professionals cp on cp.id=cu.professional_id where nc.patient_id=p_patient_id),'[]'::jsonb),
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('appointment_id',pa.id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'attendance_status',pa.attendance_status,'professional_name',pr.full_name,'professional_specialty',coalesce(aps.name,(select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=pr.id and sp.is_active order by sp.name limit 1),pr.function_title),'care_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(pr.care_location),''))) order by pa.appointment_date asc) from public.patient_appointments pa join public.professionals pr on pr.id=pa.professional_id left join public.specialties aps on aps.id=pa.specialty_id where pa.patient_id=p_patient_id and pa.attendance_status in ('agendado','confirmado')),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',tr.id,'protocol',tr.protocol,'closure_reason',tr.closure_reason,'closure_pdf_path',tr.closure_pdf_path,'need_cycle_id',tr.need_cycle_id,'appointment_id',tr.appointment_id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'appointment_professional',apr.full_name,'appointment_specialty',coalesce(aps.name,(select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=apr.id and sp.is_active order by sp.name limit 1),apr.function_title),'appointment_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(apr.care_location),'')),'boarding_address',tr.boarding_address,'boarding_source',tr.boarding_source,'vehicle_type',tr.vehicle_type,'vehicle_pdf_update_pending',tr.vehicle_pdf_update_pending,'periodicity',tr.periodicity,'pdf_details_confirmed_at',tr.pdf_details_confirmed_at,'requested_by_role',coalesce(rp.function_title,case when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=ru.id and ar.code='administrador') then 'Gestor/Titular' else 'Administrativo Operacional' end),'status',tr.status,'requested_at',tr.requested_at,'requested_by',coalesce(rp.full_name,ru.username),'transport_notes',tr.transport_notes,'confirmed_at',tr.confirmed_at,'confirmed_by',coalesce(cp.full_name,cu.username),'pdf_prepared_at',tr.pdf_prepared_at,'pdf_prepared_by',coalesce(pp.full_name,pu.username),'external_forwarded_at',tr.external_forwarded_at,'external_forwarded_by',coalesce(ep.full_name,eu.username),'external_channel',tr.external_channel,'external_reference',tr.external_reference,'completed_at',tr.completed_at,'completed_by',coalesce(xp.full_name,xu.username),'cancelled_at',tr.cancelled_at,'cancelled_by',coalesce(kp.full_name,ku.username),'cancellation_reason',tr.cancellation_reason,'pdf_persisted',(tr.request_pdf_path is not null and btrim(tr.request_pdf_path)<>'')) order by tr.requested_at desc)
      from public.transport_requests tr
      left join public.patient_appointments pa on pa.id=tr.appointment_id
      left join public.professionals apr on apr.id=pa.professional_id
      left join public.specialties aps on aps.id=pa.specialty_id
      join public.user_accounts ru on ru.id=tr.requested_by left join public.professionals rp on rp.id=ru.professional_id
      left join public.user_accounts cu on cu.id=tr.confirmed_by left join public.professionals cp on cp.id=cu.professional_id
      left join public.user_accounts pu on pu.id=tr.pdf_prepared_by left join public.professionals pp on pp.id=pu.professional_id
      left join public.user_accounts eu on eu.id=tr.external_forwarded_by left join public.professionals ep on ep.id=eu.professional_id
      left join public.user_accounts xu on xu.id=tr.completed_by left join public.professionals xp on xp.id=xu.professional_id
      left join public.user_accounts ku on ku.id=tr.cancelled_by left join public.professionals kp on kp.id=ku.professional_id
      where tr.patient_id=p_patient_id),'[]'::jsonb),
    'can_administer',v_admin,
    'can_social_request',v_social
  ) into v_result;
  return v_result;
end;
$function$
;
