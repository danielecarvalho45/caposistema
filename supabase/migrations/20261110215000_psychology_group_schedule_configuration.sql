-- CAPO: configuração opt-in de terapia em grupo; nenhum padrão existente é convertido.
create table if not exists public.psychology_group_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  agenda_config_id uuid not null references public.agenda_configs(id),
  agenda_block_id uuid not null unique references public.agenda_blocks(id),
  group_name text not null check (length(btrim(group_name)) between 3 and 120),
  capacity integer not null check (capacity between 1 and 100),
  schedule_mode text not null check (schedule_mode in ('mista','grupo')),
  is_active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.psychology_group_schedule_blocks enable row level security;
revoke all on public.psychology_group_schedule_blocks from public, anon, authenticated;

create or replace function public.get_psychology_group_schedule_for_interface(p_professional_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public' as $$
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão não autorizada.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Gestão de agenda não autorizada.' using errcode='42501';
  end if;
  return jsonb_build_object('eligible',exists(
    select 1 from public.professional_specialties ps
    join public.specialties s on s.id=ps.specialty_id and s.is_active
    where ps.professional_id=p_professional_id and s.name ilike '%psicolog%'
  ),'groups',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',g.id,'config_id',g.agenda_config_id,'block_id',g.agenda_block_id,
      'group_name',g.group_name,'capacity',g.capacity,'mode',g.schedule_mode,
      'weekday',b.weekday,'start_time',b.start_time,'end_time',b.end_time
    ) order by b.weekday,b.start_time)
    from public.psychology_group_schedule_blocks g
    join public.agenda_configs c on c.id=g.agenda_config_id
    join public.agenda_blocks b on b.id=g.agenda_block_id
    where c.professional_id=p_professional_id and c.is_active and g.is_active and b.is_active
  ),'[]'::jsonb));
end;
$$;

create or replace function public.create_psychology_group_schedule_for_interface(
  p_agenda_config_id uuid, p_weekdays integer[], p_start_time time,
  p_end_time time, p_group_name text, p_capacity integer, p_mode text
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public' as $$
declare
  v_config public.agenda_configs%rowtype;
  v_day integer;
  v_block uuid;
  v_ids uuid[] := '{}';
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão não autorizada.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Titular pode formular a agenda.' using errcode='42501';
  end if;
  select * into v_config from public.agenda_configs where id=p_agenda_config_id and is_active for update;
  if not found then raise exception 'Padrão semanal ativo não localizado.'; end if;
  if not exists (
    select 1 from public.professional_specialties ps
    join public.specialties s on s.id=ps.specialty_id and s.is_active
    where ps.professional_id=v_config.professional_id and s.name ilike '%psicolog%'
  ) then raise exception 'Atendimento em grupo disponível somente para Psicologia.'; end if;
  if length(btrim(coalesce(p_group_name,''))) not between 3 and 120 then
    raise exception 'Informe o nome do grupo (3 a 120 caracteres).'; end if;
  if p_capacity is null or p_capacity not between 1 and 100 then
    raise exception 'Informe a quantidade válida de pacientes.'; end if;
  if p_mode not in ('mista','grupo') then raise exception 'Modalidade inválida.'; end if;
  if p_start_time is null or p_end_time is null or p_end_time<=p_start_time
     or p_start_time<v_config.start_time or p_end_time>v_config.end_time then
    raise exception 'Período coletivo fora dos horários do padrão.'; end if;
  if p_mode='grupo' and (p_start_time<>v_config.start_time or p_end_time<>v_config.end_time) then
    raise exception 'Agenda exclusivamente em grupo deve cobrir todo o turno configurado.'; end if;
  if coalesce(array_length(p_weekdays,1),0)=0
    or exists(select 1 from unnest(p_weekdays)d where d<0 or d>6) then
    raise exception 'Selecione os dias válidos do grupo.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agenda_config_id::text,0));
  foreach v_day in array p_weekdays loop
    if not exists(select 1 from public.agenda_weekdays
                  where agenda_config_id=p_agenda_config_id and weekday=v_day and is_active) then
      raise exception 'O dia do grupo não pertence ao padrão semanal ativo.';
    end if;
    if exists(select 1 from public.agenda_blocks
              where agenda_config_id=p_agenda_config_id and weekday=v_day
                and specific_date is null and is_active
                and start_time<p_end_time and end_time>p_start_time) then
      raise exception 'Há intervalo ou bloqueio recorrente sobreposto ao grupo.';
    end if;
    -- Nunca substituir consultas existentes ao ativar a modalidade coletiva.
    if exists(select 1 from public.patient_appointments pa
      where pa.professional_id=v_config.professional_id
        and pa.appointment_date>=now()
        and pa.attendance_status not in ('cancelado','remarcado')
        and (pa.appointment_date at time zone 'America/Sao_Paulo')::date >= greatest(v_config.start_date,current_date)
        and (v_config.end_date is null or (pa.appointment_date at time zone 'America/Sao_Paulo')::date<=v_config.end_date)
        and extract(dow from pa.appointment_date at time zone 'America/Sao_Paulo')::integer=v_day
        and (pa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
        and (pa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time
    ) or exists(select 1 from public.family_psychology_appointments fa
      where fa.professional_id=v_config.professional_id
        and fa.appointment_date>=now()
        and fa.attendance_status not in ('cancelado','remarcado')
        and (fa.appointment_date at time zone 'America/Sao_Paulo')::date >= greatest(v_config.start_date,current_date)
        and (v_config.end_date is null or (fa.appointment_date at time zone 'America/Sao_Paulo')::date<=v_config.end_date)
        and extract(dow from fa.appointment_date at time zone 'America/Sao_Paulo')::integer=v_day
        and (fa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
        and (fa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time
    ) then raise exception 'Existem pacientes agendados. Remaneje antes de configurar o grupo.'; end if;

    insert into public.agenda_blocks(agenda_config_id,weekday,start_time,end_time,block_type,description,is_active,requires_admin_action)
      values(p_agenda_config_id,v_day,p_start_time,p_end_time,'outro',
             'Terapia em grupo: '||btrim(p_group_name),true,false) returning id into v_block;
    insert into public.psychology_group_schedule_blocks(
      agenda_config_id,agenda_block_id,group_name,capacity,schedule_mode,created_by
    ) values(p_agenda_config_id,v_block,btrim(p_group_name),p_capacity,p_mode,auth.uid());
    v_ids := array_append(v_ids,v_block);
  end loop;
  return jsonb_build_object('success',true,'group_block_ids',v_ids);
end;
$$;

revoke all on function public.get_psychology_group_schedule_for_interface(uuid) from public, anon;
revoke all on function public.create_psychology_group_schedule_for_interface(uuid,integer[],time,time,text,integer,text) from public, anon;
grant execute on function public.get_psychology_group_schedule_for_interface(uuid) to authenticated;
grant execute on function public.create_psychology_group_schedule_for_interface(uuid,integer[],time,time,text,integer,text) to authenticated;
