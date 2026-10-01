create or replace function public.capo_patient_visible_in_current_context(p_patient_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth'
as $function$
declare
  v_is_test boolean;
  v_account_id uuid;
  v_is_homologation boolean := false;
  v_context_enabled boolean := false;
begin
  if p_patient_id is null then return true; end if;

  select coalesce(p.is_test,false) into v_is_test
  from public.patients p where p.id=p_patient_id;
  if not found then return false; end if;

  if auth.uid() is null then return not v_is_test; end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null or not v_is_homologation then
    return not v_is_test;
  end if;

  select coalesce(hc.is_enabled,false)
    into v_context_enabled
  from public.homologation_contexts hc
  where hc.actor_account_id=v_account_id;

  if not coalesce(v_context_enabled,false) then
    return not v_is_test;
  end if;

  return v_is_test;
end;
$function$;

revoke all on function public.capo_patient_visible_in_current_context(uuid) from public, anon;
grant execute on function public.capo_patient_visible_in_current_context(uuid) to authenticated, service_role;
