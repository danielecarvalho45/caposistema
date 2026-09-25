CREATE OR REPLACE FUNCTION public.get_my_access_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare
  v_account record;
  v_real_prof public.professionals%rowtype;
  v_effective_prof public.professionals%rowtype;
  v_ctx record;
  v_enabled boolean:=false;
  v_roles jsonb:='[]'::jsonb;
  v_real_roles jsonb:='[]'::jsonb;
  v_capabilities jsonb:='[]'::jsonb;
  v_effective_professional_id uuid;
  v_real_primary_context jsonb;
  v_effective_primary_context jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if not public.has_accepted_current_legal_term() then raise exception 'É necessário aceitar o termo vigente.' using errcode='42501'; end if;

  select ua.* into v_account
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account.id is null then raise exception 'Conta de usuário inexistente ou inativa.' using errcode='42501'; end if;

  if v_account.professional_id is not null then select p.* into v_real_prof from public.professionals p where p.id=v_account.professional_id; end if;

  select hc.*,ar.code role_code,ar.name role_name,sp.name specialty_name,pt.full_name test_patient_name
    into v_ctx
  from public.homologation_contexts hc
  left join public.app_roles ar on ar.id=hc.simulated_role_id
  left join public.specialties sp on sp.id=hc.simulated_specialty_id
  left join public.patients pt on pt.id=hc.test_patient_id
  where hc.actor_account_id=v_account.id;

  v_enabled:=coalesce(v_account.is_homologation_account,false) and coalesce(v_ctx.is_enabled,false);

  if v_enabled and v_ctx.simulated_professional_id is not null then
    select p.* into v_effective_prof from public.professionals p where p.id=v_ctx.simulated_professional_id;
    v_effective_professional_id:=v_ctx.simulated_professional_id;
  else
    v_effective_prof:=v_real_prof;
    v_effective_professional_id:=v_account.professional_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('code',ar.code,'name',ar.name) order by ar.code),'[]'::jsonb)
    into v_real_roles
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id and ar.is_active=true
  where ur.user_account_id=v_account.id;

  if v_enabled and v_ctx.role_code is not null then
    v_roles:=jsonb_build_array(jsonb_build_object('code',v_ctx.role_code,'name',v_ctx.role_name));
  else
    v_roles:=v_real_roles;
  end if;

  if v_effective_professional_id is not null then
    select coalesce(jsonb_agg(c.capability_code order by c.capability_code),'[]'::jsonb)
      into v_capabilities
      from public.get_effective_professional_capabilities(v_effective_professional_id) c;
  end if;

  v_real_primary_context:=public.resolve_user_primary_context(v_account.id);
  if v_enabled and v_ctx.role_code is not null then
    v_effective_primary_context:=jsonb_build_object(
      'role_id',v_ctx.simulated_role_id,
      'code',v_ctx.role_code,
      'name',v_ctx.role_name,
      'source','homologation',
      'is_configured',false,
      'requires_configuration',false
    );
  else
    v_effective_primary_context:=v_real_primary_context;
  end if;

  return jsonb_build_object(
    'user_account_id',v_account.id,
    'username',v_account.username,
    'is_active',v_account.is_active,
    'recovery_email',v_account.recovery_email,
    'primary_specialty_name',case
      when v_enabled and v_ctx.simulated_specialty_id is not null then v_ctx.specialty_name
      else (
        select sp.name from public.professional_specialties ps
        join public.specialties sp on sp.id=ps.specialty_id and sp.is_active=true
        where ps.professional_id=v_effective_professional_id
        order by ps.is_primary desc, ps.created_at, sp.name
        limit 1
      )
    end,
    'professional_id',v_effective_prof.id,
    'full_name',v_effective_prof.full_name,
    'function_title',v_effective_prof.function_title,
    'professional_registration',v_effective_prof.professional_registration,
    'administrative_responsibility',v_effective_prof.administrative_responsibility,
    'first_access_completed',v_real_prof.first_access_completed,
    'must_change_password',v_real_prof.must_change_password,
    'roles',v_roles,
    'capabilities',v_capabilities,
    'primary_context',v_effective_primary_context,
    'is_homologation_account',coalesce(v_account.is_homologation_account,false),
    'real_identity',jsonb_build_object(
      'professional_id',v_real_prof.id,
      'full_name',v_real_prof.full_name,
      'function_title',v_real_prof.function_title,
      'roles',v_real_roles,
      'primary_context',v_real_primary_context
    ),
    'homologation_context',case when coalesce(v_account.is_homologation_account,false) then jsonb_build_object(
      'enabled',v_enabled,
      'role_code',v_ctx.role_code,
      'role_name',v_ctx.role_name,
      'professional_id',v_ctx.simulated_professional_id,
      'professional_name',case when v_ctx.simulated_professional_id is null then null else (select p.full_name from public.professionals p where p.id=v_ctx.simulated_professional_id) end,
      'specialty_id',v_ctx.simulated_specialty_id,
      'specialty_name',v_ctx.specialty_name,
      'test_patient_id',v_ctx.test_patient_id,
      'test_patient_name',v_ctx.test_patient_name,
      'reason',v_ctx.reason,
      'started_at',v_ctx.started_at
    ) else null end
  );
end;
$function$
;
