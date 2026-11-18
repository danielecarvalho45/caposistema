-- CAPO 18/11/2026: isolamento lógico de produção/homologação, mesmo Supabase.
-- Autorização VERDE; preservar todos os dados, assinaturas e regras funcionais.
-- Correções pontuais de leitura, escrita e seleção do contexto sem tocar em Visita Domiciliar.
CREATE OR REPLACE FUNCTION public.capo_patient_visible_in_current_context(p_patient_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare
  v_is_test boolean;
  v_account_id uuid;
  v_is_homologation boolean := false;
  v_context_enabled boolean := false;
begin
  if p_patient_id is null then return true; end if;

  select coalesce(p.is_test,false) into v_is_test
  from public.patients p where p.id=p_patient_id;
  if not found then return false; end if;

  if auth.uid() is null then return not v_is_test; end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null or not v_is_homologation then
    return not v_is_test;
  end if;

  select coalesce(hc.is_enabled,false)
    into v_context_enabled
  from public.homologation_contexts hc
  where hc.actor_account_id=v_account_id;

  -- Homologação nunca recebe pacientes reais, inclusive sem contexto simulado.
  -- Contexto desligado é operação técnica sem acesso a prontuários/pacientes.
  if not coalesce(v_context_enabled,false) then
    return false;
  end if;

  return v_is_test;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_homologation_context_for_interface(p_role_code text, p_professional_id uuid DEFAULT NULL::uuid, p_specialty_id uuid DEFAULT NULL::uuid, p_test_patient_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_is_homologation boolean;
  v_role_id uuid;
  v_role_code text:=lower(btrim(coalesce(p_role_code,'')));
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
  v_old jsonb;
  v_new jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,ua.is_homologation_account
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;
  if not coalesce(v_is_homologation,false) then
    raise exception 'Conta sem autorização de homologação.' using errcode='42501';
  end if;

  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'Informe o motivo do teste entre 5 e 500 caracteres.' using errcode='22023';
  end if;

  select ar.id into v_role_id
  from public.app_roles ar
  where ar.code=v_role_code and ar.is_active=true;
  if v_role_id is null then
    raise exception 'Perfil de homologação inexistente ou inativo.' using errcode='22023';
  end if;

  if p_professional_id is not null and not exists (
    select 1 from public.professionals pr
    where pr.id=p_professional_id and pr.status='ativo'
      and coalesce(pr.is_homologation_profile,false)=true
  ) then
    raise exception 'Profissional de homologação inexistente ou inativo.' using errcode='22023';
  end if;

  if p_specialty_id is not null and not exists (
    select 1 from public.specialties sp
    where sp.id=p_specialty_id and sp.is_active=true
  ) then
    raise exception 'Especialidade de homologação inexistente ou inativa.' using errcode='22023';
  end if;

  if p_professional_id is not null and p_specialty_id is not null and not exists (
    select 1 from public.professional_specialties ps
    where ps.professional_id=p_professional_id and ps.specialty_id=p_specialty_id
  ) then
    raise exception 'Profissional não está vinculado à especialidade selecionada.' using errcode='22023';
  end if;

  if p_test_patient_id is not null and not exists (
    select 1 from public.patients pt
    where pt.id=p_test_patient_id and pt.is_test=true
  ) then
    raise exception 'Paciente de homologação inválido.' using errcode='22023';
  end if;

  select to_jsonb(hc.*) into v_old
  from public.homologation_contexts hc
  where hc.actor_account_id=v_account_id
  for update;

  insert into public.homologation_contexts(
    actor_account_id,is_enabled,simulated_role_id,simulated_professional_id,
    simulated_specialty_id,test_patient_id,reason,started_at,created_at,updated_at
  ) values (
    v_account_id,true,v_role_id,p_professional_id,p_specialty_id,
    p_test_patient_id,v_reason,clock_timestamp(),clock_timestamp(),clock_timestamp()
  )
  on conflict (actor_account_id) do update set
    is_enabled=true,
    simulated_role_id=excluded.simulated_role_id,
    simulated_professional_id=excluded.simulated_professional_id,
    simulated_specialty_id=excluded.simulated_specialty_id,
    test_patient_id=excluded.test_patient_id,
    reason=excluded.reason,
    started_at=clock_timestamp(),
    updated_at=clock_timestamp();

  select to_jsonb(hc.*) into v_new
  from public.homologation_contexts hc
  where hc.actor_account_id=v_account_id;

  insert into public.audit_logs(
    user_id,user_role,action,entity_name,record_id,old_data,new_data,description,created_at
  ) values (
    auth.uid(),'homologacao','homologation_context_set','homologation_contexts',
    v_account_id::text,v_old,v_new,'Contexto de homologação selecionado pela conta técnica.',clock_timestamp()
  );

  return public.get_homologation_context_for_interface();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_homologation_options_for_interface()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_is_homologation boolean;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id,ua.is_homologation_account into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not coalesce(v_is_homologation,false) then raise exception 'Conta sem autorização de homologação.' using errcode='42501'; end if;

  return jsonb_build_object(
    'roles',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ar.id,'code',ar.code,'name',ar.name,
        'requires_professional',(ar.code='profissional')
      ) order by ar.name)
      from public.app_roles ar
      where ar.is_active=true
    ),'[]'::jsonb),
    'professionals',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,
        'name',p.full_name,
        'function_title',p.function_title,
        'is_professional',p.is_professional,
        'has_active_agenda',exists(
          select 1 from public.agenda_configs ac
          where ac.professional_id=p.id and ac.is_active=true
        ),
        'is_homologation_stub',coalesce(p.is_homologation_profile,false),
        'specialties',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',s.id,'name',s.name,'is_primary',ps.is_primary
          ) order by ps.is_primary desc,s.name)
          from public.professional_specialties ps
          join public.specialties s on s.id=ps.specialty_id and s.is_active=true
          where ps.professional_id=p.id
        ),'[]'::jsonb)
      ) order by
        case when coalesce(p.is_homologation_profile,false) then 1 else 0 end,
        case when exists(select 1 from public.agenda_configs ac where ac.professional_id=p.id and ac.is_active=true) then 0 else 1 end,
        p.full_name)
      from public.professionals p
      where p.status='ativo' and p.is_professional=true
        and coalesce(p.is_homologation_profile,false)=true
    ),'[]'::jsonb),
    'specialties',coalesce((
      select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name)
      from public.specialties s where s.is_active=true
    ),'[]'::jsonb),
    'test_patients',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.full_name,'patient_number',p.patient_number,'cms',p.cms,'test_label',p.test_label
      ) order by p.full_name)
      from public.patients p where p.is_test=true
    ),'[]'::jsonb)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_psychology_appointments_for_interface(p_start_date date, p_end_date date, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(appointment_id uuid, family_member_id uuid, family_name text, family_phone text, source_patient_id uuid, source_patient_name text, source_patient_number text, relationship text, professional_id uuid, professional_name text, appointment_date timestamp with time zone, appointment_end timestamp with time zone, attendance_status text, general_notes text, waiting_list_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_own_professional_id uuid;
    v_general boolean;
begin
    if auth.uid() is null then
        raise exception 'Sessão inválida.' using errcode='42501';
    end if;
    if not coalesce(public.has_accepted_current_legal_term(),false) then
        raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
    end if;
    if p_start_date is null or p_end_date is null or p_end_date<p_start_date then
        raise exception 'Período inválido.' using errcode='22023';
    end if;
    if (p_end_date-p_start_date)>62 then
        raise exception 'A consulta está limitada a 62 dias.' using errcode='22023';
    end if;

    select public.capo_effective_professional_id()
      into v_own_professional_id
    from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
    limit 1;

    v_general :=
      public.has_app_role('administrador')
      or public.has_app_role('administrativo_operacional')
      or public.has_app_role('coordenador');

    if not v_general then
      if not (
        public.has_app_role('profissional')
        and v_own_professional_id is not null
        and exists(
          select 1
          from public.professional_specialties ps
          join public.specialties s on s.id=ps.specialty_id
          where ps.professional_id=v_own_professional_id
            and s.is_active=true
            and lower(btrim(s.name))=lower('Psicologia')
        )
        and (p_professional_id is null or p_professional_id=v_own_professional_id)
      ) then
        raise exception 'Perfil sem autorização para consultar agenda de familiares.' using errcode='42501';
      end if;
    end if;

    return query
    select
      fa.id,
      fa.family_member_id,
      fm.full_name,
      fm.phone,
      fa.source_patient_id,
      case
        when v_general or public.capo_patient_visible_in_current_context(fa.source_patient_id)
        then p.full_name else null
      end,
      case
        when v_general or public.capo_patient_visible_in_current_context(fa.source_patient_id)
        then p.patient_number else null
      end,
      pfl.relationship,
      fa.professional_id,
      pr.full_name,
      fa.appointment_date,
      fa.appointment_end,
      fa.attendance_status,
      fa.general_notes,
      fa.waiting_list_id
    from public.family_psychology_appointments fa
    join public.family_members fm on fm.id=fa.family_member_id
    join public.patient_family_links pfl on pfl.id=fa.family_link_id
    join public.patients p on p.id=fa.source_patient_id
    join public.professionals pr on pr.id=fa.professional_id
    where (fa.appointment_date at time zone 'America/Sao_Paulo')::date
          between p_start_date and p_end_date
      and public.capo_patient_visible_in_current_context(fa.source_patient_id)
      and private.capo_professional_visible_in_current_context(fa.professional_id)
      and (
        (v_general and (p_professional_id is null or fa.professional_id=p_professional_id))
        or
        (not v_general and fa.professional_id=v_own_professional_id)
      )
    order by fa.appointment_date,fm.full_name;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_agenda_configuration_for_interface(p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_caller_professional_id uuid;
  v_target_professional_id uuid;
  v_can_read_others boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Aceite do termo vigente obrigatório.'
      using errcode = '42501';
  end if;

  select public.capo_effective_professional_id() into v_caller_professional_id
  from public.user_accounts ua
  where ua.auth_user_id = auth.uid()
    and ua.is_active = true
  limit 1;

  if not found then
    raise exception 'Conta ativa não localizada.';
  end if;

  v_can_read_others :=
    public.has_app_role('administrador')
    or public.has_app_role('coordenador');

  v_target_professional_id := coalesce(p_professional_id, v_caller_professional_id);

  if v_target_professional_id is null then
    raise exception 'Profissional não informado.';
  end if;
  if not private.capo_professional_visible_in_current_context(v_target_professional_id) then
    raise exception 'Agenda fora do ambiente autorizado.' using errcode='42501';
  end if;

  if not v_can_read_others
     and v_target_professional_id is distinct from v_caller_professional_id then
    raise exception 'Acesso permitido somente à própria agenda.';
  end if;

  select jsonb_build_object(
    'professional_id', p.id,
    'professional_name', p.full_name,
    'professional_status', p.status,
    'specialties', coalesce((
      select jsonb_agg(
        jsonb_build_object('specialty_id', s.id, 'specialty_name', s.name)
        order by s.name
      )
      from public.professional_specialties ps
      join public.specialties s on s.id = ps.specialty_id
      where ps.professional_id = p.id
        and s.is_active = true
    ), '[]'::jsonb),
    'configurations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'config_id', ac.id,
          'start_date', ac.start_date,
          'end_date', ac.end_date,
          'appointment_duration_minutes', ac.appointment_duration_minutes,
          'start_time', ac.start_time,
          'end_time', ac.end_time,
          'is_active', ac.is_active,
          'notes', ac.notes,
          'created_at', ac.created_at,
          'updated_at', ac.updated_at,
          'weekdays', coalesce((
            select jsonb_agg(aw.weekday order by aw.weekday)
            from public.agenda_weekdays aw
            where aw.agenda_config_id = ac.id and aw.is_active = true
          ), '[]'::jsonb),
          'blocks', coalesce((
            select jsonb_agg(to_jsonb(ab) order by ab.created_at)
            from public.agenda_blocks ab
            where ab.agenda_config_id = ac.id and ab.is_active = true
          ), '[]'::jsonb),
          'exceptions', coalesce((
            select jsonb_agg(to_jsonb(ae) order by ae.exception_date, ae.created_at)
            from public.agenda_exceptions ae
            where ae.agenda_config_id = ac.id and ae.is_active = true
          ), '[]'::jsonb)
        ) order by ac.start_date desc
      )
      from public.agenda_configs ac
      where ac.professional_id = p.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.professionals p
  where p.id = v_target_professional_id;

  if v_result is null then
    raise exception 'Profissional não localizado.';
  end if;

  return v_result;
end;
$function$
;

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
      AND ab.start_time<v_end AND ab.end_time>v_start;
    IF v_conflicts>0 THEN
      RETURN jsonb_build_object('success',false,'requires_overlap_review',true,
       'message','Existe um bloqueio ativo, inclusive possível Visita Domiciliar, em '||
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
        v_start,v_end,p_entry_type,p_description,false,false,p_reschedule_instructions);
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_agenda_block_for_interface(p_agenda_config_id uuid, p_weekday integer, p_specific_date date, p_start_time time without time zone, p_end_time time without time zone, p_block_type text, p_description text DEFAULT NULL::text, p_confirm_overlap boolean DEFAULT false, p_confirm_affected boolean DEFAULT false, p_reschedule_instructions text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_professional_id uuid; v_caller_professional_id uuid; v_overlap_count integer; v_affected_count integer:=0; v_id uuid; v_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select public.capo_effective_professional_id() into v_caller_professional_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if not found then raise exception 'Conta ativa não localizada.'; end if;
  select ac.professional_id into v_professional_id from public.agenda_configs ac where ac.id=p_agenda_config_id and ac.is_active=true;
  if not found then raise exception 'Configuração ativa não localizada.'; end if;
  if not private.capo_professional_visible_in_current_context(v_professional_id) then
    raise exception 'Profissional fora do ambiente autorizado.' using errcode='42501';
  end if;
  v_is_admin:=public.has_app_role('administrador');
  if p_weekday is not null and not v_is_admin then raise exception 'Bloqueio recorrente é alteração estrutural e deve ser solicitado à Coordenação.' using errcode='42501'; end if;
  if p_specific_date is not null and not v_is_admin and v_professional_id is distinct from v_caller_professional_id then raise exception 'Acesso permitido somente à própria agenda.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agenda_config_id::text,0));
  if p_block_type not in ('intervalo','atividade','bloqueio','reuniao','relatorio','alimentacao','outro') then raise exception 'Tipo de bloqueio inválido.'; end if;
  if (p_weekday is null)=(p_specific_date is null) then raise exception 'Informe somente um dia da semana ou uma data específica.'; end if;
  if p_start_time is null or p_end_time is null or p_end_time<=p_start_time then raise exception 'Horário do bloqueio inválido.'; end if;
  if p_block_type='outro' and length(btrim(coalesce(p_description,'')))=0 then raise exception 'Descreva o bloqueio do tipo outro.'; end if;
  select count(*) into v_overlap_count from public.agenda_blocks ab where ab.agenda_config_id=p_agenda_config_id and ab.is_active=true and ab.weekday is not distinct from p_weekday and ab.specific_date is not distinct from p_specific_date and ab.start_time<p_end_time and ab.end_time>p_start_time;
  if v_overlap_count>0 and not p_confirm_overlap then return jsonb_build_object('success',false,'requires_overlap_confirmation',true,'message','Já existe bloqueio nesse período. Confirme para manter os dois registros.'); end if;
  if p_specific_date is not null then select count(*) into v_affected_count from public.patient_appointments pa where pa.professional_id=v_professional_id and (pa.appointment_date at time zone 'America/Sao_Paulo')::date=p_specific_date and (pa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time and (pa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time and lower(coalesce(pa.attendance_status,'agendado')) not in ('cancelado','remarcado'); end if;
  -- Uma justificativa não substitui o remanejamento efetivo.
  -- Considerar consultas oncológicas e de familiares da Psicologia.
  select count(*) into v_affected_count
  from (
    select pa.appointment_date, pa.appointment_end
      from public.patient_appointments pa
     where pa.professional_id=v_professional_id
       and lower(coalesce(pa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
    union all
    select fa.appointment_date, fa.appointment_end
      from public.family_psychology_appointments fa
     where fa.professional_id=v_professional_id
       and lower(coalesce(fa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
  ) booked
  where (
      p_specific_date is not null
      and (booked.appointment_date at time zone 'America/Sao_Paulo')::date=p_specific_date
      or p_weekday is not null
      and booked.appointment_date>=clock_timestamp()
      and extract(dow from booked.appointment_date at time zone 'America/Sao_Paulo')::integer=p_weekday
    )
    and (booked.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
    and (booked.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time;
  if v_affected_count>0 then
    return jsonb_build_object(
      'success',false,'requires_remanejamento',true,
      'requires_affected_confirmation',false,
      'affected_appointments',v_affected_count,
      'message','Bloqueio não aplicado. Remaneje todas as consultas afetadas na agenda oficial antes de tentar novamente.'
    );
  end if;
  insert into public.agenda_blocks(agenda_config_id,weekday,specific_date,start_time,end_time,block_type,description,is_active,reschedule_instructions,requires_admin_action,admin_action_status,updated_at)
  values(p_agenda_config_id,p_weekday,p_specific_date,p_start_time,p_end_time,p_block_type,nullif(btrim(p_description),''),true,nullif(btrim(p_reschedule_instructions),''),v_affected_count>0,case when v_affected_count>0 then 'aguardando' else 'nao_necessaria' end,clock_timestamp()) returning id into v_id;
  return jsonb_build_object('success',true,'block_id',v_id,'affected_appointments',v_affected_count,'message','Bloqueio registrado com sucesso.');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_agenda_block_affected_for_interface(p_agenda_config_id uuid, p_date date, p_start_time time without time zone, p_end_time time without time zone)
 RETURNS TABLE(appointment_id uuid, appointment_kind text, person_id uuid, person_name text, professional_id uuid, appointment_date timestamp with time zone, appointment_end timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
  if not private.capo_professional_visible_in_current_context(v_professional_id) then
    raise exception 'Agenda fora do ambiente autorizado.' using errcode='42501';
  end if;
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
       and public.capo_patient_visible_in_current_context(pa.patient_id)
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
       and public.capo_patient_visible_in_current_context(fa.source_patient_id)
       and lower(coalesce(fa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
       and (fa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_home_link_reschedule_for_interface(p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false)
   OR NOT EXISTS(SELECT 1 FROM public.user_accounts WHERE auth_user_id=auth.uid() AND is_active) THEN
   RAISE EXCEPTION 'Sessão ou termo inválido.' USING ERRCODE='42501';
 END IF;
 IF NOT(public.has_app_role('administrador') OR public.has_app_role('administrativo_operacional')) THEN
   RAISE EXCEPTION 'Perfil sem acesso à programação administrativa.' USING ERRCODE='42501';
 END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Data obrigatória.' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',coalesce((
   SELECT jsonb_agg(obj ORDER BY obj->>'slot_start',obj->>'professional_name')
   FROM (
     SELECT jsonb_build_object('appointment_id',a.id,'patient_id',a.patient_id,
       'patient_name',pt.full_name,'professional_id',a.professional_id,'professional_name',pr.full_name,
       'slot_date',p_date,'slot_start',a.appointment_date,'slot_end',a.appointment_end,
       'appointment_kind','paciente') obj
     FROM public.patient_appointments a
     JOIN public.patients pt ON pt.id=a.patient_id
     JOIN public.professionals pr ON pr.id=a.professional_id
     WHERE (a.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=p_date
       AND a.attendance_status='cancelado'
       AND public.capo_patient_visible_in_current_context(a.patient_id)
       AND private.capo_professional_visible_in_current_context(a.professional_id)
       AND EXISTS(SELECT 1 FROM public.appointment_confirmation_links l
           WHERE l.appointment_id=a.id AND l.decision='nao_comparecera')
       AND EXISTS(SELECT 1 FROM public.notifications n WHERE n.notification_type='appointment_patient_reschedule'
           AND n.entity_type='patient_appointments' AND n.entity_id=a.id AND n.resolved_at IS NULL)
       AND NOT EXISTS(SELECT 1 FROM public.patient_appointments successor WHERE successor.rescheduled_from_id=a.id
           AND lower(coalesce(successor.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada'))
     UNION ALL
     SELECT jsonb_build_object('appointment_id',a.id,'patient_id',a.source_patient_id,
       'patient_name',fm.full_name,'professional_id',a.professional_id,'professional_name',pr.full_name,
       'slot_date',p_date,'slot_start',a.appointment_date,'slot_end',a.appointment_end,
       'appointment_kind','familiar') obj
     FROM public.family_psychology_appointments a
     JOIN public.family_members fm ON fm.id=a.family_member_id
     JOIN public.professionals pr ON pr.id=a.professional_id
     WHERE (a.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=p_date
       AND a.attendance_status='cancelado'
       AND public.capo_patient_visible_in_current_context(a.source_patient_id)
       AND private.capo_professional_visible_in_current_context(a.professional_id)
       AND EXISTS(SELECT 1 FROM public.family_psychology_confirmation_links l
           WHERE l.appointment_id=a.id AND l.decision='nao_comparecera')
       AND EXISTS(SELECT 1 FROM public.notifications n WHERE n.notification_type='appointment_patient_reschedule'
           AND n.entity_type='family_psychology_appointments' AND n.entity_id=a.id AND n.resolved_at IS NULL)
       AND NOT EXISTS(SELECT 1 FROM public.family_psychology_appointments successor WHERE successor.rescheduled_from_id=a.id
           AND lower(coalesce(successor.attendance_status,'agendado')) NOT IN ('cancelado','cancelada','remarcado','remarcada'))
   ) scope
 ),'[]'::jsonb));
END;
$function$
;
