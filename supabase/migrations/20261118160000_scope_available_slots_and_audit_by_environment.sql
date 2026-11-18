-- CAPO 18/11/2026: reforço adicional da leitura da agenda e auditoria entre ambientes.
CREATE OR REPLACE FUNCTION public.get_available_appointment_slots(p_professional_id uuid, p_date date)
 RETURNS TABLE(professional_id uuid, slot_date date, slot_time time without time zone, slot_start timestamp with time zone, slot_end timestamp with time zone, duration_minutes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_own_professional_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Usuário não autenticado.' using errcode='42501';
    end if;

    if not public.has_accepted_current_legal_term() then
        raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
    end if;

    select public.capo_effective_professional_id()
      into v_own_professional_id
    from public.user_accounts ua
    where ua.auth_user_id=auth.uid()
      and ua.is_active=true
    limit 1;

    if not (
        public.has_app_role('administrador')
        or public.has_app_role('administrativo_operacional')
        or public.has_app_role('coordenador')
        or (
            public.has_app_role('profissional')
            and v_own_professional_id=p_professional_id
        )
    ) then
        raise exception 'Perfil sem autorização para consultar esta agenda.' using errcode='42501';
    end if;

    if not private.capo_professional_visible_in_current_context(p_professional_id) then
        raise exception 'Profissional fora do ambiente autorizado.' using errcode='42501';
    end if;

    if p_date is null then
        raise exception 'A data é obrigatória.' using errcode='22023';
    end if;

    if p_date < (now() at time zone 'America/Sao_Paulo')::date then
        raise exception 'Não é permitido consultar vagas em data passada.' using errcode='22023';
    end if;

    return query
    with config as (
        select ac.id,ac.professional_id,ac.appointment_duration_minutes,ac.start_time,ac.end_time
        from public.agenda_configs ac
        join public.agenda_weekdays aw
          on aw.agenda_config_id=ac.id
         and aw.is_active=true
         and aw.weekday=extract(dow from p_date)::integer
        where ac.professional_id=p_professional_id
          and ac.is_active=true
          and ac.start_date<=p_date
          and (ac.end_date is null or ac.end_date>=p_date)
          and ac.appointment_duration_minutes>0
        order by ac.start_date desc,ac.created_at desc
        limit 1
    ),
    base_window as (
        select
            c.id agenda_config_id,
            c.professional_id,
            c.appointment_duration_minutes,
            coalesce(
              (
                select ae.start_time
                from public.agenda_exceptions ae
                where ae.agenda_config_id=c.id
                  and ae.exception_date=p_date
                  and ae.exception_type='alteracao_horario'
                  and ae.is_active=true
                  and ae.start_time is not null
                  and ae.end_time is not null
                order by ae.created_at desc
                limit 1
              ),
              c.start_time
            ) window_start,
            coalesce(
              (
                select ae.end_time
                from public.agenda_exceptions ae
                where ae.agenda_config_id=c.id
                  and ae.exception_date=p_date
                  and ae.exception_type='alteracao_horario'
                  and ae.is_active=true
                  and ae.start_time is not null
                  and ae.end_time is not null
                order by ae.created_at desc
                limit 1
              ),
              c.end_time
            ) window_end
        from config c
        where exists(
          select 1 from public.agenda_weekdays aw
          where aw.agenda_config_id=c.id
            and aw.weekday=extract(dow from p_date)::integer
            and aw.is_active=true
        )
        and not exists(
          select 1 from public.agenda_exceptions ae
          where ae.agenda_config_id=c.id
            and ae.exception_date=p_date
            and ae.exception_type in ('cancelamento','bloqueio','feriado')
            and ae.is_active=true
            and ae.start_time is null
            and ae.end_time is null
        )
    ),
    extra_windows as (
        select c.id,c.professional_id,c.appointment_duration_minutes,ae.start_time,ae.end_time
        from config c
        join public.agenda_exceptions ae
          on ae.agenda_config_id=c.id
         and ae.exception_date=p_date
         and ae.exception_type='atendimento_extra'
         and ae.is_active=true
         and ae.start_time is not null
         and ae.end_time is not null
    ),
    windows as (
        select * from base_window
        union
        select * from extra_windows
    ),
    recurring_blockers as (
        select
          w.agenda_config_id,
          w.professional_id,
          w.window_start,
          w.window_end,
          greatest(ab.start_time,w.window_start) block_start,
          least(ab.end_time,w.window_end) block_end
        from windows w
        join public.agenda_blocks ab
          on ab.agenda_config_id=w.agenda_config_id
         and ab.is_active=true
         and (
           ab.specific_date=p_date
           or (
             ab.specific_date is null
             and ab.weekday=extract(dow from p_date)::integer
           )
         )
         and ab.end_time>w.window_start
         and ab.start_time<w.window_end
    ),
    segment_starts as (
        select
          w.agenda_config_id,
          w.professional_id,
          w.appointment_duration_minutes,
          w.window_start,
          w.window_end,
          w.window_start segment_start
        from windows w
        where w.window_end>w.window_start

        union

        select
          w.agenda_config_id,
          w.professional_id,
          w.appointment_duration_minutes,
          w.window_start,
          w.window_end,
          rb.block_end segment_start
        from windows w
        join recurring_blockers rb
          on rb.agenda_config_id=w.agenda_config_id
         and rb.professional_id=w.professional_id
         and rb.block_end<w.window_end
    ),
    free_segments as (
        select
          s.agenda_config_id,
          s.professional_id,
          s.appointment_duration_minutes,
          s.segment_start,
          least(
            s.window_end,
            coalesce((
              select min(rb.block_start)
              from recurring_blockers rb
              where rb.agenda_config_id=s.agenda_config_id
                and rb.professional_id=s.professional_id
                and rb.block_start>=s.segment_start
            ),s.window_end)
          ) segment_end
        from segment_starts s
        where not exists(
          select 1
          from recurring_blockers rb
          where rb.agenda_config_id=s.agenda_config_id
            and rb.professional_id=s.professional_id
            and s.segment_start>=rb.block_start
            and s.segment_start<rb.block_end
        )
    ),
    generated_slots as (
        select
            fs.agenda_config_id,
            fs.professional_id,
            fs.appointment_duration_minutes,
            gs.slot_local,
            gs.slot_local+make_interval(mins=>fs.appointment_duration_minutes) slot_local_end
        from free_segments fs
        cross join lateral generate_series(
            (p_date+fs.segment_start)::timestamp,
            (p_date+fs.segment_end)::timestamp-make_interval(mins=>fs.appointment_duration_minutes),
            make_interval(mins=>fs.appointment_duration_minutes)
        ) gs(slot_local)
        where fs.segment_end>fs.segment_start
          and (fs.segment_start+make_interval(mins=>fs.appointment_duration_minutes))::time<=fs.segment_end
    ),
    valid_slots as (
        select
            g.*,
            g.slot_local at time zone 'America/Sao_Paulo' slot_start_tz,
            g.slot_local_end at time zone 'America/Sao_Paulo' slot_end_tz
        from generated_slots g
        where not exists(
          select 1 from public.agenda_exceptions ae
          where ae.agenda_config_id=g.agenda_config_id
            and ae.exception_date=p_date
            and ae.exception_type in ('cancelamento','bloqueio','feriado')
            and ae.is_active=true
            and ae.start_time is not null
            and ae.end_time is not null
            and g.slot_local::time<ae.end_time
            and g.slot_local_end::time>ae.start_time
        )
    )
    select distinct
        v.professional_id,
        p_date,
        v.slot_local::time,
        v.slot_start_tz,
        v.slot_end_tz,
        v.appointment_duration_minutes
    from valid_slots v
    where not exists(
        select 1
        from public.patient_appointments pa
        where pa.professional_id=v.professional_id
          and lower(coalesce(pa.attendance_status,'')) not in ('cancelado','cancelada','remarcado','remarcada')
          and pa.appointment_date<v.slot_end_tz
          and pa.appointment_end>v.slot_start_tz
    )
    and not exists(
        select 1
        from public.family_psychology_appointments fa
        where fa.professional_id=v.professional_id
          and fa.attendance_status not in ('cancelado','remarcado')
          and fa.appointment_date<v.slot_end_tz
          and fa.appointment_end>v.slot_start_tz
    )
    order by 4;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_logs_for_interface(p_start_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_action text DEFAULT NULL::text, p_entity_name text DEFAULT NULL::text, p_actor_account_id uuid DEFAULT NULL::uuid, p_record_id text DEFAULT NULL::text, p_before_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_is_homologation boolean := false;
  v_allowed boolean;
  v_action text := nullif(upper(btrim(coalesce(p_action,''))),'');
  v_entity text := nullif(btrim(coalesce(p_entity_name,'')),'');
  v_record text := nullif(btrim(coalesce(p_record_id,'')),'');
  v_limit integer := coalesce(p_limit,50);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;

  v_allowed := public.has_app_role('administrador')
               or public.has_app_role('coordenador');
  if not v_allowed then
    raise exception 'Perfil sem autorização para consultar a Auditoria global.' using errcode='42501';
  end if;

  if v_action is not null and v_action not in ('INSERT','UPDATE','DELETE') then
    raise exception 'Ação de auditoria inválida.' using errcode='22023';
  end if;
  if p_start_at is not null and p_end_at is not null and p_end_at < p_start_at then
    raise exception 'Período de auditoria inválido.' using errcode='22023';
  end if;
  if v_entity is not null and (char_length(v_entity)>100 or v_entity !~ '^[a-z0-9_]+$') then
    raise exception 'Entidade de auditoria inválida.' using errcode='22023';
  end if;
  if v_record is not null and char_length(v_record)>120 then
    raise exception 'Identificador de registro inválido.' using errcode='22023';
  end if;
  if v_limit < 1 or v_limit > 100 then
    raise exception 'Limite deve estar entre 1 e 100.' using errcode='22023';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Cursor de paginação incompleto.' using errcode='22023';
  end if;

  with base as (
    select
      al.id audit_id,
      al.created_at,
      upper(al.action) action,
      al.entity_name,
      al.record_id,
      al.old_data,
      al.new_data,
      al.user_role,
      ua.id actor_account_id,
      coalesce(pr.full_name,ua.username) actor_name_raw,
      public.capo_audit_patient_id(al.entity_name,al.record_id,al.old_data,al.new_data) patient_id,
      public.capo_audit_safe_changes(al.entity_name,al.old_data,al.new_data) safe_changes
    from public.audit_logs al
    left join public.user_accounts ua on ua.auth_user_id=al.user_id
    left join public.professionals pr on pr.id=public.capo_effective_professional_id()
    where (
      -- Auditoria de paciente é sempre do contexto corrente.
      (public.capo_audit_patient_id(al.entity_name,al.record_id,al.old_data,al.new_data) is not null
        and public.capo_patient_visible_in_current_context(
          public.capo_audit_patient_id(al.entity_name,al.record_id,al.old_data,al.new_data)))
      or
      (public.capo_audit_patient_id(al.entity_name,al.record_id,al.old_data,al.new_data) is null
        and (
          (v_is_homologation and al.user_id=auth.uid())
          or (not v_is_homologation and not exists(
            select 1 from public.user_accounts actor
            where actor.auth_user_id=al.user_id and actor.is_homologation_account))
        ))
    )
      and (p_start_at is null or al.created_at >= p_start_at)
      and (p_end_at is null or al.created_at <= p_end_at)
      and (v_action is null or upper(al.action)=v_action)
      and (v_entity is null or al.entity_name=v_entity)
      and (p_actor_account_id is null or ua.id=p_actor_account_id)
      and (v_record is null or al.record_id=v_record)
      and (p_before_created_at is null or (al.created_at,al.id) < (p_before_created_at,p_before_id))
    order by al.created_at desc, al.id desc
    limit v_limit + 1
  ),
  trimmed as (
    select * from base
    order by created_at desc,audit_id desc
    limit v_limit
  ),
  decorated as (
    select t.*,
      pt.full_name patient_name_current,
      pt.patient_number patient_number_current
    from trimmed t
    left join public.patients pt on pt.id=t.patient_id
  ),
  items as (
    select
      d.created_at,
      d.audit_id,
      jsonb_build_object(
        'audit_id',d.audit_id,
        'created_at',d.created_at,
        'action',d.action,
        'entity_name',d.entity_name,
        'entity_label',public.capo_audit_entity_label(d.entity_name),
        'record_id',d.record_id,
        'patient_id',d.patient_id,
        'patient_name',coalesce(d.patient_name_current,case when d.entity_name='patients' then coalesce(d.new_data->>'full_name',d.old_data->>'full_name') end),
        'patient_number',coalesce(d.patient_number_current,case when d.entity_name='patients' then coalesce(d.new_data->>'patient_number',d.old_data->>'patient_number') end),
        'actor_account_id',d.actor_account_id,
        'actor_name',case
          when d.actor_account_id is not null then coalesce(d.actor_name_raw,'Conta CAPO')
          when d.user_role is null then 'Sistema / processo automático'
          else 'Autoria autenticada não identificada'
        end,
        'actor_role_code',d.user_role,
        'actor_role_label',case d.user_role
          when 'administrador' then 'Administrador / Controlador'
          when 'coordenador' then 'Coordenador'
          when 'administrador_tecnico' then 'Administrador Técnico / TI'
          when 'administrativo_operacional' then 'Administrativo Operacional'
          when 'profissional' then 'Profissional'
          else case when d.user_role is null then null else 'Perfil registrado: '||d.user_role end
        end,
        'summary',case d.action
          when 'INSERT' then 'Criação registrada em '||public.capo_audit_entity_label(d.entity_name)||'.'
          when 'UPDATE' then case
            when jsonb_array_length(d.safe_changes)>0 then 'Alteração registrada em '||public.capo_audit_entity_label(d.entity_name)||' com '||jsonb_array_length(d.safe_changes)||' campo(s) operacional(is) autorizado(s) alterado(s).'
            else 'Alteração registrada em '||public.capo_audit_entity_label(d.entity_name)||'. O conteúdo da linha não é exposto por esta Auditoria.' end
          when 'DELETE' then 'Exclusão registrada em '||public.capo_audit_entity_label(d.entity_name)||'.'
          else 'Evento de auditoria registrado.'
        end,
        'changes',d.safe_changes
      ) item
    from decorated d
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(i.item order by i.created_at desc,i.audit_id desc) from items i),'[]'::jsonb),
    'has_more',(select count(*) from base)>v_limit,
    'next_before_created_at',case when (select count(*) from base)>v_limit then (select t.created_at from trimmed t order by t.created_at asc,t.audit_id asc limit 1) else null end,
    'next_before_id',case when (select count(*) from base)>v_limit then (select t.audit_id from trimmed t order by t.created_at asc,t.audit_id asc limit 1) else null end
  ) into v_result;

  return v_result;
end;
$function$
;
