do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='create_patient_for_interface'
    and pg_get_function_identity_arguments(p.oid)=
      'p_full_name text, p_birth_date date, p_cms text, p_sex text, p_phone text, p_phone_secondary text, p_address text, p_capo_start_date date, p_operational_notes text, p_origin text';

  if position('returning * into v_patient;' in v_def)=0 then
    raise exception 'Contrato inesperado em create_patient_for_interface.';
  end if;

  v_def := replace(
    v_def,
    'returning * into v_patient;

  return query',
    'returning * into v_patient;

  if v_is_homologation and v_homologation_enabled then
    update public.homologation_contexts
       set test_patient_id=v_patient.id,
           reason=''Paciente teste recém-cadastrado selecionado automaticamente para continuidade da homologação.'',
           updated_at=clock_timestamp()
     where actor_account_id=v_account_id
       and is_enabled=true;
  end if;

  return query'
  );

  execute v_def;
end
$do$;
