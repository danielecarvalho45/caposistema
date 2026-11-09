-- Contrato isolado de resposta pública à consulta. Não altera os fluxos de presença profissional.
-- Aplicar somente depois de revisar as políticas e publicar a função pública correspondente.
create table if not exists public.appointment_confirmation_links (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.patient_appointments(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  decision text check (decision in ('comparecera','nao_comparecera')),
  responded_at timestamptz,
  no_response_alert_at timestamptz,
  constraint confirmation_decision_pair check ((decision is null) = (responded_at is null))
);
create index if not exists idx_appointment_confirmation_links_appointment
  on public.appointment_confirmation_links (appointment_id,issued_at desc);
create index if not exists idx_appointment_confirmation_links_pending
  on public.appointment_confirmation_links (expires_at)
  where decision is null and revoked_at is null;
alter table public.appointment_confirmation_links enable row level security;
revoke all on public.appointment_confirmation_links from public, anon, authenticated;

create or replace function public.issue_appointment_confirmation_link_for_interface(p_appointment_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','pg_temp'
as $fn$
declare
  v_appointment public.patient_appointments%rowtype;
  v_token text;
  v_expires timestamptz;
begin
  if auth.uid() is null or not public.has_accepted_current_legal_term()
     or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Sem autorização para emitir lembrete.' using errcode='42501';
  end if;
  select * into v_appointment from public.patient_appointments
    where id=p_appointment_id for update;
  if not found or v_appointment.attendance_status<>'agendado'
    or v_appointment.appointment_date<=clock_timestamp() then
    raise exception 'Consulta indisponível para lembrete.' using errcode='22023';
  end if;
  perform public.capo_assert_patient_write_context(v_appointment.patient_id);
  v_expires:=least(v_appointment.appointment_date,clock_timestamp()+interval '7 days');
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.appointment_confirmation_links set revoked_at=clock_timestamp()
    where appointment_id=p_appointment_id and decision is null and revoked_at is null;
  insert into public.appointment_confirmation_links(appointment_id,token_hash,expires_at)
    values (p_appointment_id,encode(extensions.digest(v_token,'sha256'),'hex'),v_expires);
  return jsonb_build_object('token',v_token,'expires_at',v_expires);
end;
$fn$;
revoke all on function public.issue_appointment_confirmation_link_for_interface(uuid) from public,anon;
grant execute on function public.issue_appointment_confirmation_link_for_interface(uuid) to authenticated;

create or replace function public.get_patient_confirmation_states_for_interface(
  p_start_date date,p_end_date date,p_professional_id uuid default null)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $fn$
declare
  v_professional uuid;
  v_general boolean;
begin
  if auth.uid() is null or not public.has_accepted_current_legal_term() then
    raise exception 'Sessão não autorizada.' using errcode='42501';
  end if;
  v_general:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  v_professional:=public.capo_effective_professional_id();
  if not v_general and v_professional is null then
    raise exception 'Perfil sem autorização.' using errcode='42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date<p_start_date
    or p_end_date-p_start_date>42 then
    raise exception 'Período inválido.' using errcode='22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('appointment_id',t.appointment_id,
      'decision',t.decision,'responded_at',t.responded_at))
    from (
      select distinct on (a.id) a.id as appointment_id,l.decision,l.responded_at
      from public.patient_appointments a
      join public.appointment_confirmation_links l on l.appointment_id=a.id and l.revoked_at is null
      where (a.appointment_date at time zone 'America/Sao_Paulo')::date between p_start_date and p_end_date
        and (p_professional_id is null or a.professional_id=p_professional_id)
        and (v_general or a.professional_id=v_professional)
        and public.capo_patient_visible_in_current_context(a.patient_id)
      order by a.id,l.issued_at desc
    ) t
  ),'[]'::jsonb);
end;
$fn$;
revoke all on function public.get_patient_confirmation_states_for_interface(date,date,uuid) from public,anon;
grant execute on function public.get_patient_confirmation_states_for_interface(date,date,uuid) to authenticated;

-- Apenas a Edge Function, usando service_role no servidor, pode consultar/responder.
create or replace function public.read_appointment_confirmation_link(p_token_hash text)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','pg_temp'
as $fn$
declare
  v_row record;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
    then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('valid',false); end if;
  select l.decision,l.responded_at,l.expires_at,l.revoked_at,
         a.attendance_status,a.appointment_date,a.care_location,
         split_part(pt.full_name,' ',1) as patient_first_name,
         pr.full_name as professional_name
    into v_row
    from public.appointment_confirmation_links l
    join public.patient_appointments a on a.id=l.appointment_id
    join public.patients pt on pt.id=a.patient_id
    join public.professionals pr on pr.id=a.professional_id
    where l.token_hash=p_token_hash;
  if not found or v_row.revoked_at is not null or v_row.expires_at<clock_timestamp()
    then return jsonb_build_object('valid',false); end if;
  return jsonb_build_object('valid',true,'decision',v_row.decision,
    'appointment_date',v_row.appointment_date,'care_location',v_row.care_location,
    'patient_first_name',v_row.patient_first_name,'professional_name',v_row.professional_name,
    'available',v_row.attendance_status='agendado');
