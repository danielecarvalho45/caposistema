-- CAPO 18/11/2026 VERDE: substituição de bloqueio geral e cobertura de Psicologia em grupo.
-- Sem mudar visita domiciliar; períodos anteriores são desativados, não excluídos.
-- Manter remanejamento individual/familiar/grupo e RLS/contexto real-homologação.
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
  v_replaced_count integer := 0;
  v_replaced_rows integer := 0;
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
       AND NOT (p_entry_type='bloqueio' AND (
         ab.block_type IN ('intervalo','alimentacao','estudo_caso','atendimento_online','rotina_administrativa')
         OR (ab.block_type='bloqueio' AND ab.specific_date=v_date)
         OR EXISTS (
           SELECT 1 FROM public.psychology_group_schedule_blocks gr
           WHERE gr.agenda_block_id=ab.id AND gr.is_active=true
         )
       ));
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
    -- Substituição atômica: só os bloqueios gerais pontuais anteriores
    -- que se sobrepõem à nova ocorrência; nenhuma outra data/tipo é tocado.
    IF p_entry_type='bloqueio' THEN
      UPDATE public.agenda_blocks ab
         SET is_active=false,updated_at=clock_timestamp()
        FROM public.agenda_configs ac
       WHERE ac.id=ab.agenda_config_id
         AND ac.professional_id=p_professional_id
         AND ab.is_active=true
         AND ab.block_type='bloqueio'
         AND ab.specific_date=v_date
         AND ab.start_time<v_end AND ab.end_time>v_start;
      GET DIAGNOSTICS v_replaced_rows = ROW_COUNT;
      v_replaced_count:=v_replaced_count+v_replaced_rows;
    END IF;
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
     'replaced_count',v_replaced_count,
     'message','Alterações registradas nas datas válidas da agenda. Dias sem atendimento foram ignorados.');
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_psychology_group_sessions_for_interface(p_professional_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_own uuid; v_general boolean;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    then raise exception 'Sessão não autorizada.' using errcode='42501'; end if;
  if p_professional_id is null or p_start_date is null or p_end_date is null
    or p_end_date<p_start_date or p_end_date-p_start_date>62
    then raise exception 'Consulta de grupos inválida.'; end if;
  IF NOT private.capo_professional_visible_in_current_context(p_professional_id) THEN
    RAISE EXCEPTION 'Profissional fora do ambiente autorizado.' USING ERRCODE='42501';
  END IF;
  v_own:=public.capo_effective_professional_id();
  v_general:=public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  if not (v_general or (public.has_app_role('profissional') and v_own=p_professional_id))
    then raise exception 'Acesso à agenda não autorizado.' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'group_id',g.id,'name',g.group_name,'capacity',g.capacity,
      'date',d.session_date,
      'blocked',EXISTS (
         SELECT 1 FROM public.agenda_blocks ab
         JOIN public.agenda_configs ac2 ON ac2.id=ab.agenda_config_id
         WHERE ac2.professional_id=c.professional_id
           AND ab.is_active=true AND ab.block_type='bloqueio'
           AND ab.specific_date=d.session_date
           AND ab.start_time<b.end_time AND ab.end_time>b.start_time
      ),
      'start',((d.session_date+b.start_time) at time zone 'America/Sao_Paulo'),
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
$function$;
CREATE OR REPLACE FUNCTION public.book_psychology_group_participant_for_interface(p_group_id uuid, p_date date, p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
  IF NOT private.capo_professional_visible_in_current_context(v_config.professional_id) THEN
    RAISE EXCEPTION 'Profissional fora do ambiente autorizado.' USING ERRCODE='42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.agenda_blocks ab
    JOIN public.agenda_configs ac2 ON ac2.id=ab.agenda_config_id
    WHERE ac2.professional_id=v_config.professional_id
      AND ab.is_active=true AND ab.block_type='bloqueio'
      AND ab.specific_date=p_date
      AND ab.start_time<v_block.end_time AND ab.end_time>v_block.start_time
  ) THEN
    RAISE EXCEPTION 'A sessão em grupo está bloqueada nesta data. Remaneje os atendimentos antes de agendar.' USING ERRCODE='22023';
  END IF;
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
$function$;
