-- CAPO — Relatórios gerenciais em contexto controlado de homologação.
-- Preserva a autorização real de administrador/coordenador e reconhece apenas
-- a simulação ativa de coordenador em conta explicitamente marcada para homologação.

do $$
declare
  v_definition text;
  v_old text := $old$
  select case when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='administrador') then 'administrador'
              when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='coordenador') then 'coordenador' else null end into v_role_code;
$old$;
  v_new text := $new$
  select case
              when exists(
                select 1
                from public.homologation_contexts hc
                join public.user_accounts hua on hua.id=hc.actor_account_id
                join public.app_roles har on har.id=hc.simulated_role_id and har.is_active=true
                where hc.actor_account_id=v_account_id
                  and hua.is_homologation_account=true
                  and hc.is_enabled=true
                  and har.code='coordenador'
              ) then 'coordenador'
              when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='administrador') then 'administrador'
              when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='coordenador') then 'coordenador'
              else null
            end into v_role_code;
$new$;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='get_reports_dashboard_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_start_date date, p_end_date date, p_specialty_id uuid';

  if v_definition is null then
    raise exception 'Função get_reports_dashboard_for_interface não encontrada.';
  end if;

  if position(v_new in v_definition)>0 then
    return;
  end if;

  if position(v_old in v_definition)=0 then
    raise exception 'Contrato conhecido da autorização de relatórios não localizado.';
  end if;

  execute replace(v_definition, v_old, v_new);
end
$$;
