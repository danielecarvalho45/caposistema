-- CAPO: refinamento atômico da substituição por data, para grades múltiplas.
-- Não altera a função da visita domiciliar ou a proteção de remanejamento.
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

  -- Substitui de uma vez os bloqueios gerais pontuais anteriores nas datas
  -- planejadas, antes de criar as novas ocorrências. Preserva histórico inativo.
  -- Uma falha em qualquer gravação faz rollback também destas desativações.
  IF p_entry_type='bloqueio' THEN
    UPDATE public.agenda_blocks ab
       SET is_active=false,updated_at=clock_timestamp()
      FROM public.agenda_configs ac
     WHERE ac.id=ab.agenda_config_id
       AND ac.professional_id=p_professional_id
       AND ab.is_active=true AND ab.block_type='bloqueio'
       AND ab.specific_date IN (
         SELECT DISTINCT (planned.value->>'date')::date
         FROM jsonb_array_elements(v_plan) planned
       );
    GET DIAGNOSTICS v_replaced_rows = ROW_COUNT;
    v_replaced_count:=v_replaced_rows;
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
     'replaced_count',v_replaced_count,
     'message','Alterações registradas nas datas válidas da agenda. Dias sem atendimento foram ignorados.');
END;
$function$;
