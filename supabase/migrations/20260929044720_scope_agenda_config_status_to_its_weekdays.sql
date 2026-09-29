create or replace function public.set_agenda_configuration_status_for_interface(
  p_config_id uuid,
  p_is_active boolean,
  p_effective_date date,
  p_justification text,
  p_expected_updated_at timestamp with time zone,
  p_urgent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_config public.agenda_configs%rowtype;
  v_affected_count integer;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Aceite do termo vigente obrigatório.'
      using errcode = '42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Somente o Administrativo Controlador pode ativar ou desativar agendas.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_config_id::text, 0)
  );
  if p_is_active is null or p_effective_date is null then
    raise exception 'Informe a situação e a data de vigência.';
  end if;
  if length(btrim(coalesce(p_justification,''))) < 5 then
    raise exception 'Informe a justificativa da alteração.';
  end if;

  select * into v_config
  from public.agenda_configs
  where id=p_config_id
  for update;

  if not found then raise exception 'Configuração não localizada.'; end if;
  if p_expected_updated_at is null
     or v_config.updated_at is distinct from p_expected_updated_at then
    raise exception 'A agenda foi alterada por outra pessoa. Atualize os dados antes de confirmar novamente.';
  end if;

  select count(*) into v_affected_count
  from public.patient_appointments pa
  where pa.professional_id=v_config.professional_id
    and pa.appointment_date >= greatest(
      now(),
      p_effective_date::timestamp at time zone 'America/Sao_Paulo'
    )
    and (pa.appointment_date at time zone 'America/Sao_Paulo')::date
          >= v_config.start_date
    and (
      v_config.end_date is null
      or (pa.appointment_date at time zone 'America/Sao_Paulo')::date
           <= v_config.end_date
    )
    and exists(
      select 1
      from public.agenda_weekdays aw
      where aw.agenda_config_id=p_config_id
        and aw.is_active=true
        and aw.weekday=extract(
          dow from pa.appointment_date at time zone 'America/Sao_Paulo'
        )::integer
    )
    and lower(coalesce(pa.attendance_status,'agendado'))
        not in ('cancelado','remarcado');

  if not p_is_active and v_affected_count > 0 and not p_urgent then
    return jsonb_build_object(
      'success',false,
      'requires_affected_treatment',true,
      'affected_appointments',v_affected_count,
      'message','Existem pacientes afetados. A desativação programada somente poderá ser aplicada após o tratamento desses pacientes.'
    );
  end if;

  if not p_is_active and p_effective_date > current_date then
    update public.agenda_configs
       set end_date=least(
             coalesce(end_date,p_effective_date-1),
             p_effective_date-1
           ),
           updated_at=clock_timestamp()
     where id=p_config_id
     returning updated_at into v_updated_at;
  else
    update public.agenda_configs
       set is_active=p_is_active,
           updated_at=clock_timestamp()
     where id=p_config_id
     returning updated_at into v_updated_at;
  end if;

  return jsonb_build_object(
    'success',true,
    'config_id',p_config_id,
    'is_active',p_is_active,
    'effective_date',p_effective_date,
    'affected_appointments',v_affected_count,
    'updated_at',v_updated_at,
    'message','Situação da agenda atualizada com sucesso.'
  );
end;
$function$;
