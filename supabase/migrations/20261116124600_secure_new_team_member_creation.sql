-- CAPO — 16/11/2026
-- Corrige apenas a função de criação de profissionais novos.
-- A rotina interna create_team_member_profile_for_interface já verifica auth.uid(),
-- aceite do termo, conta administrativa ativa e o papel administrador.
-- A função externa precisa de privilégios de proprietário exclusivamente para
-- definir user_roles.is_primary após essa verificação, sem abrir a tabela ao cliente.
-- Preserva a assinatura, a implementação, a seleção do contexto/especialidade,
-- os contratos existentes e a reversão de Auth em caso de erro pela Edge Function.
BEGIN;

ALTER FUNCTION public.create_team_member_with_status_for_interface(
  uuid, text, text, text, text, text, text, text,
  boolean, text[], uuid[], uuid, date, boolean, text
) SECURITY DEFINER;

ALTER FUNCTION public.create_team_member_with_status_for_interface(
  uuid, text, text, text, text, text, text, text,
  boolean, text[], uuid[], uuid, date, boolean, text
) SET search_path TO pg_catalog, public, auth;

REVOKE ALL ON FUNCTION public.create_team_member_with_status_for_interface(
  uuid, text, text, text, text, text, text, text,
  boolean, text[], uuid[], uuid, date, boolean, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_team_member_with_status_for_interface(
  uuid, text, text, text, text, text, text, text,
  boolean, text[], uuid[], uuid, date, boolean, text
) TO authenticated;

COMMIT;
