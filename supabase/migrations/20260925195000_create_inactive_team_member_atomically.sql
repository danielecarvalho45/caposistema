-- O cadastro e a inativação inicial são uma única transação no banco.
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
declare v_member jsonb;
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
  if not p_initially_active then
    perform public.set_team_member_active_for_interface(
      (v_member->>'professional_id')::uuid, false, p_inactive_reason
    );
  end if;
  return v_member || jsonb_build_object('status', case when p_initially_active then 'ativo' else 'inativo' end);
end;
$$;
revoke all on function public.create_team_member_with_status_for_interface(uuid,text,text,text,text,text,text,text,boolean,text[],uuid[],uuid,date,boolean,text) from public;
grant execute on function public.create_team_member_with_status_for_interface(uuid,text,text,text,text,text,text,text,boolean,text[],uuid[],uuid,date,boolean,text) to authenticated;
