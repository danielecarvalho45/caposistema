# Tarefa 03 — Auditoria do fluxo de Faltosos

## Status

**AMARELO — backend e SPA implementados; homologação real pendente.**

## Objetivo

Auditar o fluxo real de Faltosos antes de integrá-lo à SPA, confirmando:

`falta na agenda → ocorrência de faltoso → pendência AO → contato/providência → remarcação ou encerramento → histórico/notificação`

A regra funcional vigente é que **Faltosos pertence ao Administrativo Operacional e é separado de Busca Ativa**.

## Fontes confrontadas

- Manual Técnico Integrado v5;
- Comando Mestre de Auditoria e Manutenção Conjunta;
- `index(20260913-024654)_AUXILIAR_ADMINISTRATIVO.html`;
- schema, funções, ACLs, policies e triggers do projeto físico `fftebavlhbfcrvrtnrld`.

O HTML legado separa explicitamente as rotas “Faltosos” e “Busca Ativa”, mas ainda grava ambas apenas em coleções locais. Ele foi usado como referência funcional, não como prova de persistência.

## Contratos físicos encontrados

| Função | Hash MD5 da definição | Resultado da auditoria |
|---|---|---|
| `get_no_show_followups_for_interface` | `7aabcecaf361eaab90f932d409addfdb` | Leitura existente; `SECURITY DEFINER`; `search_path` fixado; `EXECUTE` para `authenticated`. |
| `register_no_show_contact_for_interface` | `6510783275416fae9ac6b27123c9f8d9` | Registra contato e atualiza o acompanhamento, mas também insere em `patient_active_searches`. |
| `request_no_show_rescheduling_for_interface` | `385d1079a5b51a6d769e67cb443539b9` | Cria `administrative_requests` e marca `remarcacao_solicitada`. |
| `update_appointment_attendance_for_interface` | `c82e051c3c216a2583d6f8d599a83bab` | Registra `faltou`; o trigger cria o acompanhamento. |
| `handle_patient_no_show` | `374a568e19b3f99a0c494c21e75847ee` | Cria `patient_no_show_followups` e evento na timeline. |
| `reschedule_appointment_for_interface` | `6636ceb7046b9d1d8c5e9e5fb3952e33` | Remarca a agenda, mas não conclui nem vincula o acompanhamento de faltoso. |
| `get_pending_items_for_interface` | `fda27c9fc44a31d0e2db96978e0dac27` | Inclui `no_show_followup` na fila operacional. |

As tabelas `patient_no_show_followups`, `patient_active_searches` e `patient_appointments` possuem RLS habilitado. Não há grants diretos dessas tabelas para `anon` ou `authenticated`; a interface usa as RPCs autorizadas.

## Divergências confirmadas

### 1. Faltosos e Busca Ativa estão semanticamente misturados

`register_no_show_contact_for_interface` insere cada contato de faltoso em `patient_active_searches` com `search_type = 'no_show'`. Além disso, o contrato de faltosos usa nomes como `active_search_status` e mensagens de “busca ativa”. Isso diverge da regra vigente e da separação explícita existente na interface legada.

Não é seguro decidir automaticamente se:

- a separação deve ser apenas de módulo/interface, mantendo uma tabela física compartilhada; ou
- contatos de faltosos devem ter histórico próprio, sem registros em `patient_active_searches`.

### 2. Autorização é mais ampla que a responsabilidade definida

As três RPCs de acompanhamento permitem, além de acesso integral e AO, acesso pelo usuário atribuído ou pelo profissional do agendamento. A fila geral também expõe o item ao profissional do agendamento. O manual define a responsabilidade operacional como AO para todas as agendas.

É necessária uma decisão explícita sobre leitura e escrita do profissional no fluxo de Faltosos. Ocultar a rota no frontend não corrige a autorização do backend.

### 3. A baixa por remarcação não fecha o ciclo

`request_no_show_rescheduling_for_interface` preenche `reschedule_request_id`, mas nenhuma outra função física atualiza `rescheduled_appointment_id`. `reschedule_appointment_for_interface` cria o novo agendamento e marca o anterior como `remarcado`, porém não atualiza nem encerra o respectivo `patient_no_show_followups`.

Consequência: uma remarcação concluída pode permanecer como pendência `remarcacao_solicitada` na fila.

