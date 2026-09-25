-- Vincula uma nova identidade a um profissional já cadastrado, sem duplicar o histórico.
create function public.link_existing_professional_account_for_interface(
  p_professional_id uuid, p_auth_user_id uuid, p_profile jsonb
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_professional public.professionals%rowtype;
  v_account_id uuid;
  v_email text := lower(btrim(p_profile->>'recoveryEmail'));
  v_username text := lower(btrim(p_profile->>'username'));
  v_roles text[];
  v_specialties uuid[];
  v_primary uuid;
  v_main_role text;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(), false)
     or not coalesce(public.has_app_role('administrador'), false)
     or not exists (select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active) then
    raise exception 'Acesso administrativo não autorizado.' using errcode='42501';
  end if;
  select * into v_professional from public.professionals where id=p_professional_id for update;
  if not found or exists (select 1 from public.user_accounts ua where ua.professional_id=p_professional_id) then
    raise exception 'Profissional inexistente ou já vinculado a uma conta.';
  end if;
  if not exists (select 1 from auth.users au where au.id=p_auth_user_id and lower(au.email)=v_email)
     or exists (select 1 from public.user_accounts ua where ua.auth_user_id=p_auth_user_id) then
    raise exception 'A identidade de acesso não corresponde ao e-mail informado.';
  end if;
  if length(btrim(coalesce(p_profile->>'fullName',''))) not between 3 and 150
     or v_username !~ '^[a-z0-9._-]{3,50}$'
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Confira nome, usuário e e-mail do profissional.';
  end if;
  if exists (select 1 from public.professionals p where p.id<>p_professional_id and lower(p.username)=v_username)
     or exists (select 1 from public.user_accounts ua where ua.username=v_username or lower(ua.recovery_email)=v_email)
     or exists (select 1 from public.professionals p where p.id<>p_professional_id and lower(p.recovery_email)=v_email) then
    raise exception 'Usuário ou e-mail já utilizado por outro cadastro.';
  end if;
  if jsonb_typeof(p_profile->'roleCodes')<>'array' or jsonb_typeof(p_profile->'specialtyIds')<>'array' then
    raise exception 'Selecione papéis e especialidades válidos.';
  end if;
  select array_agg(distinct x) into v_roles from jsonb_array_elements_text(p_profile->'roleCodes') x;
  select array_agg(distinct x::uuid) into v_specialties from jsonb_array_elements_text(p_profile->'specialtyIds') x;
  if coalesce(cardinality(v_roles),0)=0 or exists (
     select 1 from unnest(v_roles) x where not exists(select 1 from public.app_roles ar where ar.code=x and ar.is_active)
  ) then raise exception 'Selecione ao menos um papel de acesso válido.'; end if;
  if (p_profile->>'isProfessional')::boolean and coalesce(cardinality(v_specialties),0)=0 then
    raise exception 'Selecione ao menos uma especialidade.';
  end if;
  if exists (select 1 from unnest(v_specialties) x where not exists(select 1 from public.specialties s where s.id=x and s.is_active)) then
    raise exception 'Especialidade inexistente ou inativa.';
  end if;
  v_primary := nullif(p_profile->>'primarySpecialtyId','')::uuid;
  if v_primary is not null and not (v_primary=any(v_specialties)) then
    raise exception 'A especialidade principal deve estar entre as selecionadas.';
  end if;
  if coalesce(p_profile->>'functionTitle','')='' then raise exception 'Informe a função exercida.'; end if;
  if length(coalesce(p_profile->>'functionTitle',''))>120 or length(coalesce(p_profile->>'phone',''))>30
     or length(coalesce(p_profile->>'professionalRegistration',''))>80
     or length(coalesce(p_profile->>'administrativeResponsibility',''))>200 then
    raise exception 'Um dos campos excede o limite permitido.';
  end if;
  update public.professionals set
    full_name=btrim(p_profile->>'fullName'), username=v_username, recovery_email=v_email,
    function_title=nullif(btrim(p_profile->>'functionTitle'),''),
    phone=nullif(btrim(p_profile->>'phone'),''),
    professional_registration=nullif(btrim(p_profile->>'professionalRegistration'),''),
    administrative_responsibility=nullif(btrim(p_profile->>'administrativeResponsibility'),''),
    birth_date=nullif(p_profile->>'birthDate','')::date,
    is_professional=coalesce((p_profile->>'isProfessional')::boolean,true),
    must_change_password=true, first_access_completed=false, updated_at=now()
  where id=p_professional_id;
  insert into public.user_accounts(auth_user_id,professional_id,username,recovery_email,is_active,created_at,updated_at)
  values(p_auth_user_id,p_professional_id,v_username,v_email,v_professional.status='ativo',now(),now())
  returning id into v_account_id;
  v_main_role := case when 'administrador'=any(v_roles) then 'administrador'
    when (p_profile->>'isProfessional')::boolean and 'profissional'=any(v_roles) then 'profissional'
    else v_roles[1] end;
  insert into public.user_roles(user_account_id,role_id,is_primary)
    select v_account_id, ar.id, ar.code=v_main_role from public.app_roles ar where ar.code=any(v_roles);
  delete from public.professional_specialties ps where ps.professional_id=p_professional_id
    and not (ps.specialty_id=any(coalesce(v_specialties,array[]::uuid[])));
  update public.professional_specialties ps set is_primary=(ps.specialty_id=v_primary)
    where ps.professional_id=p_professional_id;
  insert into public.professional_specialties(professional_id,specialty_id,is_primary)
    select p_professional_id,sid,sid=v_primary from unnest(coalesce(v_specialties,array[]::uuid[])) sid
    on conflict(professional_id,specialty_id) do update set is_primary=excluded.is_primary;
  return jsonb_build_object('professional_id',p_professional_id,'user_account_id',v_account_id,'status',v_professional.status,'first_access_completed',false);
