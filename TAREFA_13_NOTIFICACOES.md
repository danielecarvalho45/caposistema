# Tarefa 13 — Notificações

## Status

**🟣 NOTIFICAÇÕES — MÓDULO CONSTRUÍDO, TESTADO E INTEGRAÇÃO CENTRAL INICIADA.**

O diagnóstico inicial de ausência de RPCs foi corrigido após confronto com o
Supabase físico oficial. As RPCs de leitura e atualização existem. O bloqueio
restante é parcial, especialmente `notify_waiting_list` e a reconciliação de
cobertura/contexto.

## Documentos consultados

- `CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md`
  (versão vigente localizada; confirma o bloco 9 amarelo).
- `CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1) (1).md`
  (cópia física confrontada).
- `CAPO_AGENT_VSCODE.md`.
- `CAPO_COMANDO_MESTRE_AUDITORIA_MANUTENCAO_CONJUNTA_2026-09-15(1).md`.
- `TAREFA_03_AUDITORIA_FALTOSOS.md`.
- `TAREFA_04_SOLICITACOES.md`.
- `TAREFA_06_ENCAMINHAMENTOS_INTERPROFISSIONAIS.md`.
- `TAREFA_09_ENCERRAMENTOS_CICLOS.md`.
- `CAPO_STATUS_CONTINUIDADE.md`.

Não foram localizados fisicamente, com esses nomes ou equivalentes claros, o Manual
do Projeto, o Manual Estrutural, o Manual da Interface, a Especificação Estrutural
da Interface e a Matriz Funcional de Perfis e Automações.

## Arquivos auditados

- `src/app/App.tsx`
- `src/app/router.tsx`
- `src/components/shell/AppShell.tsx`
- `src/lib/supabase/rpc.ts`
- `src/types/database.ts`
- `tests/`
- `supabase/migrations/`
- `index.html` e `referencias/`

## Diagnóstico

| Área | Estado | Evidência física |
|---|---|---|
| Página/painel React | CONSTRUÍDO ISOLADAMENTE | Central criada em `src/features/notifications/`; rota central ainda pendente. |
| Badge/contador | CONSTRUÍDO | Shell consulta a RPC oficial de não lidas e exibe contador acessível. |
| Hook/loader/service | CONSTRUÍDO ISOLADAMENTE | Adapter e loader locais usam as RPCs oficiais. |
| Tipos | INTEGRADOS | RPCs de notificações declaradas em `src/types/database.ts`; adapter mantém validação runtime. |
| Leitura Supabase | EXISTENTE | `get_my_notifications_for_interface(p_only_unread, p_limit, p_offset)`. |
| Marcação como lida | EXISTENTE | `update_my_notification_for_interface(..., 'lida', ...)`. |
| Marcação como resolvida | EXISTENTE | `update_my_notification_for_interface(..., 'resolvida', ...)`. |
| Paginação/contador | EXISTENTE | `p_limit`, `p_offset` e `total_count`. |
| Escrita de notificações | PARCIAL | Solicitações e Encaminhamentos chamam `capo_criar_notificacao`. |
| Histórico/duplicidade | DEPENDÊNCIA | Requer auditoria dos escritores e da chave de evento no backend oficial. |
| Destinatário | PARCIAL | Os fluxos existentes calculam destinatário em suas próprias RPCs, mas não há caixa de leitura para validá-lo. |
| Abertura contextual | PARCIAL | `entity_type`, `entity_id` e `patient_id` existem; mapa para rotas reais ainda precisa ser auditado. |
| Privacidade/RLS | EXISTENTE | RPCs têm `EXECUTE` para `authenticated`; anon não possui `EXECUTE`. |
| Responsividade | CONSTRUÍDA ISOLADAMENTE | CSS próprio responsivo, sem alterar estilos globais. |

## Eventos geradores localizados

- Solicitações administrativas: atualização/devolução/conclusão/recusa/cancelamento,
  além de reenvio para o fluxo operacional, conforme
  `20260916145256_complete_administrative_request_workflow.sql`.
- Encaminhamentos interprofissionais: atribuição e transições do fluxo,
  conforme `20260916152126_complete_interprofessional_referral_workflow.sql`.
- Faltosos: a documentação registra notificação na criação da ocorrência após as
  migrations físicas citadas em `TAREFA_03_AUDITORIA_FALTOSOS.md`, mas a função de
  leitura da caixa não foi localizada no workspace.
- Fila/vaga: **não implementar**. O manual vigente declara o ramo de vaga
  inalcançável e sem evento canônico.
- Renovação, Transporte e Encerramentos: nenhum evento canônico de notificação foi
  localizado no workspace.

## Contratos localizados

