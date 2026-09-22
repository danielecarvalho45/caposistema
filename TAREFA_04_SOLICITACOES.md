# Tarefa 04 — Solicitações administrativas

## Status

**🟢 SOLICITAÇÕES ADMINISTRATIVAS — ALTERAÇÃO INTEGRADA E TESTADA**

Validação técnica atual concluída. A homologação real com perfis e dados de
produção continua pendente, sem invalidar a integração automatizada.

## Escopo e fontes

O fluxo foi confrontado com o Manual Técnico Integrado v5, o Comando Mestre, os HTMLs legados de Auxiliar Administrativo e Gestor Funcional e o schema físico do projeto `fftebavlhbfcrvrtnrld`.

O legado previa recebimento, início, providência, conclusão, devolução e feedback, mas mantinha esse fluxo apenas em estado local. O backend físico aceitava somente `pending`, `in_progress`, `completed` e `cancelled`, não possuía histórico funcional próprio e notificava o solicitante apenas na conclusão.

## Decisão funcional aplicada

- AO e Administrador podem iniciar, registrar providência, devolver, concluir, recusar e cancelar;
- o profissional solicitante vê as próprias solicitações, complementa e reenvia as devolvidas e pode cancelar as próprias solicitações pendentes/devolvidas;
- a Coordenação possui visão gerencial, sem assumir a execução operacional;
- estados terminais: `completed`, `refused` e `cancelled`;
- toda transição é persistida em histórico imutável e auditada;
- devolução, providência, conclusão, recusa e cancelamento notificam o solicitante; reenvio notifica AO;
- recusa/cancelamento de pedido originado em Faltosos devolve a ocorrência para contato, permitindo nova providência.

## Implementação

### Backend

- `20260916145256_complete_administrative_request_workflow`
  - ampliou o status para `pending`, `in_progress`, `returned`, `completed`, `refused`, `cancelled`;
  - criou `administrative_request_events`, com RLS, ACL fechada ao cliente e auditoria;
  - criou `get_administrative_request_events_for_interface`;
  - ampliou leitura, ordenação, transições e autorização por perfil;
  - conectou notificações e o retorno seguro ao fluxo de Faltosos;
  - preservou os fluxos existentes que originam solicitações.
- `20260916150103_restrict_administrative_request_event_policies`
  - adicionou policy restritiva explícita para impedir acesso direto do cliente ao histórico.

Hashes posteriores:

| Função | Hash MD5 |
|---|---|
| `get_administrative_requests_for_interface` | `4643300744cb3d6c84a6b7c72fc093b9` |
| `get_administrative_request_events_for_interface` | `73d2d722673f18daebd1c77013ce0f9d` |
| `update_administrative_request_for_interface` | `121d78c26df2841429c44ee9abbbe8ac` |
| `notify_admin_request` | `b5cc4fe7772afe58f5cc7aac68381277` |

### Interface

- rota `/solicitacoes` integrada aos perfis autorizados;
- filtro pelos seis estados, lista, detalhe e histórico vindos de RPCs físicas;
- ações exibidas conforme perfil e estado atual;
- atualização segue `RPC → sucesso → reload → render`;
- nenhum paciente, solicitação ou sucesso fictício foi incorporado.

## Verificação

| Verificação | Resultado |
|---|---|
| Preflight das duas migrations com rollback | PASS |
| Migrations registradas no projeto físico | PASS |
| RLS, ACL, policy, constraint e hashes | PASS |
| Leitura autenticada com conta administrativa | PASS — retorno vazio coerente |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 49 testes |
| `npm run build` | PASS — 91 módulos |
| `npm run test:e2e` | PASS — 3 testes |
| `tests/unit/requests-page.test.tsx` | PASS — 4 testes focados |
| `npm.cmd run typecheck` | PASS |
| `git diff --check` | PASS — apenas avisos de conversão LF/CRLF |

O build mantém somente o aviso não bloqueante de chunk JavaScript maior que 500 kB. Os advisors mantêm avisos gerais preexistentes; as RPCs `SECURITY DEFINER` novas aparecem no lint por serem intencionalmente expostas a `authenticated`, mas validam sessão, termo, conta, perfil, transição e escopo no corpo.

## Fechamento técnico

**🟢 SOLICITAÇÕES — TECNICAMENTE CONCLUÍDAS.**

- Validação técnica concluída com 4/4 testes do módulo focado PASS.
- `npm.cmd run typecheck` PASS.
- Não reabrir Solicitações.
- Não refatorar `RequestsPage`.
- Não alterar filtros/status já validados.
- Não reconstruir o módulo.

A próxima pendência identificada foi Agenda / Agendamento, que deve ser consolidada no **CHAT 21 — INTEGRAÇÃO TRANSVERSAL FINAL**. Qualquer contrato real ainda faltante de backend deverá ser confirmado posteriormente no **CHAT 22 — INTEGRAÇÃO REAL COM SUPABASE**.

## Pendência de homologação

Não existem solicitações administrativas reais no projeto e não há conta ativa com o papel exclusivo `administrativo_operacional`. Nenhum dado fictício foi criado. Para congelar o bloco, ainda é necessário validar com perfis reais: criação pelo profissional, recebimento AO, providência, devolução, complemento/reenvio, conclusão, recusa/cancelamento, notificações e negações de autorização.
