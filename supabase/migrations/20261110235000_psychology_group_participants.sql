-- CAPO: vagas coletivas vinculadas ao agendamento individual oficial.
-- Nenhuma agenda existente é migrada ou convertida automaticamente.
alter table public.patient_appointments
  add column if not exists psychology_group_block_id uuid
    references public.psychology_group_schedule_blocks(id) on delete restrict;

create index if not exists idx_capo_group_participants
  on public.patient_appointments(psychology_group_block_id,appointment_date)
  where psychology_group_block_id is not null;

create or replace function public.capo_prevent_professional_overlap()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp' as $$
declare
  v_group public.psychology_group_schedule_blocks%rowtype;
  v_block public.agenda_blocks%rowtype;
  v_config public.agenda_configs%rowtype;
  v_date date;
  v_count integer;
begin
  if lower(coalesce(new.attendance_status,'')) in ('cancelado','cancelada','remarcado','remarcada') then
    return new;
  end if;
  v_date := (new.appointment_date at time zone 'America/Sao_Paulo')::date;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.professional_id::text||':'||v_date::text,0));

  if new.psychology_group_block_id is not null then
    select * into v_group from public.psychology_group_schedule_blocks
      where id=new.psychology_group_block_id and is_active for update;
    if not found then raise exception 'Grupo de Psicologia indisponível.'; end if;
    select * into v_block from public.agenda_blocks
      where id=v_group.agenda_block_id and is_active;
    select * into v_config from public.agenda_configs
      where id=v_group.agenda_config_id and is_active;
    if v_config.id is null or v_block.id is null
      or v_config.professional_id<>new.professional_id
      or v_date<v_config.start_date
      or (v_config.end_date is not null and v_date>v_config.end_date)
      or v_block.weekday<>extract(dow from v_date)::integer
      or new.appointment_type<>'grupo'
      or new.appointment_date<>((v_date+v_block.start_time) at time zone 'America/Sao_Paulo')
      or new.appointment_end<>((v_date+v_block.end_time) at time zone 'America/Sao_Paulo')
    then raise exception 'Participação fora do período do grupo.'; end if;
    if exists(select 1 from public.agenda_exceptions e
      where e.agenda_config_id=v_config.id and e.exception_date=v_date and e.is_active
        and e.exception_type in ('cancelamento','bloqueio','feriado')
        and (e.start_time is null or
          (e.start_time<v_block.end_time and e.end_time>v_block.start_time)))
    then raise exception 'Sessão coletiva bloqueada nesta data.'; end if;
    select count(*) into v_count from public.patient_appointments pa
      where pa.psychology_group_block_id=new.psychology_group_block_id
        and pa.appointment_date=new.appointment_date and pa.id<>new.id
        and lower(coalesce(pa.attendance_status,'')) not in
          ('cancelado','cancelada','remarcado','remarcada');
    if v_count>=v_group.capacity then
      raise exception 'Grupo lotado: todas as % vagas estão ocupadas.',v_group.capacity;
    end if;
  end if;

  if exists(select 1 from public.patient_appointments pa
    where pa.professional_id=new.professional_id and pa.id<>new.id
      and lower(coalesce(pa.attendance_status,'')) not in
        ('cancelado','cancelada','remarcado','remarcada')
      and pa.appointment_date<new.appointment_end
      and pa.appointment_end>new.appointment_date
      and (new.psychology_group_block_id is null
        or pa.psychology_group_block_id is distinct from new.psychology_group_block_id
        or pa.appointment_date<>new.appointment_date))
  then raise exception 'Este horário já está ocupado na agenda do profissional.'; end if;

  if exists(select 1 from public.family_psychology_appointments fa
    where fa.professional_id=new.professional_id
      and lower(coalesce(fa.attendance_status,'')) not in
        ('cancelado','cancelada','remarcado','remarcada')
      and fa.appointment_date<new.appointment_end
      and fa.appointment_end>new.appointment_date)
  then raise exception 'Este horário já está ocupado na agenda do profissional.'; end if;
  return new;
end;
$$;

