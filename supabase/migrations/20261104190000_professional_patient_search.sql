-- Pesquisa administrativa somente leitura, autorizada ao profissional.
-- Preserva o contrato e as permissões da pesquisa administrativa original.
create or replace function public.search_patients_for_professional_interface(
  p_query text, p_limit integer default 20, p_offset integer default 0
)
returns table (
  patient_id uuid, full_name text, patient_number text, cms text,
  birth_date date, age integer, status text, deceased boolean, total_count bigint
)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_query text := btrim(coalesce(p_query, ''));
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Sessão ou termo legal inválido.' using errcode = '42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil sem permissão para consulta profissional.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id = auth.uid() and ua.is_active = true
  ) then
    raise exception 'Conta inexistente ou inativa.' using errcode = '42501';
  end if;
  if char_length(v_query) < 2 and v_query !~ '^[0-9]$' then
    raise exception 'Informe pelo menos dois caracteres ou o Nº CAPO exato.' using errcode = '22023';
  end if;
  return query
  select p.id, p.full_name, p.patient_number, p.cms, p.birth_date,
    case when p.birth_date is null then null
         else extract(year from age(current_date, p.birth_date))::integer end,
    p.status, p.deceased, count(*) over()
  from public.patients p
  where public.capo_patient_visible_in_current_context(p.id)
    and (
      lower(coalesce(p.patient_number, '')) = lower(v_query)
      or (char_length(v_query) >= 2 and lower(coalesce(p.cms, '')) = lower(v_query))
      or (char_length(v_query) >= 3 and position(lower(v_query) in lower(p.full_name)) > 0)
    )
  order by
    case when lower(coalesce(p.patient_number, '')) = lower(v_query) then 1
         when lower(coalesce(p.cms, '')) = lower(v_query) then 2
         when lower(p.full_name) = lower(v_query) then 3 else 4 end,
    p.full_name, p.id
  limit least(greatest(coalesce(p_limit,20),1),20)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

revoke all on function public.search_patients_for_professional_interface(text,integer,integer) from public, anon;
grant execute on function public.search_patients_for_professional_interface(text,integer,integer) to authenticated;
