-- CAPO: cadastro classificado, preservando a RPC legada e o fluxo de aceite.
alter table public.patient_care_cycles
  drop constraint if exists patient_care_cycles_opening_type_check;
alter table public.patient_care_cycles
  add constraint patient_care_cycles_opening_type_check
  check (opening_type in ('initial_acceptance','return_admission','preexisting_service'));

create or replace function public.create_classified_patient_for_interface(
  p_registration_kind text,
  p_full_name text,
  p_birth_date date,
  p_cms text default null,
  p_sex text default null,
  p_phone text default null,
  p_phone_secondary text default null,
  p_address text default null,
  p_historical_capo_start_date date default null,
  p_operational_notes text default null,
  p_origin text default null
)
returns table(patient_id uuid, patient_number text, full_name text, cms text,
              birth_date date, origin text, status text, created_at timestamptz)
language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_patient record;
  v_actor uuid;
  v_cycle_id uuid;
  v_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_start_date date;
begin
  if p_registration_kind is null or p_registration_kind not in ('novo','preexistente') then
    raise exception 'Selecione Paciente novo ou Paciente preexistente.' using errcode='22023';
  end if;
  if p_registration_kind = 'preexistente' then
    if p_historical_capo_start_date is null or p_historical_capo_start_date >= v_today then
      raise exception 'O paciente preexistente exige data de início anterior a hoje.' using errcode='22023';
    end if;
    if p_birth_date is not null and p_historical_capo_start_date < p_birth_date then
      raise exception 'Início no CAPO anterior ao nascimento.' using errcode='22023';
    end if;
    v_start_date := p_historical_capo_start_date;
  else
    if p_historical_capo_start_date is not null then
      raise exception 'O cadastro novo gera data e horário automaticamente.' using errcode='22023';
    end if;
    v_start_date := v_today;
  end if;

  -- Reutiliza cadastro, checagens de papel, homologação, duplicidade e validações vigentes.
  select * into v_patient
  from public.create_patient_for_interface(
    p_full_name,p_birth_date,p_cms,p_sex,p_phone,p_phone_secondary,p_address,
    v_start_date,p_operational_notes,p_origin
  );
  if v_patient.patient_id is null then
    raise exception 'O cadastro não foi confirmado.' using errcode='22023';
  end if;

  if p_registration_kind = 'preexistente' then
    select ua.id into v_actor
    from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
    limit 1;
    if v_actor is null then
      raise exception 'Conta administrativa inválida.' using errcode='42501';
    end if;
    insert into public.patient_care_cycles(
      patient_id,cycle_number,status,opened_at,opened_by,opening_type,opening_reason
    )
    values(
      v_patient.patient_id,1,'ativo',
      (v_start_date::timestamp at time zone 'America/Sao_Paulo'),
      v_actor,'preexisting_service',
      'Vínculo preexistente: atendimento CAPO iniciado antes da implantação do sistema.'
    )
    returning id into v_cycle_id;

    insert into public.audit_logs(user_id,user_role,action,entity_name,record_id,new_data,description)
    values(
      auth.uid(),'administrativo_operacional','VINCULO_PREEXISTENTE_REGISTRADO',
      'patient_care_cycles',v_cycle_id::text,
      jsonb_build_object('patient_id',v_patient.patient_id,
        'historical_start_date',v_start_date,'opening_type','preexisting_service'),
      'Cadastro preexistente validado sem Oferta CAPO nem aceite simulado.'
    );
  end if;

  return query select
    v_patient.patient_id::uuid,v_patient.patient_number::text,
    v_patient.full_name::text,v_patient.cms::text,v_patient.birth_date::date,
    v_patient.origin::text,v_patient.status::text,v_patient.created_at::timestamptz;
end;
$function$;

revoke all on function public.create_classified_patient_for_interface(
  text,text,date,text,text,text,text,text,date,text,text
) from public,anon;
grant execute on function public.create_classified_patient_for_interface(
  text,text,date,text,text,text,text,text,date,text,text
) to authenticated;
