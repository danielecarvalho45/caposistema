# CAPO — Registro de auditoria da manutenção: isolamento lógico (18/11/2026)

**VERDE explícito da Titular.** Continuar usando o Supabase oficial `fftebavlhbfcrvrtnrld`, sem segundo banco: produção e homologação compartilham estruturas e manutenção, porém os registros não se cruzam. Seguir as seções do Documento Mestre relativas à homologação e o Manual Técnico Integrado v5.

## Falhas constatadas antes da correção

- `capo_patient_visible_in_current_context`: quando `manuteste` desligava o contexto simulado, voltava a consultar pacientes reais.
- `get_homologation_options_for_interface` e `set_homologation_context_for_interface`: expunham/aceitavam seleção de profissionais reais.
- `get_family_psychology_appointments_for_interface`: o paciente de origem era conferido apenas para ocultar duas colunas, não para excluir a linha de Familiar/Cuidador.
- `get_agenda_configuration_for_interface`, `create_agenda_period_for_interface`, `create_agenda_block_for_interface` e `get_agenda_block_affected_for_interface`: faltava checagem explícita do ambiente do profissional alvo. A consulta de afetados não filtrava o paciente origem.
- `get_home_link_reschedule_for_interface`: tinha filtro do paciente, mas não do profissional.
- `private.capo_notification_patient_id`: não derivava o paciente de origem das notificações `family_psychology_appointment`, permitindo mensagens sem filtro de ambiente.

## Mudanças executadas

1. `supabase/migrations/20261118144500_logical_environment_isolation_all_profiles.sql` — commit `9a6fd472bbb6743f006073c07a9efbf78310b751`, aplicada no Supabase (`success=true`). Reutiliza as assinaturas e controles anteriores das nove funções, com os filtros contextuais necessários. `manuteste` desabilitado não lê nenhum paciente; habilitado, só pacientes de teste; seleção de profissionais técnicos limitada a `is_homologation_profile=true`. Real lê só real; consultas familiares, configurações, bloqueios e leitura de remanejamento respeitam os escopos.
2. `supabase/migrations/20261118150500_isolate_family_notifications_by_source_patient.sql` — commit `b917b4777dab7e209ee67213718d1b90344fb721`, aplicada (`success=true`). A função interna de identificação de notificações encontra `family_psychology_appointments.source_patient_id` no singular e plural.
3. `tests/sql/homologation_production_isolation_readonly.sql` — commit `d582d6f16d2193b63d2da8019d677ef79586bb97`, **executado com sucesso**. Teste de permissões por identidade, sem INSERT/UPDATE/DELETE de registros de domínio. Ações sobre profissional real negadas à homologação; notificação familiar real invisível à conta de teste; catálogos e agenda de Familiar/Cuidador real separados. RPCs reais acessíveis ao Gestor real.

## Preservação e resultado

Contagem física após testes: **83 pacientes reais, 3 pacientes teste, 23 agendamentos de pacientes de teste, 0 agendamentos mistos, 4 agendamentos de Familiar/Cuidador reais, 5 bloqueios gerais, 1 Visita Domiciliar**. `Dalila Aguiar` continua inativa, e seus registros de agenda continuam no histórico; `Natália Cristina Gomes Pereira` continua ativa, com visita domiciliar e paciente real vinculados. Os cinco perfis de homologação permanecem marcados. Nenhuma nova base foi criada e nenhum registro operacional foi inserido, transferido, cancelado ou excluído.

RLS revisada nas tabelas principais de pacientes, profissionais, agendas, familiares e contextos; políticas diretas de `anon/authenticated` negam acesso a tabelas, usando RPC autorizada. Mensagens de Familiares agora derivam o paciente principal para verificação de escopo.

**Limite da homologação:** os testes SQL foram aprovados, mas não houve execução de Vitest, TypeScript, build, login autenticado em navegador, verificação de Cloudflare nem varredura integral de todas as RPCs do CAPO. A plataforma continua com **isolamento lógico** — um único projeto e tabelas compartilhadas — e os contratos modificados atuam em ambos ambientes. Homologação visual por perfil continua pendente. A correção dos bloqueios gerais é assunto separado e não foi realizada nesta intervenção.
