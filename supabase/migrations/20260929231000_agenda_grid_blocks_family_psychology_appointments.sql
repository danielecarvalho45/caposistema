CREATE OR REPLACE FUNCTION public.get_agenda_schedule_grid_for_interface(p_start_date date, p_end_date date, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(professional_id uuid, professional_name text, slot_date date, weekday integer, slot_start timestamp with time zone, slot_end timestamp with time zone, duration_minutes integer, slot_status text, appointment_id uuid, patient_id uuid, patient_name text, appointment_type text, block_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
      join public.agenda_weekdays aw
        on aw.agenda_config_id=ac.id
       and aw.is_active=true
       and aw.weekday=extract(dow from d.d)::integer
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
      ),ec.base_end_time) window_end
    from effective_config ec
  ),
  windows as (
    select
      bw.professional_id,bw.professional_name,bw.slot_date,bw.agenda_config_id,
      bw.appointment_duration_minutes,bw.window_start,bw.window_end
    from base_windows bw
    where bw.window_end>bw.window_start

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
  recurring_blockers as (
    select
      w.professional_id,
      w.professional_name,
      w.slot_date,
      w.agenda_config_id,
      w.appointment_duration_minutes,
      w.window_start,
      w.window_end,
      greatest(ab.start_time,w.window_start) block_start,
      least(ab.end_time,w.window_end) block_end,
      ab.block_type
    from windows w
    join public.agenda_blocks ab
      on ab.agenda_config_id=w.agenda_config_id
     and ab.is_active=true
     and (
       ab.specific_date=w.slot_date
       or (
         ab.specific_date is null
         and ab.weekday=extract(dow from w.slot_date)::integer
       )
     )
     and ab.end_time>w.window_start
     and ab.start_time<w.window_end
  ),
  segment_starts as (
    select
      w.professional_id,w.professional_name,w.slot_date,w.agenda_config_id,
      w.appointment_duration_minutes,w.window_start,w.window_end,
      w.window_start segment_start
    from windows w

    union

    select
      w.professional_id,w.professional_name,w.slot_date,w.agenda_config_id,
      w.appointment_duration_minutes,w.window_start,w.window_end,
      rb.block_end segment_start
    from windows w
    join recurring_blockers rb
      on rb.professional_id=w.professional_id
     and rb.slot_date=w.slot_date
     and rb.agenda_config_id=w.agenda_config_id
     and rb.block_end<w.window_end
  ),
  free_segments as (
    select
      s.professional_id,s.professional_name,s.slot_date,s.agenda_config_id,
      s.appointment_duration_minutes,s.segment_start,
      least(
        s.window_end,
        coalesce((
          select min(rb.block_start)
          from recurring_blockers rb
          where rb.professional_id=s.professional_id
            and rb.slot_date=s.slot_date
            and rb.agenda_config_id=s.agenda_config_id
            and rb.block_start>=s.segment_start
        ),s.window_end)
      ) segment_end
    from segment_starts s
    where not exists(
      select 1
      from recurring_blockers rb
      where rb.professional_id=s.professional_id
        and rb.slot_date=s.slot_date
        and rb.agenda_config_id=s.agenda_config_id
        and s.segment_start>=rb.block_start
        and s.segment_start<rb.block_end
    )
  ),
  generated as (
    select
      fs.professional_id,fs.professional_name,fs.slot_date,fs.agenda_config_id,
      fs.appointment_duration_minutes,
      gs.slot_local,
      gs.slot_local+make_interval(mins=>fs.appointment_duration_minutes) slot_local_end
    from free_segments fs
    cross join lateral generate_series(
      (fs.slot_date+fs.segment_start)::timestamp,
      (fs.slot_date+fs.segment_end)::timestamp-make_interval(mins=>fs.appointment_duration_minutes),
      make_interval(mins=>fs.appointment_duration_minutes)
    ) gs(slot_local)
    where fs.segment_end>fs.segment_start
      and (fs.segment_start+make_interval(mins=>fs.appointment_duration_minutes))::time<=fs.segment_end
  ),
  enriched as (
    select
      g.*,
      g.slot_local at time zone 'America/Sao_Paulo' slot_start_tz,
      g.slot_local_end at time zone 'America/Sao_Paulo' slot_end_tz,
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
  ),
  normal_rows as (
    select
      e.professional_id,
      e.professional_name,
      e.slot_date,
      extract(dow from e.slot_date)::integer weekday,
      e.slot_start_tz slot_start,
      e.slot_end_tz slot_end,
      e.appointment_duration_minutes duration_minutes,
      case
        when e.exception_blocked then 'bloqueado'
        when pa.id is not null then 'agendado'
        when fa.id is not null then 'bloqueado'
        else 'livre'
      end slot_status,
      pa.id appointment_id,
      pa.patient_id,
      pt.full_name patient_name,
      pa.appointment_type,
      case when fa.id is not null then 'atendimento_familiar_psicologia' else null::text end block_type
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
    left join lateral (
      select fa.*
      from public.family_psychology_appointments fa
      where pa.id is null
        and fa.professional_id=e.professional_id
        and lower(coalesce(fa.attendance_status,'')) not in ('cancelado','cancelada','remarcado','remarcada')
        and fa.appointment_date<e.slot_end_tz
        and fa.appointment_end>e.slot_start_tz
      order by fa.appointment_date
      limit 1
    ) fa on true
    left join public.patients pt
      on pt.id=pa.patient_id
     and public.capo_patient_visible_in_current_context(pt.id)
  ),
  block_rows as (
    select
      rb.professional_id,
      rb.professional_name,
      rb.slot_date,
      extract(dow from rb.slot_date)::integer weekday,
      ((rb.slot_date+rb.block_start)::timestamp at time zone 'America/Sao_Paulo') slot_start,
      ((rb.slot_date+rb.block_end)::timestamp at time zone 'America/Sao_Paulo') slot_end,
      greatest(
        1,
        round(extract(epoch from (rb.block_end-rb.block_start))/60.0)::integer
      ) duration_minutes,
      'bloqueado'::text slot_status,
      null::uuid appointment_id,
      null::uuid patient_id,
      null::text patient_name,
      null::text appointment_type,
      rb.block_type
    from recurring_blockers rb
    where rb.block_end>rb.block_start
  )
  select r.*
  from (
    select * from normal_rows
    union all
    select * from block_rows
  ) r
  order by r.slot_date,r.professional_name,r.slot_start;
end;
$function$