- Escritor genérico referenciado: `public.capo_criar_notificacao(...)`.
- `get_my_notifications_for_interface(p_only_unread, p_limit, p_offset)`, com
  `notification_id`, `notification_type`, `title`, `message`, `priority`,
  `status`, `patient_id`, `entity_type`, `entity_id`, `created_at`, `read_at`,
  `resolved_at` e `total_count`.
- `update_my_notification_for_interface(p_notification_id, p_action, p_notes)`,
  com ações oficiais `lida` e `resolvida`.
- As duas RPCs possuem `EXECUTE` para `authenticated`; anon não possui `EXECUTE`.
- Ainda não localizado: catálogo completo evento → destinatário → contexto e
  regra física de deduplicação.
- A interface atual consome RPCs funcionais de Solicitações e Encaminhamentos,
  mas nenhuma RPC de Notificações.

## Construível

- Criar loader tipado, página, badge derivado de `total_count`, abertura contextual
  somente para rotas reais e testes de estado vazio/carregamento/erro/leitura.
- Auditar e testar os eventos já escritores sem alterar seus fluxos funcionais.

## Fechamento da microetapa

**🟣 NOTIFICAÇÕES — MÓDULO CONSTRUÍDO, TESTADO E INTEGRAÇÃO CENTRAL INICIADA.**

Não classificar como aprovada, congelada ou homologada.

## Construção realizada

- `src/features/notifications/notifications-integration.ts`: tipos locais,
  adapter das duas RPCs oficiais, contrato central, validação estrita e
  normalização de erros.
- `src/features/notifications/NotificationsPage.tsx`: filtro Todas/Não lidas,
  paginação, contador real, loading, vazio, erro, ações `lida`/`resolvida` e
  reload do backend após writer confirmado.
- `src/features/notifications/notifications-page.css`: estilo responsivo isolado,
  reutilizando os tokens visuais existentes.
- `src/components/shell/AppShell.tsx` e
  `src/components/shell/app-shell.css`: contador global de não lidas no link de
  Notificações, alimentado pela RPC oficial e sem falso sucesso em erro.
- `tests/unit/notifications-page.test.tsx`: leitura, filtro, paginação, vazio,
  erro, writers, reload e ausência de rota contextual fictícia.

## Pendências e bloqueios específicos

- 🟡 **PENDÊNCIA DE BANCO / INTEGRAÇÃO:** regra física de deduplicação por event key.
- 🟡 **PENDÊNCIA DE BANCO / INTEGRAÇÃO:** catálogo evento → destinatário → contexto
  para Faltosos, Solicitações e Encaminhamentos.
- 🔴 **BLOQUEIO ESPECÍFICO — AUTOMAÇÃO DE AVISO DE VAGA:** `notify_waiting_list`
  procura estados incompatíveis com a constraint atual da `waiting_list`. Não
  corrigir backend neste chat nem inventar `vaga_disponivel`/`disponivel`.
- 🔴 **BLOQUEIO EXTERNO AO CHAT 13:** o typecheck global permanece bloqueado por
  erros em `src/features/social/FamilyCaregiverPage.tsx`, pertencente à frente
  Familiar/Cuidador. Esse bloqueio não invalida os testes focados de Notificações.

## Conflitos

Há alterações externas não commitadas em arquivos compartilhados, incluindo
`src/app/App.tsx`, `src/app/router.tsx`, `src/components/shell/AppShell.tsx`,
`src/lib/supabase/rpc.ts`, `src/types/database.ts` e testes. Esses arquivos foram
somente auditados e não foram sobrescritos.

## Integração e validação

- Testes focados da frente: **PASS — 5 testes**.
- Análise de erros nos arquivos novos: **PASS — nenhum erro**.
- `git diff --check`: **PASS**.
- `npm run typecheck`: **FAIL externo** em `src/features/social/FamilyCaregiverPage.tsx`,
  com cinco erros de tipagem fora desta frente.
- Rota `/notificacoes` e renderização no `App`: **INTEGRADAS**.
- Link e contador de não lidas no `AppShell`: **INTEGRADOS**; o contador permanece
  oculto quando a leitura oficial falha, sem impedir o acesso à central.
- Contratos tipados em `src/types/database.ts`: **INTEGRADOS** para leitura e
  atualização da caixa de notificações.
- Abertura contextual: **INTEGRAÇÃO PENDENTE** até auditar
  `entity_type → módulo real → rota React real → parâmetro/contexto necessário`.
- `notify_waiting_list()`: **🔴 PENDÊNCIA DE BACKEND**, fora do escopo deste chat.

## Próxima ação segura

Preservar os arquivos atuais e aguardar a integração central controlada. Não
avançar para Familiar/Cuidador, não corrigir arquivos de outros chats e não
iniciar outro módulo. O mapa de abertura contextual, a rota e o badge global
permanecem pendentes; a automação de vaga continua bloqueada pelo contrato
incompatível.
