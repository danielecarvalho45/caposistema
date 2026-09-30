create schema if not exists private;

create or replace function private.capo_professional_visible_in_current_context(p_professional_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth'
as $function$
declare
  v_account_id uuid;
  v_is_homologation boolean := false;
  v_context_enabled boolean := false;
  v_role_code text;
  v_simulated_professional_id uuid;
  v_professional_is_homologation boolean := false;
begin
  if p_professional_id is null then
    return false;
  end if;

  select coalesce(p.is_homologation_profile,false)
    into v_professional_is_homologation
  from public.professionals p
  where p.id=p_professional_id;

  if not found then
    return false;
  end if;

  if auth.uid() is null then
    return not v_professional_is_homologation;
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    return false;
  end if;

  if not v_is_homologation then
    return not v_professional_is_homologation;
  end if;

  select coalesce(hc.is_enabled,false),ar.code,hc.simulated_professional_id
    into v_context_enabled,v_role_code,v_simulated_professional_id
  from public.homologation_contexts hc
  left join public.app_roles ar on ar.id=hc.simulated_role_id
  where hc.actor_account_id=v_account_id;

  if coalesce(v_context_enabled,false)
     and v_role_code='profissional'
     and v_simulated_professional_id is not null then
    return v_professional_is_homologation
       and p_professional_id=v_simulated_professional_id;
  end if;

  return v_professional_is_homologation;
end;
$function$;

revoke all on function private.capo_professional_visible_in_current_context(uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;

create or replace function private.capo_assert_patient_professional_same_environment(
  p_patient_id uuid,
  p_professional_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_patient_is_test boolean;
  v_professional_is_homologation boolean;
begin
  if p_patient_id is null or p_professional_id is null then
    return;
  end if;

  select coalesce(p.is_test,false)
    into v_patient_is_test
  from public.patients p
  where p.id=p_patient_id;

  if not found then
    raise exception 'Paciente não localizado para validação de ambiente.';
  end if;

  select coalesce(pr.is_homologation_profile,false)
    into v_professional_is_homologation
  from public.professionals pr
  where pr.id=p_professional_id;

  if not found then
    raise exception 'Profissional não localizado para validação de ambiente.';
  end if;

  if v_patient_is_test is distinct from v_professional_is_homologation then
    raise exception 'Mistura entre homologação e produção bloqueada.';
  end if;
end;
$function$;

revoke all on function private.capo_assert_patient_professional_same_environment(uuid,uuid)
  from public,anon,authenticated;

create or replace function private.capo_enforce_patient_professional_environment()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_row jsonb := to_jsonb(new);
  v_patient_id uuid;
  v_professional_id uuid;
  i integer;
begin
  if tg_nargs < 2 then
    raise exception 'Trigger de isolamento configurado sem colunas suficientes.';
  end if;

  v_patient_id := nullif(v_row->>tg_argv[0],'')::uuid;

  for i in 1..tg_nargs-1 loop
    v_professional_id := nullif(v_row->>tg_argv[i],'')::uuid;
    if v_professional_id is not null then
      perform private.capo_assert_patient_professional_same_environment(
        v_patient_id,
        v_professional_id
      );
    end if;
  end loop;

  return new;
end;
$function$;

revoke all on function private.capo_enforce_patient_professional_environment()
  from public,anon,authenticated;

drop trigger if exists trg_capo_environment_patient_appointments on public.patient_appointments;
create trigger trg_capo_environment_patient_appointments
before insert or update of patient_id,professional_id
on public.patient_appointments
for each row execute function private.capo_enforce_patient_professional_environment('patient_id','professional_id');

drop trigger if exists trg_capo_environment_nutrition_plans on public.nutrition_plans;
create trigger trg_capo_environment_nutrition_plans
before insert or update of patient_id,professional_id
on public.nutrition_plans
for each row execute function private.capo_enforce_patient_professional_environment('patient_id','professional_id');

drop trigger if exists trg_capo_environment_social_followup_cycles on public.social_followup_cycles;
create trigger trg_capo_environment_social_followup_cycles
before insert or update of patient_id,professional_id
on public.social_followup_cycles
for each row execute function private.capo_enforce_patient_professional_environment('patient_id','professional_id');

drop trigger if exists trg_capo_environment_patient_care_closures on public.patient_care_closures;
create trigger trg_capo_environment_patient_care_closures
before insert or update of patient_id,professional_id
on public.patient_care_closures
for each row execute function private.capo_enforce_patient_professional_environment('patient_id','professional_id');

drop trigger if exists trg_capo_environment_referrals on public.referrals;
create trigger trg_capo_environment_referrals
before insert or update of patient_id,requesting_professional_id,target_professional_id
on public.referrals
for each row execute function private.capo_enforce_patient_professional_environment(
  'patient_id','requesting_professional_id','target_professional_id'
);

drop trigger if exists trg_capo_environment_administrative_requests on public.administrative_requests;
create trigger trg_capo_environment_administrative_requests
before insert or update of patient_id,requesting_professional_id
on public.administrative_requests
for each row execute function private.capo_enforce_patient_professional_environment(
  'patient_id','requesting_professional_id'
);

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_scheduling_catalog'
    and pg_get_function_identity_arguments(p.oid)='';
  if position('public.capo_professional_is_production(p.id)' in v_def)=0 then
    raise exception 'Contrato inesperado em get_scheduling_catalog.';
  end if;
  v_def:=replace(v_def,
    'public.capo_professional_is_production(p.id)',
    'private.capo_professional_visible_in_current_context(p.id)');
  execute v_def;
end
$do$;

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_agenda_schedule_grid_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_start_date date, p_end_date date, p_professional_id uuid';
  if position('where p.status=''ativo''' in v_def)=0 then
    raise exception 'Contrato inesperado em get_agenda_schedule_grid_for_interface.';
  end if;
  v_def:=replace(v_def,
    'where p.status=''ativo''',
    'where p.status=''ativo'' and private.capo_professional_visible_in_current_context(p.id)');
  v_def:=replace(v_def,
    'v_general_access and public.capo_professional_is_production(p.id)',
    'v_general_access and private.capo_professional_visible_in_current_context(p.id)');
  execute v_def;
end
$do$;

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_coordinator_agenda_overview_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_start_date date, p_end_date date, p_specialty_id uuid, p_professional_id uuid';
  if position('where pr.status=''ativo''' in v_def)=0 then
    raise exception 'Contrato inesperado em get_coordinator_agenda_overview_for_interface.';
  end if;
  v_def:=replace(v_def,
    'where pr.status=''ativo''',
    'where pr.status=''ativo'' and private.capo_professional_visible_in_current_context(pr.id)');
  execute v_def;
end
$do$;

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_coordinator_team_overview_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_query text, p_specialty_id uuid, p_status text, p_start_date date, p_end_date date, p_limit integer, p_offset integer';
  if position('public.capo_professional_is_production(pr.id)' in v_def)=0 then
    raise exception 'Contrato inesperado em get_coordinator_team_overview_for_interface.';
  end if;
  v_def:=replace(v_def,
    'public.capo_professional_is_production(pr.id)',
    'private.capo_professional_visible_in_current_context(pr.id)');
  execute v_def;
end
$do$;

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_prescription_renewal_doctors_for_interface'
    and pg_get_function_identity_arguments(p.oid)='';
  if position('where public.is_active_clinical_doctor(p.id)' in v_def)=0 then
    raise exception 'Contrato inesperado em get_prescription_renewal_doctors_for_interface.';
  end if;
  v_def:=replace(v_def,
    'where public.is_active_clinical_doctor(p.id)',
    'where public.is_active_clinical_doctor(p.id) and private.capo_professional_visible_in_current_context(p.id)');
  execute v_def;
end
$do$;

do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_interprofessional_referral_targets_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_specialty_id uuid';
  if position('public.capo_professional_is_production(p.id)' in v_def)=0 then
    raise exception 'Contrato inesperado em get_interprofessional_referral_targets_for_interface.';
  end if;
  v_def:=replace(v_def,
    'public.capo_professional_is_production(p.id)',
    'private.capo_professional_visible_in_current_context(p.id)');
  execute v_def;
end
$do$;
