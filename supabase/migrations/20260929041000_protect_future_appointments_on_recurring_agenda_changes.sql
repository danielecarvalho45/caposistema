create or replace function public.save_agenda_recurring_interval_for_interface(
  p_agenda_config_id uuid,
  p_weekdays integer[],
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_block_type text default 'intervalo',
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_professional_id uuid;
  v_config_start_date date;
  v_config_end_date date;
  v_weekday integer;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_affected_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  if not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Administrador pode alterar a formulação semanal da agenda.'
      using errcode='42501';
  end if;

  select ac.professional_id,ac.start_date,ac.end_date
    into v_professional_id,v_config_start_date,v_config_end_date
  from public.agenda_configs ac
  where ac.id=p_agenda_config_id
    and ac.is_active=true;

  if not found then
    raise exception 'Configuração ativa não localizada.';
  end if;

  if p_block_type not in (
    'intervalo',
    'alimentacao',
    'estudo_caso',
    'atendimento_online',
    'rotina_administrativa'
  ) then
    raise exception 'Tipo recorrente inválido.';
  end if;

  if p_start_time is null or p_end_time is null or p_end_time<=p_start_time then
    raise exception 'Horário inválido.';
  end if;

  if coalesce(array_length(p_weekdays,1),0)=0
     or exists(select 1 from unnest(p_weekdays)d where d<0 or d>6) then
    raise exception 'Selecione pelo menos um dia válido da semana.';
  end if;

  if exists(
    select 1
    from unnest(p_weekdays)d
    where not exists(
      select 1
      from public.agenda_weekdays aw
      where aw.agenda_config_id=p_agenda_config_id
        and aw.weekday=d
        and aw.is_active=true
    )
  ) then
    raise exception 'A formulação só pode ser aplicada aos dias ativos da agenda.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_agenda_config_id::text,0)
  );

  foreach v_weekday in array p_weekdays loop
    if exists(
      select 1
      from public.agenda_blocks ab
      where ab.agenda_config_id=p_agenda_config_id
        and ab.is_active=true
        and ab.weekday=v_weekday
        and ab.specific_date is null
        and ab.start_time<p_end_time
        and ab.end_time>p_start_time
    ) then
      raise exception 'Já existe ocupação recorrente sobreposta em um dos dias selecionados.';
    end if;
  end loop;

  select count(*)
    into v_affected_count
  from public.patient_appointments pa
  where pa.professional_id=v_professional_id
    and pa.appointment_date>=now()
    and lower(coalesce(pa.attendance_status,'agendado')) not in (
      'cancelado','cancelada','remarcado','remarcada'
    )
    and (pa.appointment_date at time zone 'America/Sao_Paulo')::date
          >= greatest(v_config_start_date,current_date)
    and (
      v_config_end_date is null
      or (pa.appointment_date at time zone 'America/Sao_Paulo')::date
          <= v_config_end_date
    )
    and extract(
      dow from pa.appointment_date at time zone 'America/Sao_Paulo'
    )::integer=any(p_weekdays)
    and (pa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
    and (pa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time;

  if v_affected_count>0 then
    return jsonb_build_object(
      'success',false,
      'requires_affected_treatment',true,
      'affected_appointments',v_affected_count,
      'message','Existem consultas futuras dentro deste período recorrente. Trate ou remaneje esses pacientes antes de aplicar a nova formulação semanal.'
    );
  end if;

  foreach v_weekday in array p_weekdays loop
    insert into public.agenda_blocks(
      agenda_config_id,weekday,specific_date,start_time,end_time,
      block_type,description,is_active,reschedule_instructions,
      requires_admin_action,admin_action_status,updated_at
    )
    values(
      p_agenda_config_id,v_weekday,null,p_start_time,p_end_time,
      p_block_type,nullif(btrim(p_description),''),true,null,
      false,'nao_necessaria',clock_timestamp()
    )
    returning id into v_id;

    v_ids:=array_append(v_ids,v_id);
  end loop;

  return jsonb_build_object(
    'success',true,
    'block_ids',v_ids,
    'weekdays',p_weekdays,
    'affected_appointments',v_affected_count,
    'message','Formulação semanal registrada na agenda.'
  );
end;
$function$;