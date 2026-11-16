-- CAPO §28.253 — Contrato de especialidades para profissionais reais e manuteste.
-- O contexto simulado tem um ID explícito; para contas reais capo_effective_specialty_id()
-- retorna NULL. Preservar a autorização da RPC e retornar bool não nulo com is_primary.
-- Aplicado diretamente no Supabase em 16/11/2026; esta migration versiona o ajuste.
CREATE OR REPLACE FUNCTION public.get_my_assistential_specialties_for_interface()
RETURNS TABLE(specialty_id uuid, specialty_name text, is_current_context boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_professional_id uuid;
  v_context_specialty_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id(), public.capo_effective_specialty_id()
    into v_professional_id, v_context_specialty_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found or v_professional_id is null then
    raise exception 'Conta profissional ativa e vinculada é obrigatória.' using errcode='42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil profissional é obrigatório.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'Profissional assistencial ativo é obrigatório.' using errcode='42501';
  end if;

  return query
  select s.id, s.name,
         coalesce(s.id=v_context_specialty_id, ps.is_primary, false)
  from public.professional_specialties ps
  join public.specialties s on s.id=ps.specialty_id and s.is_active=true
  where ps.professional_id=v_professional_id
  order by case
    when coalesce(s.id=v_context_specialty_id, ps.is_primary, false) then 0
    else 1
  end, s.name;
end;
$function$;