### 4. Notificação fim a fim não existe para o evento

Não foi localizado trigger ou função de notificação ligado à criação, contato, remarcação ou encerramento de `patient_no_show_followups`. O backend possui infraestrutura genérica de notificações, mas ela não está conectada a este fluxo.

### 5. Histórico técnico está incompleto

O trigger de falta registra a ocorrência na timeline. `patient_active_searches` possui auditoria, mas `patient_no_show_followups` não possui trigger de auditoria; nele foi localizado somente o guard de escopo de homologação.

## Estado dos dados e homologação

Na auditoria de 2026-09-16:

- não existiam registros em `patient_no_show_followups`;
- não existiam registros em `patient_active_searches`;
- não existiam agendamentos em `patient_appointments`;
- não existia conta ativa com papel `administrativo_operacional`.

Nenhum dado fictício foi criado e nenhuma escrita foi executada.

## Decisão funcional aplicada

Em 16/09/2026 foi autorizada a implementação do modelo recomendado:

1. contatos de faltosos possuem armazenamento próprio, separado de `patient_active_searches`;
2. AO, Administrador e Coordenador operam o acompanhamento; o profissional apenas registra presença/falta;
3. a remarcação de origem `faltoso` encerra o acompanhamento e vincula o novo agendamento;
4. a criação da ocorrência notifica o papel `administrativo_operacional`;
5. ocorrências e contatos são auditados e as ações funcionais entram na timeline.

## Implementação aplicada

### Backend

- Migration `20260916140950_separate_no_show_followups_from_active_search`:
  - criou `patient_no_show_contacts`, com RLS, guard de homologação, auditoria e sem grants diretos para `anon`/`authenticated`;
  - criou `get_no_show_contacts_for_interface`;
  - separou `register_no_show_contact_for_interface` de `patient_active_searches`;
  - restringiu leitura, contato, remarcação e o ramo de faltosos da fila a AO/Administração/Coordenação;
  - criou notificação AO quando a ocorrência é gerada;
  - vinculou e encerrou o acompanhamento quando uma remarcação de origem `faltoso` é efetivada;
  - registrou contato, solicitação e baixa na timeline e nas tabelas de auditoria.
- Migration `20260916141613_restrict_no_show_followup_table_policies`:
  - removeu as policies permissivas legadas para profissionais e usuários atribuídos;
  - preservou a policy restritiva de isolamento de homologação.

Hashes posteriores:

| Função | Hash MD5 |
|---|---|
| `get_no_show_followups_for_interface` | `c7f1dcb32642eade90fa05e61ec0e2cf` |
| `get_no_show_contacts_for_interface` | `422839867c62d5e1479c53155ead71dd` |
| `register_no_show_contact_for_interface` | `9e686e9834c2fd47e89593b1b8c3ce12` |
| `request_no_show_rescheduling_for_interface` | `e68027d195fae16509a3f6e1a34b5953` |
| `get_pending_items_for_interface` | `13ec0c70e36c24065423ec52c12338cd` |

### Interface

- rota `/faltosos` disponível somente aos papéis autorizados;
- lista e filtro por situação carregados pela RPC física;
- detalhe e histórico carregados de `patient_no_show_contacts`;
- registro de contato/providência e solicitação de remarcação usam o padrão `RPC → sucesso → reload → render`;
- nenhum dado clínico fictício ou sucesso local foi incorporado.

## Verificação

| Verificação | Resultado |
|---|---|
| Preflight completo em transação revertida | PASS |
| Migrations registradas | PASS |
| RLS, ACLs, policies, triggers e hashes | PASS |
| Consulta real autenticada com conta administrativa | PASS — retorno vazio coerente |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 47 testes |
| `npm run build` | PASS — 89 módulos |
| `npm run test:e2e` | PASS — 3 testes |
| `npm run format:check` | PASS |

O build mantém somente o aviso não bloqueante de chunk JavaScript maior que 500 kB.

## Pendência de homologação

O projeto continua sem conta ativa `administrativo_operacional`, agendamentos ou ocorrências de faltosos. Por isso, o fluxo de escrita completo não foi acionado com dados reais. Para congelar o bloco ainda é necessário homologar com conta AO autorizada: falta real, notificação, contato, remarcação, baixa, auditoria, negação ao profissional e sessão expirada.
