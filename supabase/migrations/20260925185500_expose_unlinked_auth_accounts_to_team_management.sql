CREATE OR REPLACE FUNCTION public.get_team_management_context_for_interface(p_query text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_user_account_id uuid;
    v_result jsonb;
begin
    if auth.uid() is null then
        raise exception 'Sessão não autenticada.';
    end if;

    if not public.has_accepted_current_legal_term() then
        raise exception 'É necessário aceitar o termo vigente.';
    end if;

    select ua.id
      into v_user_account_id
      from public.user_accounts ua
     where ua.auth_user_id = auth.uid()
       and ua.is_active = true
     limit 1;

    if v_user_account_id is null then
        raise exception 'Conta inexistente ou inativa.';
    end if;

    if not exists (
        select 1
          from public.user_roles ur
          join public.app_roles ar on ar.id = ur.role_id
         where ur.user_account_id = v_user_account_id
           and ar.is_active = true
           and ar.code = 'administrador'
    ) then
        raise exception 'Somente o Administrador/Controlador pode administrar a equipe.';
    end if;

    if length(btrim(coalesce(p_query, ''))) > 100 then
        raise exception 'Pesquisa excede 100 caracteres.';
    end if;

    if p_status is not null and lower(btrim(p_status)) not in ('ativo', 'inativo') then
        raise exception 'Situação permitida: ativo ou inativo.';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 100 then
        raise exception 'Limite deve estar entre 1 e 100.';
    end if;

    if p_offset is null or p_offset < 0 then
        raise exception 'Offset inválido.';
    end if;

    with equipe_filtrada as (
        select
            pr.id as professional_id,
            ua.id as user_account_id,
            pr.full_name,
            pr.birth_date,
            coalesce(ua.username, pr.username) as username,
            coalesce(ua.recovery_email, pr.recovery_email) as recovery_email,
            pr.phone,
            pr.function_title,
            pr.professional_registration,
            pr.administrative_responsibility,
            pr.is_professional,
            pr.status,
            coalesce(ua.is_active, false) as account_is_active,
            pr.must_change_password,
            pr.first_access_completed,
            pr.last_login_at,
            pr.deactivated_at,
            pr.deactivation_reason,
            pr.created_at,
            pr.updated_at,
            coalesce((
                select jsonb_agg(
                    jsonb_build_object('role_id', ar.id, 'code', ar.code, 'name', ar.name, 'is_primary', ur.is_primary)
                    order by ar.name
                )
                from public.user_roles ur
                join public.app_roles ar on ar.id = ur.role_id
                where ur.user_account_id = ua.id and ar.is_active = true
            ), '[]'::jsonb) as roles,
            public.resolve_user_primary_context(ua.id) as primary_context,
            coalesce((
                select jsonb_agg(
                    jsonb_build_object('specialty_id', sp.id, 'name', sp.name, 'is_primary', ps.is_primary)
                    order by ps.is_primary desc, sp.name
                )
                from public.professional_specialties ps
                join public.specialties sp on sp.id = ps.specialty_id
                where ps.professional_id = pr.id
            ), '[]'::jsonb) as specialties
        from public.professionals pr
        left join public.user_accounts ua on ua.professional_id = pr.id
        where (
            nullif(btrim(coalesce(p_query, '')), '') is null
            or pr.full_name ilike '%' || btrim(p_query) || '%'
            or coalesce(ua.username, pr.username, '') ilike '%' || btrim(p_query) || '%'
            or coalesce(pr.professional_registration, '') ilike '%' || btrim(p_query) || '%'
        )
        and (p_status is null or pr.status = lower(btrim(p_status)))
    ),
    equipe_paginada as (
        select * from equipe_filtrada
        order by full_name
        limit p_limit offset p_offset
    )
    select jsonb_build_object(
        'team', coalesce((
            select jsonb_agg(to_jsonb(ep) order by ep.full_name)
            from equipe_paginada ep
        ), '[]'::jsonb),
        'roles', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'role_id', ar.id,
                    'code', ar.code,
                    'name', ar.name,
                    'description', ar.description
                ) order by ar.name
            )
            from public.app_roles ar
            where ar.is_active = true
        ), '[]'::jsonb),
        'specialties', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'specialty_id', sp.id,
                    'name', sp.name,
                    'description', sp.description
                ) order by sp.name
            )
            from public.specialties sp
            where sp.is_active = true
        ), '[]'::jsonb),
        'available_user_accounts', coalesce((
            select jsonb_agg(
                jsonb_build_object('auth_user_id', au.id, 'email', au.email)
                order by au.email
            )
            from auth.users au
            where au.email is not null
              and not exists (
                  select 1 from public.user_accounts ua
                  where ua.auth_user_id = au.id
              )
        ), '[]'::jsonb),
        'total_count', (select count(*) from equipe_filtrada),
        'limit', p_limit,
        'offset', p_offset
    ) into v_result;

    return v_result;
end;
$function$;
