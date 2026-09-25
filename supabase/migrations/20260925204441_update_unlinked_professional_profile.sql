-- Permite editar profissionais anteriores à implantação do login sem criar conta de acesso.
create or replace function public.update_unlinked_professional_profile_for_interface(
  p_professional_id uuid,
  p_profile jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_username text := lower(btrim(coalesce(p_profile->>'username','')));
  v_email text := lower(btrim(coalesce(p_profile->>'recoveryEmail','')));
  v_specialties uuid[] := coalesce(
    array(select value::uuid from jsonb_array_elements_text(coalesce(p_profile->'specialtyIds','[]'::jsonb))),
    array[]::uuid[]
  );
  v_primary uuid := nullif(p_profile->>'primarySpecialtyId','')::uuid;
  v_is_professional boolean := coalesce((p_profile->>'isProfessional')::boolean,true);
begin
  if auth.uid() is null
     or not coalesce(public.has_accepted_current_legal_term(),false)
     or not coalesce(public.has_app_role('administrador'),false)
     or not exists(
       select 1 from public.user_accounts ua
       where ua.auth_user_id=auth.uid() and ua.is_active=true
     ) then
    raise exception 'Acesso administrativo não autorizado.' using errcode='42501';
  end if;

  if not exists(select 1 from public.professionals p where p.id=p_professional_id)
     or exists(select 1 from public.user_accounts ua where ua.professional_id=p_professional_id) then
    raise exception 'Profissional não encontrado ou já vinculado a uma conta.';
  end if;

  if nullif(btrim(coalesce(p_profile->>'fullName','')),'') is null
     or char_length(btrim(p_profile->>'fullName')) > 150 then
    raise exception 'Nome completo inválido.';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,50}$' then
    raise exception 'Nome de usuário inválido.';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(v_email) > 254 then
    raise exception 'E-mail de recuperação inválido.';
  end if;

  if nullif(btrim(coalesce(p_profile->>'functionTitle','')),'') is null
     or char_length(coalesce(p_profile->>'functionTitle','')) > 120
     or char_length(coalesce(p_profile->>'phone','')) > 30
     or char_length(coalesce(p_profile->>'professionalRegistration','')) > 80
     or char_length(coalesce(p_profile->>'administrativeResponsibility','')) > 200 then
    raise exception 'Confira a função e os limites dos campos informados.';
  end if;

  if exists (
    select 1 from public.professionals p
    where p.id <> p_professional_id and lower(coalesce(p.username,''))=v_username
  ) or exists (
    select 1 from public.user_accounts ua where lower(coalesce(ua.username,''))=v_username
  ) then
    raise exception 'Nome de usuário já utilizado.';
  end if;

  if exists (
    select 1 from public.professionals p
    where p.id <> p_professional_id and lower(coalesce(p.recovery_email,''))=v_email
  ) or exists (
    select 1 from public.user_accounts ua where lower(coalesce(ua.recovery_email,''))=v_email
  ) then
    raise exception 'E-mail de recuperação já utilizado.';
  end if;

  if v_is_professional and cardinality(v_specialties)=0 then
    raise exception 'Selecione ao menos uma especialidade.';
  end if;

  if exists (
    select 1 from unnest(v_specialties) sid
    where not exists(select 1 from public.specialties s where s.id=sid and s.is_active=true)
  ) then
    raise exception 'Existe especialidade inexistente ou inativa.';
  end if;

  if v_primary is not null and not (v_primary=any(v_specialties)) then
    raise exception 'A especialidade principal deve estar entre as selecionadas.';
  end if;

  update public.professionals
  set full_name=btrim(p_profile->>'fullName'),
      username=v_username,
      recovery_email=v_email,
      phone=nullif(btrim(p_profile->>'phone'),''),
      function_title=nullif(btrim(p_profile->>'functionTitle'),''),
      professional_registration=nullif(btrim(p_profile->>'professionalRegistration'),''),
      administrative_responsibility=nullif(btrim(p_profile->>'administrativeResponsibility'),''),
      birth_date=nullif(p_profile->>'birthDate','')::date,
      is_professional=v_is_professional,
      updated_at=now()
  where id=p_professional_id;

  delete from public.professional_specialties ps
  where ps.professional_id=p_professional_id
    and not (ps.specialty_id=any(v_specialties));

  update public.professional_specialties ps
  set is_primary=(ps.specialty_id=v_primary)
  where ps.professional_id=p_professional_id
    and ps.specialty_id=any(v_specialties);

  insert into public.professional_specialties(professional_id,specialty_id,is_primary)
  select p_professional_id,sid,sid=v_primary
  from unnest(v_specialties) sid
  where not exists(
    select 1 from public.professional_specialties ps
    where ps.professional_id=p_professional_id and ps.specialty_id=sid
  );

  return jsonb_build_object(
    'success',true,
    'professional_id',p_professional_id,
    'linked_account',false,
    'username',v_username,
    'recovery_email',v_email,
    'specialty_ids',v_specialties,
    'primary_specialty_id',v_primary,
    'updated_at',now()
  );
end;
$$;

revoke all on function public.update_unlinked_professional_profile_for_interface(uuid,jsonb) from public, anon;
grant execute on function public.update_unlinked_professional_profile_for_interface(uuid,jsonb) to authenticated;
