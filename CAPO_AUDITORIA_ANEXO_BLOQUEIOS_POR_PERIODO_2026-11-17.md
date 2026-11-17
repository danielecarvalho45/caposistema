# CAPO — Anexo de auditoria — 17/11/2026 — Ajustes temporários por período

Documento complementar ao `CAPO_AUDITORIA_FINAL_DE_IMPLANTACAO_2026-09-25.md`. Registro do VERDE para corrigir a tela de alterações de agenda sem afetar bloqueios especiais.

**Regra aprovada:** remover o seletor Configuração do formulário temporário e apresentar Data inicial, Data final, Horário inicial e Horário final (24h), além de ação e justificativa. O aplicativo deve descobrir automaticamente os padrões semanais válidos e bloquear apenas os dias em que o profissional atende, respeitando horários e vigência de cada padrão. Os padrões permanentes do Gestor continuam independentes.

**Código:** `src/features/agenda/OwnAgendaManager.tsx` possui os campos de intervalo e utiliza `create_agenda_period_for_interface`, sem exigir config_id do usuário; a mesma tela é compartilhada pelos perfis autorizados. Testes em `tests/unit/OwnAgendaManager.test.tsx` foram adaptados para o contrato de período e remanejamento. Não modificar diretamente a RPC de bloqueio comum nem a RPC `manage_social_home_visits_for_interface`.

**Banco:** a RPC `create_agenda_period_for_interface` está ativa, identifica configurações vigentes por data/dia de semana, recorta horário para os bloqueios, recusa sobreposições inclusive visita domiciliar e pré-verifica consultas de pacientes e familiares antes de gravar. Reutiliza as funções legadas dentro de uma transação única; falhas impedem gravação parcial. Consulta de integridade pós-ajuste: 5 bloqueios comuns e 1 Visita Domiciliar, todos os tipos existentes preservados.

**Conflito de implementação tratado:** a função alternativa redundante `create_agenda_period_adjustment_for_interface`, gerada durante esta continuidade, foi excluída por migration `20261117223500_remove_unused_agenda_period_adjustment.sql` (commit `763a5a805b59f6ace162de759c5865219c3697e3`). Consulta ao Supabase confirmou que somente a função de período usada pela interface permanece. A sequência de criação/remoção está registrada em migrations GitHub para rastreabilidade.

**Não homologado nesta sessão:** execução Vitest/typecheck/build, publicação Cloudflare e testes interativos nos perfis. Não foram realizados bloqueios ou remanejamentos de pacientes em produção como teste.
