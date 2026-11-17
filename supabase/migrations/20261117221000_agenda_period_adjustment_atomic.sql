-- CAPO | Ajustes temporários por período, sem alteração das RPCs legadas.
-- Cada chamada é transacional: rejeições posteriores geram RAISE e rollback integral.
CREATE OR REPLACE FUNCTION public.create_agenda_period_adjustment_for_interface(
  p_professional_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_entry_type text,
  p_description text,
  p_reschedule_instructions text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_is_admin boolean;
  v_own uuid;
  v_date date;
  v_cfg record;
  v_from time;
  v_to time;
  v_kind text;
  v_target record;
  v_plan jsonb := '[]'::jsonb;
  v_affected jsonb := '[]'::jsonb;
  v_row jsonb;
  v_result jsonb;
  v_count integer := 0;
  v_count_for_date integer;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(), false)
  THEN RAISE EXCEPTION 'Sessão ou termo vigente inválido.' USING errcode='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_accounts ua
                 WHERE ua.auth_user_id=auth.uid() AND ua.is_active)
  THEN RAISE EXCEPTION 'Conta ativa não localizada.' USING errcode='42501'; END IF;
  v_is_admin := public.has_app_role('administrador');
  v_own := public.capo_effective_professional_id();
  IF NOT v_is_admin AND NOT (public.has_app_role('profissional') AND v_own=p_professional_id)
  THEN RAISE EXCEPTION 'Sem permissão de alteração nesta agenda.' USING errcode='42501'; END IF;
  IF p_professional_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.id=p_professional_id AND p.status='ativo'
  ) THEN RAISE EXCEPTION 'Profissional ativo não encontrado.'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date
    OR p_end_date-p_start_date>90
  THEN RAISE EXCEPTION 'Informe datas válidas, com período máximo de 91 dias.'; END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time<=p_start_time
  THEN RAISE EXCEPTION 'Informe horário inicial e final válidos.'; END IF;
  IF length(btrim(coalesce(p_description,'')))<5
  THEN RAISE EXCEPTION 'Justificativa operacional deve ter pelo menos cinco caracteres.'; END IF;
  IF p_entry_type NOT IN ('bloqueio','alimentacao','intervalo','reuniao',
    'atividade','relatorio','excecao','horario_provisorio','urgencia')
  THEN RAISE EXCEPTION 'Tipo de alteração inválido.'; END IF;
  IF p_entry_type='bloqueio' AND
    lower(translate(coalesce(p_description,''),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
                                               'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) LIKE '%visita domiciliar%'
    AND EXISTS (
      SELECT 1 FROM public.professional_specialties ps
      JOIN public.specialties sp ON sp.id=ps.specialty_id
      WHERE ps.professional_id=p_professional_id AND lower(sp.name) LIKE '%assist%ncia social%'
    )
  THEN RAISE EXCEPTION 'Use Bloquear para Visita Domiciliar; bloqueios comuns e domiciliares são separados.'; END IF;
  v_kind := CASE p_entry_type
    WHEN 'excecao' THEN 'bloqueio'
    WHEN 'horario_provisorio' THEN 'alteracao_horario'
    WHEN 'urgencia' THEN 'atendimento_extra'
    ELSE p_entry_type END;

  -- O lock por profissional evita que dois ajustes do novo fluxo cruzem os mesmos dias.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_professional_id::text, 17));

  FOR v_date IN SELECT gs::date FROM generate_series(p_start_date::timestamp,
                                      p_end_date::timestamp,interval '1 day') gs LOOP
    v_count_for_date := 0;
    FOR v_cfg IN
      SELECT ac.id, ac.start_time, ac.end_time
      FROM public.agenda_configs ac
      JOIN public.agenda_weekdays aw ON aw.agenda_config_id=ac.id
        AND aw.is_active AND aw.weekday=extract(dow from v_date)::integer
      WHERE ac.professional_id=p_professional_id AND ac.is_active
        AND ac.start_date<=v_date AND (ac.end_date IS NULL OR ac.end_date>=v_date)
      ORDER BY ac.start_time, ac.created_at DESC
    LOOP
      IF p_entry_type IN ('horario_provisorio','urgencia') THEN
        -- Preserva a possibilidade legada de horário excepcional fora do turno.
        v_from := p_start_time; v_to := p_end_time;
      ELSE
        -- Bloqueios só incidem na parte efetiva do turno do profissional.
        v_from := greatest(p_start_time,v_cfg.start_time);
        v_to := least(p_end_time,v_cfg.end_time);
        IF v_to<=v_from THEN CONTINUE; END IF;
      END IF;
      v_count_for_date := v_count_for_date+1;
      IF p_entry_type IN ('horario_provisorio','urgencia') AND v_count_for_date>1 THEN
        RETURN jsonb_build_object('success',false,'message',
          'Há mais de um padrão nesta data; ajuste excepcional de horário exige revisão da grade antes de gravar.',
          'date',v_date);
      END IF;
      v_plan := v_plan || jsonb_build_array(jsonb_build_object(
        'config_id',v_cfg.id,'date',v_date,'start_time',v_from,'end_time',v_to));
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_plan)=0 THEN
    RETURN jsonb_build_object('success',false,'message',
      'Não existem dias e horários ativos de atendimento no período informado.');
  END IF;

  -- Primeiro TODAS as verificações; nenhuma gravação antes do fim desta etapa.
  FOR v_target IN SELECT * FROM jsonb_to_recordset(v_plan) AS x(
    config_id uuid, date date, start_time time, end_time time) LOOP

    -- Outro padrão/visita/intervalo da mesma agenda também não pode ser encoberto.
    IF EXISTS (
      SELECT 1 FROM public.agenda_blocks ab
      JOIN public.agenda_configs ac ON ac.id=ab.agenda_config_id
      WHERE ac.professional_id=p_professional_id AND ab.is_active
        AND (ab.specific_date=v_target.date OR
          (ab.specific_date IS NULL AND ab.weekday=extract(dow from v_target.date)::integer))
        AND ab.start_time<v_target.end_time AND ab.end_time>v_target.start_time
    ) THEN
      RETURN jsonb_build_object('success',false,'requires_overlap_confirmation',true,
        'message','Existe bloqueio ou Visita Domiciliar no período; nenhum ajuste foi gravado.',
        'date',v_target.date);
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.agenda_exceptions ae
      JOIN public.agenda_configs ac ON ac.id=ae.agenda_config_id
      WHERE ac.professional_id=p_professional_id AND ae.is_active
        AND ae.exception_date=v_target.date
        AND (ae.start_time IS NULL OR
          (ae.start_time<v_target.end_time AND ae.end_time>v_target.start_time))
        AND NOT (p_entry_type='horario_provisorio' AND
          ae.agenda_config_id=v_target.config_id AND ae.exception_type='alteracao_horario')
    ) THEN
      RETURN jsonb_build_object('success',false,'requires_conflict_confirmation',true,
        'message','Há alteração existente nesta data; nenhum ajuste foi gravado.',
        'date',v_target.date);
    END IF;

    IF p_entry_type NOT IN ('horario_provisorio','urgencia') THEN
      SELECT coalesce(jsonb_agg(to_jsonb(booked)),'[]'::jsonb)
        INTO v_row FROM (
          SELECT pa.id AS appointment_id, 'paciente'::text AS appointment_kind,
            pa.patient_id AS person_id, pt.full_name AS person_name,
            pa.appointment_date, pa.appointment_end
          FROM public.patient_appointments pa
          JOIN public.patients pt ON pt.id=pa.patient_id
          WHERE pa.professional_id=p_professional_id
            AND lower(coalesce(pa.attendance_status,'agendado'))
              NOT IN ('cancelado','cancelada','remarcado','remarcada')
            AND (pa.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=v_target.date
            AND (pa.appointment_date AT TIME ZONE 'America/Sao_Paulo')::time<v_target.end_time
            AND (pa.appointment_end AT TIME ZONE 'America/Sao_Paulo')::time>v_target.start_time
          UNION ALL
          SELECT fa.id, 'familiar'::text,fa.family_member_id,fm.full_name,
            fa.appointment_date,fa.appointment_end
          FROM public.family_psychology_appointments fa
          JOIN public.family_members fm ON fm.id=fa.family_member_id
          WHERE fa.professional_id=p_professional_id
            AND lower(coalesce(fa.attendance_status,'agendado'))
              NOT IN ('cancelado','cancelada','remarcado','remarcada')
            AND (fa.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=v_target.date
            AND (fa.appointment_date AT TIME ZONE 'America/Sao_Paulo')::time<v_target.end_time
            AND (fa.appointment_end AT TIME ZONE 'America/Sao_Paulo')::time>v_target.start_time
        ) booked;
      v_affected := v_affected || v_row;
    END IF;
  END LOOP;
  IF jsonb_array_length(v_affected)>0 THEN
    RETURN jsonb_build_object('success',false,'requires_remanejamento',true,
      'affected_appointments',jsonb_array_length(v_affected),
      'appointments',v_affected,
      'message','Nenhum bloqueio gravado: remaneje todas as consultas atingidas antes de repetir a operação.');
  END IF;

  -- As RPCs legadas são usadas sem modificar seu contrato; qualquer falha lança
  -- erro e desfaz TODAS as linhas criadas nesta mesma transação.
  FOR v_target IN SELECT * FROM jsonb_to_recordset(v_plan) AS x(
    config_id uuid, date date, start_time time, end_time time) LOOP
    IF p_entry_type IN ('excecao','horario_provisorio','urgencia') THEN
      v_result := public.create_agenda_exception_for_interface(
        v_target.config_id,v_target.date,v_kind,v_target.start_time,
        v_target.end_time,p_description,false);
    ELSE
      v_result := public.create_agenda_block_for_interface(
        v_target.config_id,NULL,v_target.date,v_target.start_time,
        v_target.end_time,v_kind,p_description,false,false,p_reschedule_instructions);
    END IF;
    IF coalesce((v_result->>'success')::boolean,false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Ajuste não aplicado; nenhuma data foi gravada: %',
        coalesce(v_result->>'message','validação recusada.');
    END IF;
    v_count := v_count+1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'created',v_count,
    'message',format('%s ajuste(s) registrados apenas nos dias e horários ativos.',v_count));
END;
$function$;
REVOKE ALL ON FUNCTION public.create_agenda_period_adjustment_for_interface(
  uuid,date,date,time without time zone,time without time zone,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agenda_period_adjustment_for_interface(
  uuid,date,date,time without time zone,time without time zone,text,text,text) TO authenticated;