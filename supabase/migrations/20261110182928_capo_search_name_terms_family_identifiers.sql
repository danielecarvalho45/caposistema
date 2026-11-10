-- Pesquisa por tokens do nome, preservando o isolamento de pacientes/familiares.
create or replace function public.capo_name_matches_terms(p_name text, p_query text)
returns boolean language sql immutable set search_path to 'pg_catalog'
as $fn$
  select coalesce(length(btrim(p_query)) >= 2, false)
    and not exists (
      select 1
      from unnest(regexp_split_to_array(lower(btrim(p_query)), '\s+')) as word
      where position(word in lower(coalesce(p_name, ''))) = 0
    );
$fn$;
revoke all on function public.capo_name_matches_terms(text,text) from public, anon, authenticated;

do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('public.search_patients_for_interface(text,integer,integer)'::regprocedure) into v_definition;
  if position('position(lower(v_query) in lower(p.full_name)) > 0' in v_definition) = 0 then
    raise exception 'Contrato da busca administrativa de pacientes mudou.';
  end if;
  execute replace(v_definition,
    'position(lower(v_query) in lower(p.full_name)) > 0',
    'public.capo_name_matches_terms(p.full_name, v_query)');

  select pg_get_functiondef('public.search_patients_for_professional_interface(text,integer,integer)'::regprocedure) into v_definition;
  if position('position(lower(v_query) in lower(p.full_name)) > 0' in v_definition) = 0 then
    raise exception 'Contrato da busca profissional de pacientes mudou.';
  end if;
  execute replace(v_definition,
    'position(lower(v_query) in lower(p.full_name)) > 0',
    'public.capo_name_matches_terms(p.full_name, v_query)');

  select pg_get_functiondef('public.search_family_members_for_interface(text,integer)'::regprocedure) into v_definition;
  if position('fm.full_name ilike ''%''||v_q||''%''' in v_definition) = 0 then
    raise exception 'Contrato da busca de familiares mudou.';
  end if;
  execute replace(v_definition,
    'fm.full_name ilike ''%''||v_q||''%''',
    'public.capo_name_matches_terms(fm.full_name, v_q) or lower(coalesce(fm.capo_number, '''')) = lower(v_q) or lower(coalesce(fm.cms, '''')) = lower(v_q)');
end;
$migration$;
