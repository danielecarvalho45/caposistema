-- CAPO — redefinição de senha provisória: permissões mínimas à Edge Function administrativa.
-- Causa: a função reset-team-member-temporary-password era interrompida (HTTP 503)
-- ao consultar user_term_acceptances devido à ausência de SELECT para service_role.
-- A mesma função precisa atualizar professionals.must_change_password e auditar em audit_logs.
-- Nenhuma permissão é concedida a anon ou authenticated.

GRANT SELECT ON TABLE public.user_term_acceptances TO service_role;
GRANT UPDATE ON TABLE public.professionals TO service_role;
GRANT INSERT ON TABLE public.audit_logs TO service_role;
