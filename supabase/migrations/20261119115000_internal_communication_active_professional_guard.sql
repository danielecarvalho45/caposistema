-- Bloquear acesso por conta profissional inativa, preservando gestor/AO sem vínculo assistencial.
CREATE OR REPLACE FUNCTION public.capo_internal_current_actor()
 RETURNS TABLE(account_id uuid, administrative boolean, homologation boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
 if not administrative and not exists (
   select 1 from public.professionals p
   where p.id=public.capo_effective_professional_id()
     and p.status='ativo' and p.is_professional=true
 ) then raise exception 'Vínculo profissional assistencial ativo obrigatório.' using errcode='42501'; end if;
 return next;
end $function$;
revoke all on function public.capo_internal_current_actor() from public,anon,authenticated;