create or replace function public.get_psychology_group_sessions_for_interface(
  p_professional_id uuid,p_start_date date,p_end_date date
) returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp' as $$
declare v_own uuid; v_general boolean;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    then raise exception 'Sessão não autorizada.' using errcode='42501'; end if;
  if p_professional_id is null or p_start_date is null or p_end_date is null
    or p_end_date<p_start_date or p_end_date-p_start_date>62
    then raise exception 'Consulta de grupos inválida.'; end if;
  v_own:=public.capo_effective_professional_id();
  v_general:=public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  if not (v_general or (public.has_app_role('profissional') and v_own=p_professional_id))
    then raise exception 'Acesso à agenda não autorizado.' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'group_id',g.id,'name',g.group_name,'capacity',g.capacity,
      'date',d.session_date,'start',((d.session_date+b.start_time) at time zone 'America/Sao_Paulo'),
      'end',((d.session_date+b.end_time) at time zone 'America/Sao_Paulo'),
      'participants',coalesce((
        select jsonb_agg(jsonb_build_object(
          'appointment_id',pa.id,'patient_id',pa.patient_id,
          'patient_name',case when public.capo_patient_visible_in_current_context(pa.patient_id)
            then p.full_name else 'Paciente com acesso restrito' end,
          'attendance_status',pa.attendance_status) order by p.full_name)
        from public.patient_appointments pa
        join public.patients p on p.id=pa.patient_id
        where pa.psychology_group_block_id=g.id
          and pa.appointment_date=((d.session_date+b.start_time) at time zone 'America/Sao_Paulo')
          and pa.attendance_status not in ('cancelado','remarcado')
      ),'[]'::jsonb)
    ) order by d.session_date,b.start_time)
    from public.psychology_group_schedule_blocks g
    join public.agenda_configs c on c.id=g.agenda_config_id and c.is_active
    join public.agenda_blocks b on b.id=g.agenda_block_id and b.is_active
    cross join lateral (select gs::date session_date
      from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') gs) d
    where g.is_active and c.professional_id=p_professional_id
      and d.session_date>=c.start_date and (c.end_date is null or d.session_date<=c.end_date)
      and extract(dow from d.session_date)::integer=b.weekday
  ),'[]'::jsonb);
end;
$$;

create or replace function public.book_psychology_group_participant_for_interface(
  p_group_id uuid,p_date date,p_patient_id uuid
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp' as $$
declare
  v_group public.psychology_group_schedule_blocks%rowtype;
  v_config public.agenda_configs%rowtype;
  v_block public.agenda_blocks%rowtype;
  v_account uuid;
  v_cycle uuid;
  v_specialty uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    then raise exception 'Sessão não autorizada.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
    then raise exception 'Somente o setor administrativo agenda participantes.' using errcode='42501'; end if;
  select id into v_account from public.user_accounts
    where auth_user_id=auth.uid() and is_active limit 1;
  if v_account is null then raise exception 'Conta inativa.'; end if;
  if p_date<(now() at time zone 'America/Sao_Paulo')::date
    then raise exception 'Não é permitido agendar no passado.'; end if;
  perform public.capo_assert_patient_write_context(p_patient_id);
  perform 1 from public.patients where id=p_patient_id and status='ativo'
    and deceased=false for update;
  if not found then raise exception 'Paciente indisponível.'; end if;
  select * into v_group from public.psychology_group_schedule_blocks
    where id=p_group_id and is_active;
  if not found then raise exception 'Grupo indisponível.'; end if;
  select * into v_config from public.agenda_configs
    where id=v_group.agenda_config_id and is_active;
  select * into v_block from public.agenda_blocks
    where id=v_group.agenda_block_id and is_active;
  if v_config.id is null or v_block.id is null or p_date<v_config.start_date
    or (v_config.end_date is not null and p_date>v_config.end_date)
    or v_block.weekday<>extract(dow from p_date)::integer
    then raise exception 'Grupo não disponível nesta data.'; end if;
  v_start:=((p_date+v_block.start_time) at time zone 'America/Sao_Paulo');
  v_end:=((p_date+v_block.end_time) at time zone 'America/Sao_Paulo');
  if v_start<=now() then raise exception 'O grupo já começou ou encerrou.'; end if;
  v_specialty:=public.resolve_single_active_professional_specialty(v_config.professional_id);
  select id into v_cycle from public.patient_care_cycles
    where patient_id=p_patient_id and status in ('ativo','encerramento_em_andamento')
    order by cycle_number desc limit 1 for update;
  if v_cycle is null then raise exception 'Paciente sem ciclo CAPO ativo.'; end if;
  perform public.ensure_cycle_specialty(v_cycle,v_specialty,'agenda',null,v_account,v_config.professional_id);
  insert into public.patient_appointments(
    patient_id,professional_id,appointment_date,appointment_end,
    appointment_type,attendance_status,care_cycle_id,specialty_id,
    psychology_group_block_id
  ) values (
    p_patient_id,v_config.professional_id,v_start,v_end,
    'grupo','agendado',v_cycle,v_specialty,p_group_id
  ) returning id into v_id;
  return jsonb_build_object('appointment_id',v_id,'group_id',p_group_id,'success',true);
end;
$$;

revoke all on function public.get_psychology_group_sessions_for_interface(uuid,date,date) from public,anon;
revoke all on function public.book_psychology_group_participant_for_interface(uuid,date,uuid) from public,anon;
grant execute on function public.get_psychology_group_sessions_for_interface(uuid,date,date) to authenticated;
grant execute on function public.book_psychology_group_participant_for_interface(uuid,date,uuid) to authenticated;
