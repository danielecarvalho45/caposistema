-- Pré-implantação: permite que a Edge Function create-team-member confira
-- a situação de um profissional legado antes de vincular uma nova conta.
-- A função usa a service_role somente no backend; nenhuma permissão é concedida
-- a anon ou authenticated por esta migration.
grant select on table public.professionals to service_role;
