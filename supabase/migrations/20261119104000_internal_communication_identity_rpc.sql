
-- Conta do usuário para identificar a própria participação sem expor user_accounts ao cliente.
create or replace function public.get_my_internal_communication_identity_for_interface()
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor record;
begin
 select * into v_actor from public.capo_internal_current_actor();
 return jsonb_build_object('account_id',v_actor.account_id,
   'administrative',v_actor.administrative,'homologation',v_actor.homologation);
end $$;
revoke all on function public.get_my_internal_communication_identity_for_interface() from public,anon;
grant execute on function public.get_my_internal_communication_identity_for_interface() to authenticated;
