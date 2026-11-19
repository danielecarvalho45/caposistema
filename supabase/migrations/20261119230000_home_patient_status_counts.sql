-- CAPO: contadores da Home Gestor, isolados por ambiente e paciente distinto.
create or replace function public.get_home_patient_status_counts_for_interface()
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_is_test boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Perfil sem autorização para os indicadores de pacientes.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
  ) then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;
  v_is_test := coalesce(public.capo_is_homologation_account(), false);
  with awaiting as (
    select distinct s.patient_id
    from public.patient_active_searches s
    where s.search_type in ('initial','offer_rescue')
      and s.flow_status='ativo'
      and s.closed_at is null
      and s.accepted_service is distinct from true
  ),
  classified as (
    select
      p.id,
      p.status,
      coalesce(p.deceased,false) as deceased,
      (a.patient_id is not null) as waiting
    from public.patients p
    left join awaiting a on a.patient_id=p.id
    where coalesce(p.is_test,false)=v_is_test
  )
  select jsonb_build_object(
    'registered', count(*),
    'active', count(*) filter(where status='ativo' and not deceased and not waiting),
    'awaiting_response', count(*) filter(where status='ativo' and not deceased and waiting),
    'closed', count(*) filter(where status in ('encerrado','inativo','obito') or deceased),
    'scope', case when v_is_test then 'homologation' else 'production' end
  ) into v_result
  from classified;
  return v_result;
end;
$function$;

revoke all on function public.get_home_patient_status_counts_for_interface() from public, anon;
grant execute on function public.get_home_patient_status_counts_for_interface() to authenticated;
