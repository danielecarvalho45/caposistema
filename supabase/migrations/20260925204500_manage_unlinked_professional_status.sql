-- Profissionais anteriores à implantação do login podem ser inativados sem criar uma conta.
create function public.set_unlinked_professional_active_for_interface(
  p_professional_id uuid, p_active boolean, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_status text;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
     or not coalesce(public.has_app_role('administrador'),false)
     or not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active) then
    raise exception 'Acesso administrativo não autorizado.' using errcode='42501';
  end if;
  if p_active is null or (not p_active and length(btrim(coalesce(p_reason,''))) not between 5 and 500) then
    raise exception 'Informe o motivo da inativação com 5 a 500 caracteres.';
  end if;
  select p.status into v_status from public.professionals p where p.id=p_professional_id for update;
  if not found or exists(select 1 from public.user_accounts ua where ua.professional_id=p_professional_id) then
    raise exception 'Profissional não encontrado ou já vinculado a uma conta.';
  end if;
  update public.professionals set
    status=case when p_active then 'ativo' else 'inativo' end,
    deactivated_at=case when p_active then null else now() end,
    deactivation_reason=case when p_active then null else btrim(p_reason) end,
    updated_at=now()
  where id=p_professional_id;
  return jsonb_build_object('professional_id',p_professional_id,'active',p_active,'success',true);
end;
$$;
revoke all on function public.set_unlinked_professional_active_for_interface(uuid,boolean,text) from public, anon;
grant execute on function public.set_unlinked_professional_active_for_interface(uuid,boolean,text) to authenticated;
