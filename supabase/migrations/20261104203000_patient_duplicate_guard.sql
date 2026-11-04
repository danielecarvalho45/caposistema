-- CAPO: impedir duplicidade exata por nome normalizado + nascimento,
-- apresentar somente à equipe administrativa possíveis coincidências.
create or replace function public.capo_normalize_patient_name(p_name text)
returns text
language sql immutable strict
set search_path = pg_catalog
as $function$
  select btrim(regexp_replace(
    translate(lower(btrim(p_name)),
      'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[[:space:]]+', ' ', 'g'));
$function$;

-- Mesmo nome (sem diferença de maiúsculas/acentos/espaços) e mesma data.
-- A UNIQUE protege também contra cliques simultâneos de cadastro.
create unique index if not exists patients_name_birth_unique_norm
  on public.patients (public.capo_normalize_patient_name(full_name), birth_date);

create or replace function public.check_patient_duplicates_for_interface(
  p_full_name text, p_birth_date date
)
returns table (
  patient_id uuid, patient_number text, full_name text,
  birth_date date, match_type text
)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_normalized text := public.capo_normalize_patient_name(coalesce(p_full_name,''));
  v_first text := split_part(v_normalized, ' ', 1);
  v_last text := reverse(split_part(reverse(v_normalized), ' ', 1));
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo legal inválido.' using errcode='42501';
  end if;
  if not (public.has_app_role('administrador') or
          public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Administrativo autorizado consulta duplicidades.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
  ) then
    raise exception 'Conta administrativa inativa.' using errcode='42501';
  end if;
  if p_birth_date is null or length(v_normalized)<3 then
    return;
  end if;

  return query
  select p.id,p.patient_number,p.full_name,p.birth_date,
         case when public.capo_normalize_patient_name(p.full_name)=v_normalized
              then 'exato'::text else 'semelhante'::text end
  from public.patients p
  where p.birth_date=p_birth_date
    and public.capo_patient_visible_in_current_context(p.id)
    and (
      public.capo_normalize_patient_name(p.full_name)=v_normalized
      or (v_first<>'' and v_last<>'' and v_first<>v_last
        and split_part(public.capo_normalize_patient_name(p.full_name),' ',1)=v_first
        and reverse(split_part(reverse(public.capo_normalize_patient_name(p.full_name)),' ',1))=v_last)
    )
  order by case when public.capo_normalize_patient_name(p.full_name)=v_normalized
                then 0 else 1 end, p.full_name
  limit 10;
end;
$function$;

revoke all on function public.check_patient_duplicates_for_interface(text,date) from public,anon;
grant execute on function public.check_patient_duplicates_for_interface(text,date) to authenticated;
