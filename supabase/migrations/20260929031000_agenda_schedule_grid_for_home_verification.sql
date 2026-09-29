create or replace function public.get_agenda_schedule_grid_for_interface(
  p_start_date date,
  p_end_date date,
  p_professional_id uuid default null
)
returns table(
  professional_id uuid,
  professional_name text,
  slot_date date,
  weekday integer,
  slot_start timestamptz,
  slot_end timestamptz,
  duration_minutes integer,
  slot_status text,
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  appointment_type text,
  block_type text
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_own_professional_id uuid;
  v_general_access boolean;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date<p_start_date then
    raise exception 'Período da grade de agenda inválido.' using errcode='22023';
  end if;

  if (p_end_date-p_start_date)>62 then
    raise exception 'A consulta da grade está limitada a 62 dias.' using errcode='22023';
  end if;

  select public.capo_effective_professional_id()
    into v_own_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  v_general_access :=
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');

  if not (
    v_general_access
    or (
      public.has_app_role('profissional')
      and v_own_professional_id is not null
      and (p_professional_id is null or p_professional_id=v_own_professional_id)
    )
  ) then
    raise exception 'Perfil sem autorização para consultar esta grade.' using errcode='42501';
  end if;

  return query
  with dates as (
    select gs::date as d
    from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') gs
  ),
  professionals_scope as (
    select p.id,p.full_name
    from public.professionals p
    where p.status='ativo'
      and p.is_professional=true
      and (
        (p_professional_id is not null and p.id=p_professional_id)
        or
        (p_professional_id is null and (
          (v_general_access and public.capo_professional_is_production(p.id))
          or (not v_general_access and p.id=v_own_professional_id)
        ))
      )
  ),
  effective_config as (
    select
      ps.id professional_id,
      ps.full_name professional_name,
      d.d slot_date,
      ac.id agenda_config_id,
      ac.appointment_duration_minutes,
      ac.start_time base_start_time,
      ac.end_time base_end_time
    from professionals_scope ps
    cross join dates d
    join lateral (
      select ac.*
      from public.agenda_configs ac
      where ac.professional_id=ps.id
        and ac.is_active=true
        and ac.start_date<=d.d
        and (ac.end_date is null or ac.end_date>=d.d)
        and ac.appointment_duration_minutes>0
      order by ac.start_date desc,ac.created_at desc
      limit 1
    ) ac on true
  ),
  base_windows as (
    select
      ec.*,
      coalesce((
        select ae.start_time
        from public.agenda_exceptions ae
        where ae.agenda_config_id=ec.agenda_config_id
          and ae.exception_date=ec.slot_date
          and ae.exception_type='alteracao_horario'
          and ae.is_active=true
          and ae.start_time is not null
          and ae.end_time is not null
        order by ae.created_at desc
        limit 1
      ),ec.base_start_time) window_start,
      coalesce((
        select ae.end_time
        from public.agenda_exceptions ae
        where ae.agenda_config_id=ec.agenda_config_id
          and ae.exception_date=ec.slot_date
          and ae.exception_type='alteracao_horario'
          and ae.is_active=true
          and ae.start_time is not null
          and ae.end_time is not null
        order by ae.created_at desc
        limit 1
      ),ec.base_end_time) window_end,
      exists(
        select 1
        from public.agenda_weekdays aw
        where aw.agenda_config_id=ec.agenda_config_id
          and aw.weekday=extract(dow from ec.slot_date)::integer
          and aw.is_active=true
      ) as weekday_enabled
    from effective_config ec
  ),
  windows as (
    select
      bw.professional_id,bw.professional_name,bw.slot_date,bw.agenda_config_id,
      bw.appointment_duration_minutes,bw.window_start,bw.window_end
    from base_windows bw
    where bw.weekday_enabled
      and bw.window_end>bw.window_start

    union all

    select
      ec.professional_id,ec.professional_name,ec.slot_date,ec.agenda_config_id,
      ec.appointment_duration_minutes,ae.start_time,ae.end_time
    from effective_config ec
    join public.agenda_exceptions ae
      on ae.agenda_config_id=ec.agenda_config_id
     and ae.exception_date=ec.slot_date
     and ae.exception_type='atendimento_extra'
     and ae.is_active=true
     and ae.start_time is not null
     and ae.end_time is not null
     and ae.end_time>ae.start_time
  ),
  generated as (
    select
      w.professional_id,w.professional_name,w.slot_date,w.agenda_config_id,
      w.appointment_duration_minutes,
      gs.slot_local,
      gs.slot_local+make_interval(mins=>w.appointment_duration_minutes) slot_local_end
    from windows w
    cross join lateral generate_series(
      (w.slot_date+w.window_start)::timestamp,
      (w.slot_date+w.window_end)::timestamp-make_interval(mins=>w.appointment_duration_minutes),
      make_interval(mins=>w.appointment_duration_minutes)
    ) gs(slot_local)
  ),
  enriched as (
    select
      g.*,
      g.slot_local at time zone 'America/Sao_Paulo' slot_start_tz,
      g.slot_local_end at time zone 'America/Sao_Paulo' slot_end_tz,
      (
        select ab.block_type
        from public.agenda_blocks ab
        where ab.agenda_config_id=g.agenda_config_id
          and ab.is_active=true
          and (
            ab.specific_date=g.slot_date
            or (ab.specific_date is null and ab.weekday=extract(dow from g.slot_date)::integer)
          )
          and g.slot_local::time<ab.end_time
          and g.slot_local_end::time>ab.start_time
        order by ab.created_at desc
        limit 1
      ) as agenda_block_type,
      exists(
        select 1
        from public.agenda_exceptions ae
        where ae.agenda_config_id=g.agenda_config_id
          and ae.exception_date=g.slot_date
          and ae.exception_type in ('cancelamento','bloqueio','feriado')
          and ae.is_active=true
          and (
            (ae.start_time is null and ae.end_time is null)
            or (
              ae.start_time is not null and ae.end_time is not null
              and g.slot_local::time<ae.end_time
              and g.slot_local_end::time>ae.start_time
            )
          )
      ) as exception_blocked
    from generated g
  )
  select
    e.professional_id,
    e.professional_name,
    e.slot_date,
    extract(dow from e.slot_date)::integer,
    e.slot_start_tz,
    e.slot_end_tz,
    e.appointment_duration_minutes,
    case
      when e.agenda_block_type is not null or e.exception_blocked then 'bloqueado'
      when pa.id is not null then 'agendado'
      else 'livre'
    end,
    pa.id,
    pa.patient_id,
    pt.full_name,
    pa.appointment_type,
    e.agenda_block_type
  from enriched e
  left join lateral (
    select pa.*
    from public.patient_appointments pa
    where pa.professional_id=e.professional_id
      and lower(coalesce(pa.attendance_status,'')) not in ('cancelado','cancelada','remarcado','remarcada')
      and pa.appointment_date<e.slot_end_tz
      and pa.appointment_end>e.slot_start_tz
    order by pa.appointment_date
    limit 1
  ) pa on true
  left join public.patients pt
    on pt.id=pa.patient_id
   and public.capo_patient_visible_in_current_context(pt.id)
  order by e.slot_date,e.professional_name,e.slot_start_tz;
end;
$function$;
