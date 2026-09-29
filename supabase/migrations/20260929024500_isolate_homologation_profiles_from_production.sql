alter table public.professionals
  add column if not exists is_homologation_profile boolean not null default false;

update public.professionals
set is_homologation_profile=true,
    updated_at=clock_timestamp()
where full_name in (
  'Homologação — Médico Clínico Geral',
  'Homologação — Nutrição',
  'Homologação — Assistência Social',
  'Homologação — Psicologia',
  'Homologação — Fisioterapia'
);

create or replace function public.capo_professional_is_production(p_professional_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
  select exists (
    select 1
    from public.professionals p
    where p.id=p_professional_id
      and not coalesce(p.is_homologation_profile,false)
  );
$function$;

do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_coordinator_team_overview_for_interface'
  limit 1;
  if v_def is not null and position('public.capo_professional_is_production(pr.id)' in v_def)=0 then
    v_def:=replace(
      v_def,
      'from public.professionals pr
    where (v_status is null or pr.status=v_status)',
      'from public.professionals pr
    where public.capo_professional_is_production(pr.id)
      and (v_status is null or pr.status=v_status)'
    );
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_team_management_context_for_interface'
  limit 1;
  if v_def is not null and position('public.capo_professional_is_production(pr.id)' in v_def)=0 then
    v_def:=replace(
      v_def,
      'left join public.user_accounts ua on ua.professional_id = pr.id
        where (',
      'left join public.user_accounts ua on ua.professional_id = pr.id
        where public.capo_professional_is_production(pr.id)
          and ('
    );
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_interprofessional_referral_targets_for_interface'
  limit 1;
  if v_def is not null and position('public.capo_professional_is_production(p.id)' in v_def)=0 then
    v_def:=replace(
      v_def,
      'where ps.specialty_id=p_specialty_id
    and p.status=''ativo''',
      'where ps.specialty_id=p_specialty_id
    and public.capo_professional_is_production(p.id)
    and p.status=''ativo'''
    );
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_eligible_care_closure_professionals_for_interface_hom02_raw'
  limit 1;
  if v_def is not null and position('public.capo_professional_is_production(pr.id)' in v_def)=0 then
    v_def:=replace(
      v_def,
      'where pr.status=''ativo'' and pr.is_professional=true and s.is_active=true',
      'where public.capo_professional_is_production(pr.id)
    and pr.status=''ativo'' and pr.is_professional=true and s.is_active=true'
    );
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_birthdays_for_interface'
  limit 1;
  if v_def is not null and position('public.capo_professional_is_production(pr.id)' in v_def)=0 then
    v_def:=replace(
      v_def,
      'from public.professionals pr
  where pr.birth_date is not null',
      'from public.professionals pr
  where public.capo_professional_is_production(pr.id)
    and pr.birth_date is not null'
    );
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_homologation_options_for_interface'
  limit 1;
  if v_def is not null then
    v_def:=replace(
      v_def,
      '''is_homologation_stub'',lower(p.full_name) like ''homologação — %''',
      '''is_homologation_stub'',coalesce(p.is_homologation_profile,false)'
    );
    v_def:=replace(
      v_def,
      'case when lower(p.full_name) like ''homologação — %'' then 1 else 0 end',
      'case when coalesce(p.is_homologation_profile,false) then 1 else 0 end'
    );
    execute v_def;
  end if;
end $$;

create or replace function public.get_scheduling_catalog()
returns table(
  specialty_id uuid,
  specialty_name text,
  professional_id uuid,
  professional_name text,
  function_title text,
  professional_registration text,
  is_primary boolean
)
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  if not public.has_accepted_current_legal_term() then
    raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
  end if;

  if not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador')
  ) then
    raise exception 'Perfil sem autorização para acessar o agendamento geral.' using errcode='42501';
  end if;

  return query
  select
    s.id,
    s.name,
    p.id,
    p.full_name,
    p.function_title,
    p.professional_registration,
    ps.is_primary
  from public.specialties s
  join public.professional_specialties ps on ps.specialty_id=s.id
  join public.professionals p on p.id=ps.professional_id
  where s.is_active=true
    and public.capo_professional_is_production(p.id)
    and p.status='ativo'
    and p.is_professional=true
    and exists (
      select 1
      from public.agenda_configs ac
      where ac.professional_id=p.id
        and ac.is_active=true
    )
  order by s.name,ps.is_primary desc,p.full_name;
end;
$function$;
