# CAPO — MANUAL TÉCNICO INTEGRADO DE PRODUÇÃO

**Supabase / SQL + Interface + Auditoria e Manutenção Conjunta**  
**Versão 5 — 15/09/2026**  
**Projeto oficial:** `fftebavlhbfcrvrtnrld`

> Esta versão substitui o Manual Técnico v4 como referência do estado atual. Documentos anteriores permanecem históricos.

## Resumo executivo

- BLOCO 10: **VERDE / CONGELADO**.
- BLOCO 1 Pendências: 1A/1B/1C verdes; 1D identificou gap de leitura da fila para AO; 1D-B e 1E pendentes.
- Contexto principal por conta: backend **VERDE** pela migration `20260915120544`; `index.html` atual consome `primary_context`, mas ainda não está dentro do ZIP canônico v7.
- Backend possui atualmente **122 functions/RPCs de interface/contexto**; o ZIP canônico atual ainda consome diretamente, na maior parte dos perfis, apenas Auth/Termo/Contexto.
- Próxima fase: auditoria/manutenção conjunta automatizada banco + interface, com reparo mínimo e teste por microetapa.

## Registro de obsolescências

- **OBSOLETO:** “Falta → Assistência Social / Busca Ativa de Faltosos” → **Nova forma:** Falta alimenta o fluxo FALTOSOS, separado de Busca Ativa. Responsabilidade operacional: Auxiliar/Administrativo Operacional, abrangendo todas as agendas. _Referência:_ Matriz Funcional 12/09, seções 3.3, 8.2, 18.7; RPCs patient_no_show_followups.

- **OBSOLETO:** Uso do código de papel `ti` → **Nova forma:** Papel técnico canônico é `administrador_tecnico`. TI não recebe acesso operacional/assistencial por simples atribuição técnica. _Referência:_ Migration 20260914151306 e Bloco 10.3/10.8.

- **OBSOLETO como regra técnica:** Autorização odontológica por UUID/nome hardcoded do Dr. Ilton → **Nova forma:** Regra funcional de emissão autorizada é preservada, mas o backend autoriza por capability `emitir_encaminhamento_odontologico_externo`, não por nome/UUID fixo. _Referência:_ Migration 20260914171513; resolver de capabilities.

- **OBSOLETO:** Administrador/Controlador com visões separadas ou seletor Operação/Controle/TI → **Nova forma:** Experiência integrada. A conta pode acumular AO + Administração + TI; módulos adicionais aparecem por permissão sem trocar login/perfil. _Referência:_ Matriz Funcional 12/09 e decisão de interface integrada.

- **OBSOLETO:** Seleção manual de perfil no login → **Nova forma:** Conta única + `primary_context` no backend. Não perguntar perfil a cada login. _Referência:_ Migration 20260915120544; get_my_access_context.primary_context.

- **OBSOLETO:** Prioridade de rota decidida em JavaScript (ex.: Coordenador > Profissional) → **Nova forma:** Frontend deve obedecer `primary_context`; se ambíguo, bloquear e pedir configuração administrativa. _Referência:_ set_team_member_primary_context_for_interface + index.html atual.

- **OBSOLETO:** `professional_specialties.is_primary` como contexto principal da conta → **Nova forma:** `is_primary` continua sendo especialidade principal. O papel principal fica em `user_roles.is_primary`. _Referência:_ Migration 20260915120544.

- **OBSOLETO:** `get_my_access_context()` devolve apenas conta/profissional/roles → **Nova forma:** Contrato atual devolve roles, capabilities, identidade real/homologação e `primary_context`. _Referência:_ Hash atual 1a78e009e96b610ce0b7e1ea8f44365a.

- **OBSOLETO como prova atual:** Claims de “Interface Mestre integrada” de 04-08/09 como prova do pacote atual → **Nova forma:** São histórico de uma geração anterior. O ZIP canônico atual v7 contém 8 HTMLs e, exceto TI, os perfis chamam diretamente apenas Auth/Termo/Contexto. _Referência:_ Auditoria física do ZIP_DE_IMPLANTACAO_DO_SISTEMA_CAPO.zip v7 em 15/09.

