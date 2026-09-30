create sequence if not exists public.capo_test_patient_number_seq as bigint increment by 1 minvalue 1 start with 1;

do $$
declare v_next bigint;
begin
  select coalesce(max(case when patient_number ~ '^TESTE-CAPO-[0-9]+$'
    then substring(patient_number from '([0-9]+)$')::bigint else null end),0)+1
    into v_next
  from public.patients
  where coalesce(is_test,false)=true;
  perform setval('public.capo_test_patient_number_seq',greatest(v_next,1),false);
end $$;

create or replace function public.capo_generate_patient_number()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.patient_number is null or btrim(new.patient_number) = '' then
    if coalesce(new.is_test,false) then
      new.patient_number := 'TESTE-CAPO-' || lpad(nextval('public.capo_test_patient_number_seq')::text,4,'0');
    else
      new.patient_number := nextval('public.capo_patient_number_seq')::text;
    end if;
  end if;
  return new;
end;
$function$;

do $do$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='create_patient_for_interface'
    and pg_get_function_identity_arguments(p.oid)=
      'p_full_name text, p_birth_date date, p_cms text, p_sex text, p_phone text, p_phone_secondary text, p_address text, p_capo_start_date date, p_operational_notes text, p_origin text';

  if position('declare' in lower(v_def))=0 then
    raise exception 'Contrato inesperado em create_patient_for_interface.';
  end if;

  v_def := replace(v_def,
    'v_patient public.patients%rowtype;',
    'v_patient public.patients%rowtype;
  v_is_homologation boolean := false;
  v_homologation_enabled boolean := false;
  v_simulated_role text;
  v_can_create boolean := false;');

  v_def := replace(v_def,
    'select ua.id into v_account_id',
    'select ua.id,coalesce(ua.is_homologation_account,false)
      into v_account_id,v_is_homologation');

  v_def := replace(v_def,
    'if not (
        public.has_app_role(''administrador'')
        or public.has_app_role(''administrativo_operacional'')
    ) then
        raise exception ''Somente o Administrativo autorizado pode cadastrar pacientes.'' using errcode=''42501'';
    end if;',
    'if v_is_homologation then
    select coalesce(hc.is_enabled,false),ar.code
      into v_homologation_enabled,v_simulated_role
    from public.homologation_contexts hc
    left join public.app_roles ar on ar.id=hc.simulated_role_id
    where hc.actor_account_id=v_account_id;

    v_can_create := coalesce(v_homologation_enabled,false)
      and v_simulated_role in (''administrativo_operacional'',''administrador'');
  else
    v_can_create := public.has_app_role(''administrador'')
      or public.has_app_role(''administrativo_operacional'');
  end if;

  if not v_can_create then
    raise exception ''Somente o Administrativo autorizado pode cadastrar pacientes.'' using errcode=''42501'';
  end if;');

  v_def := replace(v_def,
    'full_name,cms,birth_date,sex,phone,phone_secondary,address,
        status,capo_start_date,notes,deceased,origin',
    'full_name,cms,birth_date,sex,phone,phone_secondary,address,
        status,capo_start_date,notes,deceased,origin,is_test,test_label');

  v_def := replace(v_def,
    '''ativo'',v_start_date,v_notes,false,v_origin',
    '''ativo'',v_start_date,v_notes,false,v_origin,
        v_is_homologation and v_homologation_enabled,
        case when v_is_homologation and v_homologation_enabled
          then ''Paciente criado em homologação controlada'' else null end');

  execute v_def;
end
$do$;
