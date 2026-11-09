-- CAPO §28.216: identificação exata de consultas afetadas por bloqueio.
-- Leitura autorizada, sem revelar conteúdo clínico.
create or replace function public.get_agenda_block_affected_for_interface(
  p_agenda_config_id uuid, p_date date, p_start_time time, p_end_time time
) returns table (
  appointment_id uuid, appointment_kind text, person_id uuid,
  person_name text, professional_id uuid,
  appointment_date timestamptz, appointment_end timestamptz
) language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_own_professional_id uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo vigente inválido.' using errcode='42501';
  end if;
  select ac.professional_id into v_professional_id
    from public.agenda_configs ac where ac.id=p_agenda_config_id and ac.is_active=true;
  if v_professional_id is null then raise exception 'Agenda não encontrada.' using errcode='22023'; end if;
  select public.capo_effective_professional_id() into v_own_professional_id;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')
      or public.has_app_role('coordenador')
      or (public.has_app_role('profissional') and v_own_professional_id=v_professional_id)) then
    raise exception 'Sem acesso à agenda.' using errcode='42501';
  end if;
  if p_date is null or p_start_time is null or p_end_time is null or p_end_time<=p_start_time then
    raise exception 'Período inválido.' using errcode='22023';
  end if;
  return query
    select pa.id, 'paciente'::text, pa.patient_id, p.full_name, pa.professional_id,
           pa.appointment_date,pa.appointment_end
      from public.patient_appointments pa join public.patients p on p.id=pa.patient_id
     where pa.professional_id=v_professional_id
       and lower(coalesce(pa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
       and (pa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
       and (pa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
       and (pa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time
    union all
    select fa.id, 'familiar'::text, fa.family_member_id, fm.full_name, fa.professional_id,
           fa.appointment_date,fa.appointment_end
      from public.family_psychology_appointments fa
      join public.family_members fm on fm.id=fa.family_member_id
     where fa.professional_id=v_professional_id
       and lower(coalesce(fa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
       and (fa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time;
end;
$function$;

revoke all on function public.get_agenda_block_affected_for_interface(uuid,date,time,time) from public, anon;
grant execute on function public.get_agenda_block_affected_for_interface(uuid,date,time,time) to authenticated;

-- Remarcação de familiar: operação administrativa atômica, com histórico original.
create or replace function public.reschedule_family_psychology_appointment_for_interface(
  p_appointment_id uuid, p_new_professional_id uuid,
  p_new_slot_start timestamptz, p_reason text default null
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_old public.family_psychology_appointments%rowtype;
  v_slot_end timestamptz;
  v_new_id uuid;
  v_account_id uuid;
  v_ineligible uuid;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo vigente inválido.' using errcode='42501';
  end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Remarcação de familiar é atribuição administrativa.' using errcode='42501';
  end if;
  select ua.id into v_account_id from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
  if char_length(coalesce(v_reason,''))>500 then raise exception 'Motivo muito longo.' using errcode='22023'; end if;
  select * into v_old from public.family_psychology_appointments
    where id=p_appointment_id for update;
  if v_old.id is null or lower(coalesce(v_old.attendance_status,'')) not in ('agendado','confirmado') then
    raise exception 'Consulta familiar não está disponível para remarcação.' using errcode='22023';
  end if;
  perform public.capo_assert_patient_write_context(v_old.source_patient_id);
  if not exists (
    select 1 from public.professionals pr
    join public.professional_specialties ps on ps.professional_id=pr.id
    where pr.id=p_new_professional_id and pr.status='ativo'
      and pr.is_professional=true and ps.specialty_id=v_old.specialty_id
  ) then raise exception 'Profissional incompatível.' using errcode='22023'; end if;
  v_ineligible:=public.capo_family_psychology_ineligible_professional(v_old.family_link_id);
  if v_ineligible is not null and v_ineligible=p_new_professional_id then
    raise exception 'Familiar não pode atender com o psicólogo do paciente de origem.' using errcode='42501';
  end if;
  select s.slot_end into v_slot_end from public.get_available_appointment_slots(
    p_new_professional_id,(p_new_slot_start at time zone 'America/Sao_Paulo')::date
  ) s where s.slot_start=p_new_slot_start limit 1;
  if v_slot_end is null then raise exception 'Horário indisponível.' using errcode='22023'; end if;
  insert into public.family_psychology_appointments (
    waiting_list_id,family_link_id,family_member_id,source_patient_id,
    professional_id,specialty_id,appointment_date,appointment_end,
    attendance_status,general_notes,created_by,rescheduled_from_id,reschedule_reason
  ) values (
    v_old.waiting_list_id,v_old.family_link_id,v_old.family_member_id,v_old.source_patient_id,
    p_new_professional_id,v_old.specialty_id,p_new_slot_start,v_slot_end,
    'agendado',v_old.general_notes,v_account_id,v_old.id,v_reason
  ) returning id into v_new_id;
  update public.family_psychology_appointments
     set attendance_status='remarcado',updated_at=clock_timestamp() where id=v_old.id;
  update public.family_psychology_waiting_list
     set scheduled_appointment_id=v_new_id,updated_at=clock_timestamp()
   where id=v_old.waiting_list_id and scheduled_appointment_id=v_old.id;
  return jsonb_build_object('success',true,'previous_appointment_id',v_old.id,
    'new_appointment_id',v_new_id,'new_professional_id',p_new_professional_id,
    'new_slot_start',p_new_slot_start);
end;
$function$;

revoke all on function public.reschedule_family_psychology_appointment_for_interface(uuid,uuid,timestamptz,text) from public, anon;
grant execute on function public.reschedule_family_psychology_appointment_for_interface(uuid,uuid,timestamptz,text) to authenticated;
