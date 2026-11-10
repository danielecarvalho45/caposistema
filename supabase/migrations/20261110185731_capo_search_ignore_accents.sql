-- Busca acento-insensível sem alterar a grafia dos cadastros.
-- As três RPCs autorizadas de pacientes e familiares já usam esta função.
create or replace function public.capo_name_matches_terms(p_name text, p_query text)
returns boolean language sql immutable set search_path to 'pg_catalog'
as $fn$
  select coalesce(length(btrim(p_query)) >= 2, false)
    and not exists (
      select 1
      from unnest(regexp_split_to_array(
        translate(lower(btrim(p_query)),
          'áàâãäéèêëíìîïóòôõöúùûüçñ',
          'aaaaaeeeeiiiiooooouuuucn'), '\s+')) as word
      where position(word in translate(lower(coalesce(p_name, '')),
        'áàâãäéèêëíìîïóòôõöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn')) = 0
    );
$fn$;
revoke all on function public.capo_name_matches_terms(text,text) from public, anon, authenticated;
