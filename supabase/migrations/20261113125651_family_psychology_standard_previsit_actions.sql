-- CAPO §28.237: avisos prévios do familiar na agenda canônica da Psicologia.
-- Ações administrativas não alteram presença, vínculo ou horários.
create table if not exists public.family_psychology_previsit_contacts (
 id uuid primary key default gen_random_uuid(),
 appointment_id uuid not null references public.family_psychology_appointments(id) on delete restrict,
 result text not null check (result in ('avisado','sem_resposta','solicitou_cancelamento','solicitou_remarcacao')),
 recorded_by uuid not null references public.user_accounts(id),
 recorded_at timestamptz not null default clock_timestamp()
);
create index if not exists idx_family_psychology_previsit_latest on public.family_psychology_previsit_contacts(appointment_id,recorded_at desc);
alter table public.family_psychology_previsit_contacts enable row level security;
revoke all on public.family_psychology_previsit_contacts from public,anon,authenticated;

create or replace function public.register_family_psychology_previsit_contact_for_interface(p_appointment_id uuid,p_result text)
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $func$
declare v_account uuid; v_appt public.family_psychology_appointments%rowtype; v_result text:=lower(btrim(coalesce(p_result,''))); v_id uuid;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
  raise exception 'Sessão e termo vigente obrigatórios.' using errcode='42501';
 end if;
 if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
  raise exception 'Ação exclusiva do Administrativo ou Gestor.' using errcode='42501';
 end if;
 select id into v_account from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
 if v_account is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
 if v_result not in ('avisado','sem_resposta','solicitou_cancelamento','solicitou_remarcacao') then
  raise exception 'Resultado inválido.' using errcode='22023';
 end if;
 select * into v_appt from public.family_psychology_appointments where id=p_appointment_id for update;
 if v_appt.id is null or v_appt.attendance_status <> 'agendado' then
  raise exception 'Atendimento familiar não está agendado.' using errcode='22023';
 end if;
 perform public.capo_assert_patient_write_context(v_appt.source_patient_id);
 insert into public.family_psychology_previsit_contacts(appointment_id,result,recorded_by)
 values(p_appointment_id,v_result,v_account) returning id into v_id;
 return jsonb_build_object('success',true,'contact_id',v_id,'appointment_id',p_appointment_id,'result',v_result,'attendance_unchanged',true);
end;
$func$;
revoke all on function public.register_family_psychology_previsit_contact_for_interface(uuid,text) from public,anon;
grant execute on function public.register_family_psychology_previsit_contact_for_interface(uuid,text) to authenticated;

create or replace function public.get_family_psychology_agenda_cards_for_interface(p_start_date date,p_end_date date,p_professional_id uuid default null)
returns jsonb language sql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $func$
 select coalesce(jsonb_agg(jsonb_build_object(
  'appointment_id',a.appointment_id,
  'family_member_id',a.family_member_id,
  'family_name',a.family_name,
  'family_phone',a.family_phone,
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
  'relationship',a.relationship,
  'last_notice_result',(
     select c.result from public.family_psychology_previsit_contacts c
     where c.appointment_id=a.appointment_id
     order by c.recorded_at desc,c.id desc limit 1)
 ) order by a.appointment_date),'[]'::jsonb)
 from public.get_family_psychology_appointments_for_interface(p_start_date,p_end_date,p_professional_id) a
 join public.family_members fm on fm.id=a.family_member_id
 join public.patients p on p.id=a.source_patient_id
 where lower(coalesce(a.attendance_status,'')) not in ('cancelada','cancelado','remarcado','remarcada');
$func$;
