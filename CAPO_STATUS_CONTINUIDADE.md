# CAPO — Quadro Vivo de Continuidade

Atualizado em 2026-09-16. Status técnico; não substitui homologação da responsável.

| Frente | Módulo | Status | Evidência física | Bloqueio / próxima ação |
|---|---|---|---|---|
| 1 | Acesso e roteamento | 🟢 PRONTA PARA HOMOLOGAÇÃO | Unitários, Playwright e screenshots | Homologar MFA/TOTP real |
| 2 | Estrutura visual global | 🟢 PRONTA PARA HOMOLOGAÇÃO | Shell, CSS e screenshots | Homologação visual |
| 3 | Painéis iniciais | 🟢 PRONTA PARA HOMOLOGAÇÃO | Home, contexto e aniversariantes | Homologar perfis |
| 4 | Agenda/agendamento | 🟡 EM TESTE | Leitura contratada; Agenda Geral do Gestor e Dia/Semana/Mês reais; testes internos concluídos | 🟡 Teste manual de navegação e dados reais pendente; writers de disponibilidade, agendamento, presença/falta, retorno, bloqueios e exceções sem contrato físico no workspace |
| 5 | Fila operacional | 🟢 PRONTA PARA HOMOLOGAÇÃO | RPC, fixture interna e estado vazio | Homologar conta AO |
| 6 | Faltosos | 🟢 PRONTA PARA HOMOLOGAÇÃO | Fluxo, estado vazio e screenshot | Homologar ocorrência real |
| 7 | Solicitações | 🟢 PRONTA PARA HOMOLOGAÇÃO | Formulário, estado vazio e testes | Homologar transições reais |
| 8 | Aniversariantes | 🟢 PRONTA PARA HOMOLOGAÇÃO | RPC sanitizada e screenshot | Homologar contextos reais |
| 9 | Encaminhamentos | 🟢 PRONTA PARA HOMOLOGAÇÃO | Estado vazio, fixture e screenshot | Homologar contas assistenciais |
| 10 | Área assistencial padrão | 🔴 BLOQUEADA PARCIALMENTE | React, loaders e testes internos | Conta profissional e dados reais |
| 11 | Médico Clínico | 🔴 BLOQUEADA PARCIALMENTE | Índice legado auditado | RPCs e documentação clínica |
| 12 | Nutrição | 🔴 BLOQUEADA PARCIALMENTE | Índice legado auditado | RPCs e documentação clínica |
| 13–18, 20 | Social, familiar, transporte, receita, odontologia, ciclos e relatórios | 🔴 BLOQUEADAS PARCIALMENTE | Módulos físicos; Odontologia integrada à rota central | Ciclos sem regra documentada de acesso; demais contratos específicos |
| 19 | Notificações | 🟡 EM TESTE | RPCs oficiais, central React, rota e menu integrados | Mapa contextual e automação de vaga pendentes |
| 21 | TI/Manutenção | 🟢 PRONTA PARA HOMOLOGAÇÃO | Seis RPCs, abas físicas e regressão | Conta administrador_tecnico |
| 22 | Integração Supabase | 🟡 EM TESTE | RPCs reais e HTTP 200 verificados | Auditar contratos clínicos |
| 23 | Testes automatizados | 🟢 PRONTA PARA HOMOLOGAÇÃO | 90 unitários, 6 Playwright, typecheck, lint e build | Regressão contínua |
| 25 | Integração central de rotas | 🟢 PRONTA PARA HOMOLOGAÇÃO | Registro único de rotas/permissões; Odontologia e Notificações conectadas | Integrar novas entregas somente com regra de acesso documentada |
| 24 | Homologação visual | 🟡 EM TESTE | Screenshots reais das telas autorizadas | Fila de homologação |

## Regras

- Frentes independentes avançam simultaneamente.
- Bloqueio parcial não interrompe outras frentes.
- Núcleo compartilhado exige integração central.
- Não criar dados fictícios, mocks persistentes, bypass ou contratos clínicos por inferência.
- `PRONTA PARA HOMOLOGAÇÃO` não significa aprovada ou congelada.
