
-- Conta manuteste usa o papel simulado ativo, mantendo isolamento de dados.
create or replace function public.capo_internal_current_actor()
returns table(account_id uuid, administrative boolean, homologation boolean)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_role text;v_allowed boolean;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
   then raise exception 'Sessão válida e termo vigente obrigatórios.' using errcode='42501'; end if;
 select ua.id,coalesce(ua.is_homologation_account,false) into account_id,homologation
 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
 if account_id is null then raise exception 'Conta CAPO inativa.' using errcode='42501'; end if;
 if homologation then
   if not public.capo_homologation_context_enabled() then
     raise exception 'Contexto de homologação inativo.' using errcode='42501'; end if;
   v_role := public.capo_effective_role_code();
   administrative := v_role in ('administrador','administrativo_operacional');
   v_allowed := administrative or v_role='profissional';
 else
   administrative := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');
   v_allowed := administrative or public.has_app_role('profissional');
 end if;
 if not coalesce(v_allowed,false) then raise exception 'Perfil sem acesso à comunicação interna.' using errcode='42501'; end if;
 return next;
end $$;
revoke all on function public.capo_internal_current_actor() from public,anon,authenticated;