- **HISTÓRICO:** Primeira cópia Cloudflare de 08/09 como baseline atual → **Nova forma:** Ambiente/pacote anterior não prova o estado do pacote canônico de 14-15/09. _Referência:_ Usar ZIP canônico atual + index.html atual + Supabase físico.

- **OBSOLETO/INCOMPATÍVEL:** `notify_waiting_list()` esperando `vaga_disponivel/disponivel` como estados válidos da fila → **Nova forma:** waiting_list permite waiting/paused/called/scheduled/cancelled/removed. O ramo de vaga está inalcançável e pertence ao Bloco 9. `called` significa paciente chamado, não vaga disponível. _Referência:_ Auditoria Bloco 1 Etapa 1D.

- **SUBSTITUÍDO:** Separar obrigatoriamente banco e interface em chats distintos → **Nova forma:** Novo modelo: um único chat pode auditar e manter banco + interface em conjunto, desde que cada mutação seja atômica, rastreável e testada separadamente. _Referência:_ Protocolo Conjunto v5 deste manual.

- **PROIBIDO:** Dados fictícios/mock em Index para demonstração → **Nova forma:** Nenhum Index canônico pode conter pacientes/nomes/fluxos fictícios. Dados reais vêm do Supabase; testes de banco devem ser reversíveis. _Referência:_ Regra permanente de interface e homologação.

- **OBSOLETO:** Timeline/Auditoria fabricadas por JavaScript → **Nova forma:** Frontend somente consulta o que o backend gravou; timeline via get_patient_timeline_for_interface e auditoria via get_audit_logs_for_interface. _Referência:_ Arquitetura de autoridade do backend.

- **OBSOLETO:** Relatórios oficiais calculados por `state.*.length` ou arrays da sessão → **Nova forma:** Relatórios oficiais devem vir dos registros reais do CAPO; dashboard geral e relatório por especialidade via RPCs próprias. _Referência:_ get_reports_dashboard_for_interface; get_my_specialty_operational_report_for_interface.


## Fila de reparos

- 1. Pendências — **AMARELO** — Executar 1D-B; depois 1E teste final e congelamento. Bug notify_waiting_list foi movido ao Bloco 9.

- 2. Faltosos — **AMARELO** — Auditoria formal do bloco atual + integração real das telas atuais; confirmar baixa/pendência/notificação fim a fim.

- 3. Solicitações — **AMARELO** — Fechar estados atuais, devolução/retorno, notificações e integração real dos perfis.

- 4. Aniversariantes — **AMARELO** — Confirmar fonte/contrato canônico, permissões e carregamento real; homologar todos os perfis.

- 5. Encaminhamento interprofissional — **AMARELO** — Fechar contrato completo origem/destino/estados/recipient notification e integrar interface.

- 6. Demais especialidades — **VERDE backend / AMARELO interface** — Implementar CAPOProfissionalAssistencialIntegration/loaders reais; Psicologia/Fisioterapia/futuras especialidades sem HTML novo por especialidade.

- 7. Logs — **VERDE backend / AMARELO interface** — Integrar dashboard/status/integrações/logs/histórico no Index TI atual e fazer reconciliação final do bloco.

- 8. Funções / Procedures — **AMARELO** — Auditar duplicidades/legado, autorização, retornos, erros, concorrência e contratos efetivamente consumidos.

- 9. Notificações Automáticas — **AMARELO** — Fechar cobertura evento→destinatário→contexto; corrigir notify_waiting_list, hoje inalcançável; eliminar duplicidades/lacunas.

- 10. Parâmetros e Configurações — **VERDE - CONGELADO** — Não reabrir sem regressão física ou nova decisão funcional.


> A versão DOCX/PDF contém o detalhamento completo, migrations, hashes, inventário e protocolo conjunto.
