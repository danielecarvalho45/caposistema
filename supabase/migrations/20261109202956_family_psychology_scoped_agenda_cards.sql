create or replace function public.get_family_psychology_agenda_cards_for_interface(
 p_start_date date,p_end_date date,p_professional_id uuid default null
) returns jsonb language sql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $body$
  select coalesce(jsonb_agg(jsonb_build_object(
    'appointment_id',a.appointment_id,
    'family_member_id',a.family_member_id,
    'family_name',a.family_name,
    'family_capo_number',fm.capo_number,
    'family_cms',fm.cms,
    'professional_id',a.professional_id,
    'professional_name',a.professional_name,
    'appointment_date',a.appointment_date,
    'appointment_end',a.appointment_end,
    'attendance_status',a.attendance_status,
    'source_patient_name',a.source_patient_name,
    'source_patient_deceased',coalesce(p.deceased,false),
    'source_patient_death_date',p.death_date,
    'relationship',a.relationship
  ) order by a.appointment_date),'[]'::jsonb)
  from public.get_family_psychology_appointments_for_interface(
    p_start_date,p_end_date,p_professional_id
  ) a
  join public.family_members fm on fm.id=a.family_member_id
  join public.patients p on p.id=a.source_patient_id
  where lower(coalesce(a.attendance_status,'')) not in ('cancelada','cancelado','remarcado','remarcada');
$body$;
revoke all on function public.get_family_psychology_agenda_cards_for_interface(date,date,uuid) from public;
grant execute on function public.get_family_psychology_agenda_cards_for_interface(date,date,uuid) to authenticated;