end;
$$;
revoke all on function public.link_existing_professional_account_for_interface(uuid,uuid,jsonb) from public, anon;
grant execute on function public.link_existing_professional_account_for_interface(uuid,uuid,jsonb) to authenticated;

-- A conta com vários papéis precisa de um contexto inicial explícito.
create or replace function public.create_team_member_with_status_for_interface(
  p_auth_user_id uuid, p_full_name text, p_username text,
  p_recovery_email text, p_phone text, p_function_title text,
  p_professional_registration text, p_administrative_responsibility text,
  p_is_professional boolean, p_role_codes text[], p_specialty_ids uuid[],
  p_primary_specialty_id uuid, p_birth_date date default null,
  p_initially_active boolean default true, p_inactive_reason text default null
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_member jsonb; v_role text;
begin
  if p_initially_active is null then raise exception 'Informe a situação inicial.'; end if;
  if not p_initially_active and (length(btrim(coalesce(p_inactive_reason,''))) < 5 or length(p_inactive_reason) > 500) then
    raise exception 'Informe o motivo da inativação com 5 a 500 caracteres.';
  end if;
  v_member := public.create_team_member_profile_for_interface(
    p_auth_user_id, p_full_name, p_username, p_recovery_email, p_phone,
    p_function_title, p_professional_registration, p_administrative_responsibility,
    p_is_professional, p_role_codes, p_specialty_ids, p_primary_specialty_id, p_birth_date
  );
  v_role := case when 'administrador'=any(p_role_codes) then 'administrador'
    when p_is_professional and 'profissional'=any(p_role_codes) then 'profissional'
    else p_role_codes[1] end;
  update public.user_roles ur set is_primary=(ar.code=v_role)
    from public.app_roles ar where ar.id=ur.role_id
      and ur.user_account_id=(v_member->>'user_account_id')::uuid;
  if not p_initially_active then
    perform public.set_team_member_active_for_interface(
      (v_member->>'professional_id')::uuid, false, p_inactive_reason
    );
  end if;
  return v_member || jsonb_build_object('status', case when p_initially_active then 'ativo' else 'inativo' end);
end;
$$;
