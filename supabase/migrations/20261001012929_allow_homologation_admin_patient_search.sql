create or replace function public.search_patients_for_interface(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  patient_id uuid,
  full_name text,
  patient_number text,
  cms text,
  birth_date date,
  age integer,
  status text,
  deceased boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth'
as $function$
declare
  v_query text;
  v_account_id uuid;
  v_is_homologation boolean := false;
  v_homologation_enabled boolean := false;
  v_simulated_role text;
  v_can_search boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  if not public.has_accepted_current_legal_term() then
    raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
  end if;

  select ua.id, coalesce(ua.is_homologation_account,false)
    into v_account_id, v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;

  if v_is_homologation then
    select coalesce(hc.is_enabled,false), ar.code
      into v_homologation_enabled, v_simulated_role
    from public.homologation_contexts hc
    left join public.app_roles ar on ar.id=hc.simulated_role_id
    where hc.actor_account_id=v_account_id;

    v_can_search :=
      coalesce(v_homologation_enabled,false)
      and v_simulated_role in ('administrador','administrativo_operacional','coordenador');
  else
    v_can_search :=
      public.has_app_role('administrador')
      or public.has_app_role('administrativo_operacional')
      or public.has_app_role('coordenador');
  end if;

  if not v_can_search then
    raise exception 'Perfil sem autorização para pesquisar pacientes.' using errcode='42501';
  end if;

  v_query := btrim(coalesce(p_query,''));

  if char_length(v_query) < 2 and v_query !~ '^[0-9]$' then
    raise exception 'Informe pelo menos 2 caracteres ou o Nº CAPO exato.' using errcode='22023';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.patient_number,
    p.cms,
    p.birth_date,
    case
      when p.birth_date is null then null
      else extract(year from age(current_date,p.birth_date))::integer
    end,
    p.status,
    p.deceased,
    count(*) over()
  from public.patients p
  where public.capo_patient_visible_in_current_context(p.id)
    and (
      lower(coalesce(p.patient_number,'')) = lower(v_query)
      or (
        char_length(v_query) >= 2
        and lower(coalesce(p.cms,'')) = lower(v_query)
      )
      or (
        char_length(v_query) >= 3
        and position(lower(v_query) in lower(p.full_name)) > 0
      )
    )
  order by
    case
      when lower(coalesce(p.patient_number,'')) = lower(v_query) then 1
      when lower(coalesce(p.cms,'')) = lower(v_query) then 2
      when lower(p.full_name) = lower(v_query) then 3
      else 4
    end,
    p.full_name,
    p.id
  limit least(greatest(coalesce(p_limit,20),1),20)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

revoke all on function public.search_patients_for_interface(text,integer,integer) from public, anon;
grant execute on function public.search_patients_for_interface(text,integer,integer) to authenticated, service_role;
