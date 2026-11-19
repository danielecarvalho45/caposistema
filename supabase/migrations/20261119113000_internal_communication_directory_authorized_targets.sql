-- O catálogo identifica destinatários aptos a demandas, sem depender de cargo textual.
CREATE OR REPLACE FUNCTION public.get_internal_communication_recipients_for_interface()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_actor record;
begin
 select * into v_actor from public.capo_internal_current_actor();
 return coalesce((
  select jsonb_agg(jsonb_build_object('account_id',ua.id,'name',
    coalesce(nullif(btrim(p.full_name),''),nullif(btrim(ua.username),''),'Profissional CAPO'),
    'function_title',coalesce(p.function_title,'Administrativo'),
    'can_receive_admin_demand',coalesce(p.is_professional,false) and p.status='ativo'
      and exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
        where ur.user_account_id=ua.id and ar.code='profissional' and ar.is_active=true)) order by coalesce(p.full_name,ua.username))
  from public.user_accounts ua
  left join public.professionals p on p.id=ua.professional_id
  where ua.is_active=true and ua.auth_user_id is not null and ua.id<>v_actor.account_id
    and coalesce(ua.is_homologation_account,false)=v_actor.homologation
    and (exists(
      select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
      where ur.user_account_id=ua.id and ar.code in ('administrador','administrativo_operacional','profissional') and ar.is_active=true
    ))
    and (p.id is null or p.status='ativo')
 ),'[]'::jsonb);
end $function$;
