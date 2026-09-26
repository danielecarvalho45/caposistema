update public.specialty_capabilities
set is_enabled=false
where capability_code='encaminhamento_interprofissional'
  and is_enabled is distinct from false;

create or replace function public.get_capability_catalog_for_interface()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
  ) then
    raise exception 'Conta administrativa inativa.' using errcode='42501';
  end if;
  if not coalesce(public.has_app_role('administrador'),false) then
    raise exception 'Somente o Administrador pode consultar o catálogo de capacidades.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'capabilities',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'capability_code',c.capability_code,
        'individual_assignable',c.capability_code='encaminhamento_interprofissional'
      ) order by c.capability_code)
      from (
        select distinct sc.capability_code from public.specialty_capabilities sc
        union
        select distinct pc.capability_code from public.professional_capabilities pc
      ) c
    ),'[]'::jsonb),
    'specialty_capabilities',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'specialty_id',s.id,
        'specialty_name',s.name,
        'capability_code',sc.capability_code,
        'is_enabled',sc.is_enabled
      ) order by s.name,sc.capability_code)
      from public.specialty_capabilities sc
      join public.specialties s on s.id=sc.specialty_id
      where s.is_active=true
    ),'[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;

revoke all on function public.get_capability_catalog_for_interface() from public,anon;
grant execute on function public.get_capability_catalog_for_interface() to authenticated;
