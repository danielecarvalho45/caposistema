create or replace function public.resolve_user_primary_context(p_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_active_count integer := 0;
  v_configured_id uuid;
  v_configured_code text;
  v_configured_name text;
  v_sole_id uuid;
  v_sole_code text;
  v_sole_name text;
begin
  if p_user_account_id is null then
    return jsonb_build_object(
      'role_id',null,'code',null,'name',null,
      'source','none','is_configured',false,'requires_configuration',true
    );
  end if;

  select count(*) into v_active_count
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id and ar.is_active=true
  where ur.user_account_id=p_user_account_id;

  select ar.id,ar.code,ar.name
    into v_configured_id,v_configured_code,v_configured_name
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id and ar.is_active=true
  where ur.user_account_id=p_user_account_id and ur.is_primary=true
  limit 1;

  if v_configured_id is not null then
    return jsonb_build_object(
      'role_id',v_configured_id,'code',v_configured_code,'name',v_configured_name,
      'source','configured','is_configured',true,'requires_configuration',false
    );
  end if;

  if v_active_count = 1 then
    select ar.id,ar.code,ar.name
      into v_sole_id,v_sole_code,v_sole_name
    from public.user_roles ur
    join public.app_roles ar on ar.id=ur.role_id and ar.is_active=true
    where ur.user_account_id=p_user_account_id
    limit 1;

    return jsonb_build_object(
      'role_id',v_sole_id,'code',v_sole_code,'name',v_sole_name,
      'source','single_role','is_configured',false,'requires_configuration',false
    );
  end if;

  if v_active_count = 0 then
    return jsonb_build_object(
      'role_id',null,'code',null,'name',null,
      'source','none','is_configured',false,'requires_configuration',true
    );
  end if;

  return jsonb_build_object(
    'role_id',null,'code',null,'name',null,
    'source','ambiguous','is_configured',false,'requires_configuration',true
  );
end;
$function$;

create or replace function public.set_team_member_primary_context_for_interface(
  p_user_account_id uuid,
  p_role_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_caller_account_id uuid;
  v_role_code text := lower(btrim(coalesce(p_role_code,'')));
  v_target_role_id uuid;
  v_target_is_primary boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id into v_caller_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_caller_account_id is null then
    raise exception 'Conta administrativa inexistente ou inativa.' using errcode='42501';
  end if;

  if not coalesce(public.has_app_role('administrador'),false) then
    raise exception 'Somente o Administrador/Controlador pode definir o contexto principal da equipe.' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.user_accounts ua
    where ua.id=p_user_account_id and ua.is_active=true
  ) then
    raise exception 'Conta alvo inexistente ou inativa.';
  end if;

  if v_role_code='' then
    raise exception 'Informe o papel principal.';
  end if;

  select ar.id,ur.is_primary
    into v_target_role_id,v_target_is_primary
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=p_user_account_id
    and ar.code=v_role_code
    and ar.is_active=true
  limit 1;

  if v_target_role_id is null then
    raise exception 'O papel principal deve estar ativo e atribuído à conta.' using errcode='23514';
  end if;

  if coalesce(v_target_is_primary,false) then
    return jsonb_build_object(
      'success',true,'changed',false,'user_account_id',p_user_account_id,
      'primary_context',public.resolve_user_primary_context(p_user_account_id)
    );
  end if;

  update public.user_roles
     set is_primary=false
   where user_account_id=p_user_account_id
     and is_primary=true;

  update public.user_roles
     set is_primary=true
   where user_account_id=p_user_account_id
     and role_id=v_target_role_id;

  return jsonb_build_object(
    'success',true,'changed',true,'user_account_id',p_user_account_id,
    'primary_context',public.resolve_user_primary_context(p_user_account_id)
  );
end;
$function$;

revoke all on function public.resolve_user_primary_context(uuid) from public, anon;
grant execute on function public.resolve_user_primary_context(uuid) to authenticated;
revoke all on function public.set_team_member_primary_context_for_interface(uuid,text) from public, anon;
grant execute on function public.set_team_member_primary_context_for_interface(uuid,text) to authenticated;
