-- CAPO 18/11/2026: bloqueio geral independente dos intervalos recorrentes e visita domiciliar.
-- Preservar contratos, autorização, remanejamento e isolamento lógico em ambas as RPCs.
CREATE OR REPLACE FUNCTION public.create_agenda_period_for_interface(p_professional_id uuid, p_start_date date, p_end_date date, p_start_time time without time zone, p_end_time time without time zone, p_entry_type text, p_description text, p_reschedule_instructions text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_own_professional_id uuid;
  v_is_admin boolean;
  v_plan jsonb := '[]'::jsonb;
  v_row jsonb;
  v_date date;
  v_start time;
  v_end time;
  v_type text;
  v_result jsonb;
  v_count integer := 0;
  v_affected jsonb := '[]'::jsonb;
  v_affected_total integer := 0;
  v_conflicts integer := 0;
  v_config_count integer;
  v_config_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(), false) THEN
    RAISE EXCEPTION 'Sessão ou termo vigente inválido.' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_accounts WHERE auth_user_id=auth.uid() AND is_active=true) THEN
    RAISE EXCEPTION 'Conta ativa não localizada.' USING ERRCODE='42501';
  END IF;
  SELECT public.capo_effective_professional_id() INTO v_own_professional_id;
  v_is_admin := public.has_app_role('administrador');
  IF NOT (v_is_admin OR (public.has_app_role('profissional') AND v_own_professional_id=p_professional_id)) THEN
    RAISE EXCEPTION 'Sem autorização para alterar esta agenda.' USING ERRCODE='42501';
  END IF;
  IF p_professional_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL
      OR p_end_date<p_start_date OR p_end_date-p_start_date>366 THEN
    RAISE EXCEPTION 'Informe datas válidas, em um período máximo de 367 dias.' USING ERRCODE='22023';
  END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time<=p_start_time THEN
    RAISE EXCEPTION 'Período de horário inválido.' USING ERRCODE='22023';
  END IF;
  IF length(btrim(coalesce(p_description,'')))<5 THEN
    RAISE EXCEPTION 'A justificativa operacional deve ter ao menos cinco caracteres.' USING ERRCODE='22023';
  END IF;
  IF p_entry_type NOT IN ('bloqueio','alimentacao','intervalo','reuniao','atividade','relatorio',
                          'excecao','horario_provisorio','urgencia') THEN
    RAISE EXCEPTION 'Tipo de ajuste inválido.' USING ERRCODE='22023';
  END IF;

  if not private.capo_professional_visible_in_current_context(p_professional_id) then
    raise exception 'Profissional fora do ambiente autorizado.' using errcode='42501';
  end if;

  -- Serialização por profissional: planejamento e gravação no mesmo comando.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('agenda-period:' || p_professional_id::text,0));

  -- Seleção automática de configurações efetivas, respeitando dias semanais e vigências.
  FOR v_date IN SELECT gs::date FROM pg_catalog.generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') AS gs LOOP
    SELECT count(*) INTO v_config_count FROM public.agenda_configs ac
      JOIN public.agenda_weekdays aw ON aw.agenda_config_id=ac.id AND aw.is_active
      WHERE ac.professional_id=p_professional_id AND ac.is_active
        AND ac.start_date<=v_date AND (ac.end_date IS NULL OR ac.end_date>=v_date)
        AND aw.weekday=extract(dow from v_date)::integer
        AND (p_entry_type IN ('excecao','horario_provisorio','urgencia')
             OR (ac.start_time<p_end_time AND ac.end_time>p_start_time));
    IF v_config_count>1 AND p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN
      RETURN jsonb_build_object('success',false,'requires_configuration_review',true,
        'message','Há mais de uma grade vigente para '||to_char(v_date,'DD/MM/YYYY')||
        '. Ajustes excepcionais de horário exigem revisão específica para evitar substituir grades simultâneas.');
    END IF;
    FOR v_config_id,v_start,v_end IN
      SELECT ac.id,
          CASE WHEN p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN p_start_time
               ELSE greatest(ac.start_time,p_start_time) END,
          CASE WHEN p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN p_end_time
               ELSE least(ac.end_time,p_end_time) END
      FROM public.agenda_configs ac
      JOIN public.agenda_weekdays aw ON aw.agenda_config_id=ac.id AND aw.is_active
      WHERE ac.professional_id=p_professional_id AND ac.is_active
        AND ac.start_date<=v_date AND (ac.end_date IS NULL OR ac.end_date>=v_date)
        AND aw.weekday=extract(dow from v_date)::integer
        AND (p_entry_type IN ('excecao','horario_provisorio','urgencia')
             OR (ac.start_time<p_end_time AND ac.end_time>p_start_time))
      ORDER BY ac.start_date DESC, ac.created_at DESC, ac.id
    LOOP
      v_plan := v_plan || jsonb_build_array(jsonb_build_object(
        'config_id',v_config_id,'date',v_date,'start',v_start,'end',v_end));
    END LOOP;
  END LOOP;
  IF jsonb_array_length(v_plan)=0 THEN
    RETURN jsonb_build_object('success',false,'message',
      'Nenhum dia e horário de atendimento do profissional corresponde ao período informado.');
  END IF;

  -- Grades simultâneas não podem gerar bloqueios duplicados.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_plan) a
    JOIN jsonb_array_elements(v_plan) b
      ON a.value->>'date'=b.value->>'date'
     AND a.value->>'config_id'<>b.value->>'config_id'
     AND (a.value->>'start')::time<(b.value->>'end')::time
     AND (a.value->>'end')::time>(b.value->>'start')::time
  ) THEN
    RETURN jsonb_build_object('success',false,'requires_configuration_review',true,
      'message','Há grades simultâneas com horários sobrepostos. Revise os padrões; nenhuma data foi gravada.');
  END IF;

  -- Confere TODAS as ocorrências ANTES de gravar qualquer uma.
  FOR v_row IN SELECT value FROM jsonb_array_elements(v_plan) LOOP
    v_date := (v_row->>'date')::date;
    v_config_id := (v_row->>'config_id')::uuid;
    v_start := (v_row->>'start')::time;
    v_end := (v_row->>'end')::time;
    SELECT count(*) INTO v_conflicts
    FROM public.agenda_blocks ab JOIN public.agenda_configs ac ON ac.id=ab.agenda_config_id
    WHERE ac.professional_id=p_professional_id AND ab.is_active
      AND (ab.specific_date=v_date OR ab.weekday=extract(dow from v_date)::integer)
      AND ab.start_time<v_end AND ab.end_time>v_start
       AND (p_entry_type <> 'bloqueio' OR ab.block_type NOT IN ('intervalo','alimentacao','estudo_caso','atendimento_online','rotina_administrativa'));
    IF v_conflicts>0 THEN
      RETURN jsonb_build_object('success',false,'requires_overlap_review',true,
       'message','Existe outro bloqueio incompatível com o período em '||
          to_char(v_date,'DD/MM/YYYY')||'. Nenhum dia foi gravado.');
    END IF;
    IF p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN
      SELECT count(*) INTO v_conflicts FROM public.agenda_exceptions ae
      JOIN public.agenda_configs ac ON ac.id=ae.agenda_config_id
      WHERE ac.professional_id=p_professional_id AND ae.is_active AND ae.exception_date=v_date
       AND ((ae.start_time IS NULL OR ae.end_time IS NULL) OR
            (ae.start_time<v_end AND ae.end_time>v_start) OR
            (p_entry_type='horario_provisorio' AND ae.exception_type='alteracao_horario'));
      IF v_conflicts>0 THEN
        RETURN jsonb_build_object('success',false,'requires_overlap_review',true,
          'message','Existe uma exceção de agenda em '||to_char(v_date,'DD/MM/YYYY')||
          '. Revise o período; nenhum dia foi gravado.');
      END IF;
    END IF;
    IF p_entry_type <> 'urgencia' THEN
      SELECT count(*) INTO v_count FROM (
        SELECT pa.appointment_date,pa.appointment_end
          FROM public.patient_appointments pa
         WHERE pa.professional_id=p_professional_id
           AND lower(coalesce(pa.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada')
        UNION ALL
        SELECT fa.appointment_date,fa.appointment_end
          FROM public.family_psychology_appointments fa
         WHERE fa.professional_id=p_professional_id
           AND lower(coalesce(fa.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada')
      ) ap
      WHERE (ap.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=v_date
        AND (
          (ap.appointment_date AT TIME ZONE 'America/Sao_Paulo')::time<v_end
          AND (ap.appointment_end AT TIME ZONE 'America/Sao_Paulo')::time>v_start
          OR (p_entry_type='horario_provisorio')
        );
      IF v_count>0 THEN
        v_affected_total:=v_affected_total+v_count;
        v_affected:=v_affected || jsonb_build_array(jsonb_build_object('date',v_date,'count',v_count,'config_id',v_config_id,'start_time',v_start,'end_time',v_end));
      END IF;
    END IF;
  END LOOP;
  IF v_affected_total>0 THEN
    RETURN jsonb_build_object('success',false,'requires_remanejamento',true,
      'affected_appointments',v_affected_total,'affected_dates',v_affected,
      'message','Nenhum bloqueio foi gravado. Remaneje todas as consultas afetadas antes de aplicar o período.');
  END IF;

  -- Reutiliza as RPCs tradicionais, numa só transação; qualquer falha cancela TODAS.
  v_count:=0;
  FOR v_row IN SELECT value FROM jsonb_array_elements(v_plan) LOOP
    v_config_id := (v_row->>'config_id')::uuid;
    v_date := (v_row->>'date')::date;
    v_start := (v_row->>'start')::time;
    v_end := (v_row->>'end')::time;
    IF p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN
      v_type := CASE p_entry_type WHEN 'horario_provisorio' THEN 'alteracao_horario'
           WHEN 'urgencia' THEN 'atendimento_extra' ELSE 'bloqueio' END;
      v_result := public.create_agenda_exception_for_interface(v_config_id,v_date,v_type,
                v_start,v_end,p_description,false);
    ELSE
      v_result := public.create_agenda_block_for_interface(v_config_id,NULL,v_date,
        v_start,v_end,p_entry_type,p_description,(p_entry_type='bloqueio'),false,p_reschedule_instructions);
    END IF;
    IF coalesce((v_result->>'success')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Alteração integral cancelada em %: %',v_date,
        coalesce(v_result->>'message','Conflito de gravação');
    END IF;
    v_count:=v_count+1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'created_count',v_count,
     'message','Alterações registradas nas datas válidas da agenda. Dias sem atendimento foram ignorados.');
END;
$function$;

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
    where p.status='ativo' and private.capo_professional_visible_in_current_context(p.id)
      and p.is_professional=true
      and (
        (p_professional_id is not null and p.id=p_professional_id)
        or
        (p_professional_id is null and (
          (v_general_access and private.capo_professional_visible_in_current_context(p.id))
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
        when pa.id is not null or fa.id is not null then 'agendado'
        else 'livre'
      end slot_status,
      coalesce(pa.id, fa.id) appointment_id,
      pa.patient_id,
      case when pa.id is not null then pt.full_name
           when fa.id is not null then fm.full_name
           else null end patient_name,
      case when fa.id is not null then 'Familiar/Cuidador — Psicologia'
           else pa.appointment_type end appointment_type,
      null::text block_type
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
    left join lateral (
      select f.id, f.family_member_id
      from public.family_psychology_appointments f
      where f.professional_id=e.professional_id
        and lower(coalesce(f.attendance_status,'')) not in ('cancelado','cancelada','remarcado','remarcada')
        and f.appointment_date<e.slot_end_tz
        and f.appointment_end>e.slot_start_tz
      order by f.appointment_date
      limit 1
    ) fa on pa.id is null
    left join public.family_members fm on fm.id=fa.family_member_id
  ),
  dated_block_rows as (
    -- Bloqueios pontuais anteriores vinculados a configuração incorreta
    -- continuam visíveis na data real, sem duplicar linhas já renderizadas.
    select
      ps.id professional_id, ps.full_name professional_name,
      ab.specific_date slot_date,
      extract(dow from ab.specific_date)::integer weekday,
      ((ab.specific_date+ab.start_time)::timestamp at time zone 'America/Sao_Paulo') slot_start,
      ((ab.specific_date+ab.end_time)::timestamp at time zone 'America/Sao_Paulo') slot_end,
      greatest(1,round(extract(epoch from (ab.end_time-ab.start_time))/60.0)::integer) duration_minutes,
      'bloqueado'::text slot_status,
      null::uuid appointment_id,
      null::uuid patient_id,
      null::text patient_name,
      null::text appointment_type,
      ab.block_type
    from professionals_scope ps
    join public.agenda_configs ac on ac.professional_id=ps.id
    join public.agenda_blocks ab on ab.agenda_config_id=ac.id
    where ab.is_active=true
      and ab.specific_date between p_start_date and p_end_date
      and ab.end_time>ab.start_time
      and not exists (
        select 1 from recurring_blockers rb where rb.block_id=ab.id
      )
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
    union all
    select * from dated_block_rows
  ) r
  order by r.slot_date,r.professional_name,r.slot_start;
end;
$function$;
