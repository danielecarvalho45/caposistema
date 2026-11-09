-- CAPO: preservar consultas antes de bloquear agenda.
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

CREATE OR REPLACE FUNCTION public.create_agenda_exception_for_interface(p_agenda_config_id uuid, p_exception_date date, p_exception_type text, p_start_time time without time zone DEFAULT NULL::time without time zone, p_end_time time without time zone DEFAULT NULL::time without time zone, p_description text DEFAULT NULL::text, p_confirm_conflict boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_professional_id uuid;
  v_caller_professional_id uuid;
  v_conflicts integer;
  v_affected_count integer := 0;
  v_id uuid;
  v_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_caller_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if not found then raise exception 'Conta ativa não localizada.'; end if;

  select ac.professional_id
    into v_professional_id
  from public.agenda_configs ac
  where ac.id=p_agenda_config_id and ac.is_active=true;

  if not found then raise exception 'Configuração ativa não localizada.'; end if;

  v_is_admin:=public.has_app_role('administrador');

  if not v_is_admin and v_professional_id is distinct from v_caller_professional_id then
    raise exception 'Acesso permitido somente à própria agenda.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_agenda_config_id::text,0)
  );

  if p_exception_type not in (
    'cancelamento','alteracao_horario','bloqueio',
    'atendimento_extra','feriado','outro'
  ) then
    raise exception 'Tipo de exceção inválido.';
  end if;

  if p_exception_date is null then
    raise exception 'Informe a data da exceção.';
  end if;

  if (p_start_time is null)<>(p_end_time is null)
     or (p_start_time is not null and p_end_time<=p_start_time) then
    raise exception 'Horário da exceção inválido.';
  end if;

  if p_exception_type='outro'
     and length(btrim(coalesce(p_description,'')))=0 then
    raise exception 'Descreva a exceção do tipo outro.';
  end if;

  if p_exception_date<current_date
     and (not v_is_admin or length(btrim(coalesce(p_description,'')))<5) then
    raise exception 'Exceção retroativa exige Administrativo Controlador e justificativa.';
  end if;

  select count(*) into v_conflicts
  from public.agenda_exceptions ae
  where ae.agenda_config_id=p_agenda_config_id
    and ae.exception_date=p_exception_date
    and ae.is_active=true
    and (
      (p_exception_type='alteracao_horario' and ae.exception_type='alteracao_horario')
      or (
        p_start_time is not null
        and ae.start_time is not null
        and ae.start_time<p_end_time
        and ae.end_time>p_start_time
      )
    );

  if v_conflicts>0 and not p_confirm_conflict then
    return jsonb_build_object(
      'success',false,
      'requires_conflict_confirmation',true,
      'message','Existe outra exceção nessa data ou período. Confirme a regra mais recente.'
    );
  end if;

  -- Bloqueio ou cancelamento temporário não pode esconder consultas ativas.
  if p_exception_type in ('bloqueio','cancelamento','feriado') then
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
    where (booked.appointment_date at time zone 'America/Sao_Paulo')::date=p_exception_date
      and (
        p_start_time is null
        or (
          (booked.appointment_date at time zone 'America/Sao_Paulo')::time < p_end_time
          and (booked.appointment_end at time zone 'America/Sao_Paulo')::time > p_start_time
        )
      );
    if v_affected_count>0 then
      return jsonb_build_object('success',false,'requires_remanejamento',true,
        'affected_appointments',v_affected_count,
        'message','Alteração não aplicada: remaneje as consultas afetadas antes de bloquear o período.');
    end if;
  end if;

  if p_exception_type='alteracao_horario' then
    update public.agenda_exceptions
       set is_active=false,updated_at=clock_timestamp()
     where agenda_config_id=p_agenda_config_id
       and exception_date=p_exception_date
       and exception_type='alteracao_horario'
       and is_active=true;
  end if;

  insert into public.agenda_exceptions(
    agenda_config_id,exception_date,exception_type,
    start_time,end_time,description,is_active,updated_at
  )
  values(
    p_agenda_config_id,p_exception_date,p_exception_type,
    p_start_time,p_end_time,nullif(btrim(p_description),''),
    true,clock_timestamp()
  )
  returning id into v_id;

  return jsonb_build_object(
    'success',true,
    'exception_id',v_id,
    'message',case
      when p_exception_type='alteracao_horario'
        then 'Horário provisório registrado na própria agenda.'
      else 'Exceção registrada com sucesso.'
    end
  );
end;
$function$
;