end;
$fn$;
revoke all on function public.read_appointment_confirmation_link(text) from public,anon,authenticated;
grant execute on function public.read_appointment_confirmation_link(text) to service_role;

create or replace function public.respond_appointment_confirmation_link(p_token_hash text,p_decision text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp'
as $fn$
declare
  v_link public.appointment_confirmation_links%rowtype;
  v_appointment public.patient_appointments%rowtype;
  v_name text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
    then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_decision not in ('comparecera','nao_comparecera')
    then return jsonb_build_object('success',false,'reason','invalid'); end if;
  select * into v_link from public.appointment_confirmation_links
    where token_hash=p_token_hash for update;
  if not found or v_link.revoked_at is not null or v_link.expires_at<clock_timestamp()
    then return jsonb_build_object('success',false,'reason','expired'); end if;
  if v_link.decision is not null then
    return jsonb_build_object('success',v_link.decision=p_decision,'decision',v_link.decision,'already_recorded',true);
  end if;
  select * into v_appointment from public.patient_appointments where id=v_link.appointment_id for update;
  if not found or v_appointment.attendance_status<>'agendado'
    or v_appointment.appointment_date<=clock_timestamp() then
    return jsonb_build_object('success',false,'reason','appointment_unavailable');
  end if;
  update public.appointment_confirmation_links
    set decision=p_decision,responded_at=clock_timestamp()
    where id=v_link.id;
  if p_decision='nao_comparecera' then
    update public.patient_appointments
      set attendance_status='cancelado',
          attendance_reason='Paciente informou que não poderá comparecer pelo link individual; remarcação administrativa solicitada.',
          attendance_updated_at=clock_timestamp(),attendance_updated_by=null,updated_at=clock_timestamp()
      where id=v_appointment.id;
    select full_name into v_name from public.patients where id=v_appointment.patient_id;
    insert into public.notifications(notification_type,title,message,target_role,priority,status,patient_id,entity_type,entity_id)
      values ('appointment_patient_reschedule','Remarcação solicitada pelo paciente',
        format('%s informou que não poderá comparecer à consulta. Horário liberado; providenciar remarcação manual.',coalesce(v_name,'Paciente')),
        'administrativo_operacional','alta','pendente',v_appointment.patient_id,'patient_appointments',v_appointment.id);
  end if;
  update public.notifications set status='resolvida',resolved_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp())
    where notification_type='appointment_confirmation_unanswered'
      and entity_type='patient_appointments' and entity_id=v_appointment.id and resolved_at is null;
  return jsonb_build_object('success',true,'decision',p_decision,'appointment_released',p_decision='nao_comparecera');
end;
$fn$;
revoke all on function public.respond_appointment_confirmation_link(text,text) from public,anon,authenticated;
grant execute on function public.respond_appointment_confirmation_link(text,text) to service_role;

-- Só notifica; nunca altera o agendamento por falta de resposta.
create or replace function public.capo_notify_unanswered_confirmation_links()
returns integer language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp'
as $fn$
declare
  v_row record;
  v_count integer:=0;
begin
  for v_row in
    select l.id,l.appointment_id,a.patient_id,pt.full_name
    from public.appointment_confirmation_links l
    join public.patient_appointments a on a.id=l.appointment_id
    join public.patients pt on pt.id=a.patient_id
    where l.decision is null and l.revoked_at is null and l.no_response_alert_at is null
      and l.issued_at<=clock_timestamp()-interval '1 hour'
      and a.attendance_status='agendado'
      and a.appointment_date>clock_timestamp()
      and a.appointment_date<=clock_timestamp()+interval '24 hours'
      and not exists (select 1 from public.notifications n
         where n.notification_type='appointment_confirmation_unanswered'
           and n.entity_type='patient_appointments' and n.entity_id=a.id)
    for update of l skip locked
  loop
    insert into public.notifications(notification_type,title,message,target_role,priority,status,patient_id,entity_type,entity_id)
    values ('appointment_confirmation_unanswered','Consulta aguardando confirmação',
      format('%s ainda não respondeu ao lembrete. Contate o paciente; o agendamento segue reservado.',v_row.full_name),
      'administrativo_operacional','normal','pendente',v_row.patient_id,'patient_appointments',v_row.appointment_id);
    update public.appointment_confirmation_links set no_response_alert_at=clock_timestamp() where id=v_row.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$fn$;
revoke all on function public.capo_notify_unanswered_confirmation_links() from public,anon,authenticated;

-- Agendamento periódico, independente de acessos à tela inicial.
create extension if not exists pg_cron with schema pg_catalog;
do $cron_job$
begin
  if not exists(select 1 from cron.job where jobname='capo-notificar-confirmacoes-sem-resposta') then
    perform cron.schedule('capo-notificar-confirmacoes-sem-resposta','*/15 * * * *',
      'select public.capo_notify_unanswered_confirmation_links()');
  end if;
end;
$cron_job$;
