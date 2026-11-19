
---

## 18/11/2026 — Encerramento da implementação de Notificações e Solicitações; manutenção pontual somente sob ocorrência

**Determinação expressa da Titular após verificação na interface:** a readequação visual e a implantação das funções de **Notificações e Solicitações** foram verificadas. A Titular decidiu **ENCERRAR A FRENTE DE MANUTENÇÃO E IMPLEMENTAÇÃO** dessas funções. A análise definitiva do comportamento, incluindo as transições de estados, recepção pelos destinatários, confirmações por link/manual, solicitações profissionais, feedback e histórico, **somente será comprovada quando os fluxos forem utilizados em situações reais**. Não presumir homologação funcional integral a partir da verificação da apresentação.

**Regra de governança a partir desta decisão:**
1. Preservar os componentes e regras implantados. Não iniciar novas reestruturações, adições de funções, refatorações, ajustes preventivos ou novas implementações de Notificações e Solicitações.
2. Manutenção futura exclusivamente **pontual/cirúrgica**, motivada por ocorrência concreta constatada no uso real, precedida de investigação documental, GitHub e Supabase; nenhuma intervenção sem novo **VERDE** específico da Titular.
3. Manter o fluxo compartilhado do Gestor/Titular e Administrativo Operacional; `Notificações gerais` e `Confirmações de agendamento` separados; solicitações de profissionais direcionadas ao módulo `/solicitacoes`, onde são aceitas, executadas e concluídas; leitura de aviso não substitui execução da demanda; confirmação prévia pelo link/manual não é presença profissional; histórico e auditoria preservados.
4. Preservar separação entre dados reais e `manuteste`, permissões, módulos de óbito/luto e bloqueio de agenda congelados. Não usar registros fictícios no ambiente real para antecipar homologação.
5. **Pendências técnicas identificadas anteriormente, não homologadas nem consideradas resolvidas por este encerramento:** (a) gatilho `trg_capo_resolve_intake_notification_on_request_status` pode fechar aviso de entrada da solicitação já no aceite, antes da conclusão da demanda; (b) `read_at` compartilhado entre destinatários de notificações por papel pode afetar leitura de outro usuário; (c) confirmar no uso real o feedback ao profissional e o comportamento das confirmações/manual/link, incluindo familiar/cuidador. Essas pendências ficam **registradas para observação, não autorizam manutenção proativa**. Se se manifestarem como defeito operacional, reabrir exclusivamente o item afetado mediante VERDE e registrar resultados.
6. Verificação de interface declarada pela Titular não equivale a testes automatizados executados ou confirmação individual em todos os perfis, navegadores e cenários.

**Situação oficial:** **IMPLEMENTAÇÃO E MANUTENÇÃO DE NOTIFICAÇÕES E SOLICITAÇÕES ENCERRADAS POR DECISÃO DA TITULAR; ESTRUTURA PRESERVADA; COMPORTAMENTO EM ACOMPANHAMENTO NO USO REAL; REABERTURA SOMENTE PARA CORREÇÃO PONTUAL DE ERRO COM NOVO VERDE.** Nenhuma alteração de código funcional ou banco de dados realizada neste registro documental.

---

## 18/11/2026 — VERDE: Home administrativa em dois dias úteis, resumo de disponibilidade e perfis preservados

**Autorização da Titular:** alterar exclusivamente a apresentação da Home do **Gestor/Titular** e do **Administrativo Operacional**. Todos os perfis profissionais, incluindo Psicologia, Nutrição, Assistência Social e demais perfis, **não recebem a nova organização**, permanecendo no padrão já homologado. A Agenda Geral oficial e bloqueios/remanejamentos já homologados **não podem sofrer mudança de regras, grade, dados ou estrutura**.

**Regra operacional:** Home administrativa mostra duas agendas simultâneas em tela dividida (largura grande), a primeira para a data atual e a segunda para o dia útil seguinte; apenas segunda a sexta. Na sexta a segunda é a segunda-feira seguinte; sábado/domingo apresentam segunda e terça seguintes. Em telas pequenas, empilhar as colunas verticalmente. Na primeira coluna, listar **somente consultas agendadas** em ordem cronológica e manter também registros especiais de remarcação solicitada pelo link associados ao dia; não incluir linhas individuais de horário livre nem de bloqueio. Ao final da primeira coluna, resumo discreto de **profissionais com pelo menos um horário livre ainda futuro naquele dia**, calculado pelo resultado real da grade em tempo de consulta, com um único item por profissional e link **Consultar agenda** para a Agenda Geral filtrada naquele profissional e data. Horários passados não contam; quando não há disponibilidade, exibir mensagem. Na segunda coluna, agendamentos e horários livres com ação existente **Agendar**, sem listar bloqueios. Não inserir pacientes, horários ou disponibilidade fictícia.

**Implementação cirúrgica no GitHub `main`:**
- Novo componente `src/features/home/AdministrativeTwoDayAgenda.tsx` (commit `6e70d1d1960b4bd91410011206b4861f4388af24`; ajuste de cálculo de fim de semana `253d18a5a5c8a8247a7421a0f338c28b77d9eaed`; rótulos para fim de semana `c27c54f3cad7271c48f7171093ea159f4f1098ad`). Consulta **duas vezes** a RPC oficial `getAgendaScheduleGrid(data,data,null)`, sem alterar consultas/agendamentos nem guardar nova disponibilidade no banco; mostra estados de carregamento/erro por dia.
- `src/features/gestor/GestorDashboard.tsx` substitui apenas o painel da agenda da Home por `AdministrativeTwoDayAgenda` (commit `a0e655446316073a78fcb7bf39ceb8d2402ec537`). Aniversariantes, acessos rápidos, solicitações aprovadas, lateral e indicadores mantidos.
- `src/features/home/HomePage.tsx` substitui apenas o painel operacional quando `primary_context.code='administrativo_operacional'` (commit `2c7a529f8ba3c2f80b34b7fd1250e501c60503e8`); preserva `ProfileDashboard`, aniversariantes, faltosos, pendências e todos os outros perfis sem alteração.
- `src/features/home/DailyTeamAgendaRows.tsx` recebe parâmetros opcionais `mode`, `day`, `summaryLabel`, mantendo `mode='all'` como comportamento legado para qualquer consumidor que não solicite modo administrativo. `today` filtra apenas consulta ocupada/agendada, insere aviso de profissionais com vagas futuras ao final; `next` mantém agendamentos e vagas livres. Commits `b86f627d17b25316d4b148272c53b24db5cfcd0e`, `9af786c1b38511b80b2259fb61817d289bceeb43`, `006a102fd96f7504fdb39e43f8e77d4fbb32b03f`.
- `src/features/agenda/AgendaPage.tsx` apenas interpreta a nova origem de navegação `home_professional_schedule` com `professionalId` e `slotDate`: abre a Agenda Geral filtrada na data/profissional, sem abrir um novo agendamento, sem mudar o banco nem a lógica de bloqueio (commit `1413547c014d43d7172d971480537d9b078906a5`).
- `src/features/home/daily-team-agenda.css`: duas colunas responsivas, largura completa do painel administrativo e lista de disponibilidade discreta, commit `1c73232aa716ab443636172632de163c1e5043b1`.
- Novo teste de regressão escrito `tests/unit/administrative-two-day-home.test.tsx`, commit `dae398ca9be6e6153612fb0fb7e50a824e280d0e`, cobrindo sexta→segunda, fim de semana→segunda/terça, carregamento independente, horários livres exibidos apenas na coluna seguinte e link canônico de agendamento.

**Limites e pendências:** mudanças efetuadas somente nos arquivos do frontend e documentação no GitHub; **nenhuma migração ou dado real no Supabase**. Verificadas estaticamente importações/componentes, fluxo de dados, perfil restrito, continuidade do contrato `AgendaScheduleSlot`, funcionamento anterior por parâmetro opcional `mode='all'`. Não declarar testes Vitest/TypeScript/build, CI, publicação Cloudflare nem teste autenticado em Gestor/AO e nas Homes dos demais profissionais como concluídos sem execução efetiva. Confirmar visualmente responsividade, indicadores de confirmação manual/link, preservação de remarcação pelo link, disponibilidade futura sem falsos horários, clique "Consultar agenda", e sexta/fim de semana no calendário local.

**Situação:** CÓDIGO VERSIONADO NA MAIN / HOMOLOGAÇÃO VISUAL E OPERACIONAL PENDENTE / NENHUMA ALTERAÇÃO EM AGENDA GERAL, BLOQUEIOS OU HOMES DOS PERFIS PROFISSIONAIS.

---

## 18/11/2026 — Ajuste visual da Home: restaurar lateral e reduzir agenda administrativa

**Pedido da Titular, continuidade da manutenção da Home autorizada:** preservar na Home do Gestor/Titular os componentes **Aniversariantes de hoje** e **Atividades Recentes** exatamente na coluna lateral que ocupavam antes da divisão da agenda, mantendo a agenda de dois dias úteis visualmente mais discreta. Na Home do Administrativo Operacional, preservar igualmente a lateral anterior de **Pendências do dia** e **Faltosos**. O escopo é exclusivamente de apresentação; preservar as regras de dias úteis, filtragem de horários, disponibilidade, pacientes, ações e os componentes dos demais perfis.

**Causa confirmada:** no CSS `src/features/home/daily-team-agenda.css` o seletor `.gestor-dashboard-grid > .capo-two-day-home, .operational-dashboard-grid > .capo-two-day-home` tinha `grid-column: 1 / -1`; isso fazia a agenda expandir para as duas colunas do grid-pai, deslocando a lateral original para uma linha inferior. O grid-pai preexistente já possuía estrutura principal + lateral e os componentes de aniversariantes/atividades estavam mantidos no DOM.

**Correção cirúrgica aplicada:** commit `ed1fc157e981d8a5ce0f59a752c70a73d08221d6` na branch `main`. Na regra exclusiva da Home administrativa a agenda ocupa somente `grid-column: 1`, restabelecendo a lateral original na segunda coluna; as duas agendas internas continuam lado a lado em larguras adequadas e passam a usar tipografia, paddings, espaçamentos e botões menores exclusivamente sob `.capo-two-day-home`. Mantida quebra responsiva para uma coluna em telas reduzidas. Nenhuma alteração de JSX, de consultas SQL, migrações, bloqueio/grade da Agenda Geral, ou interfaces dos profissionais.

**Validação:** alteração visual versionada no GitHub; execução de build, testes DOM e homologação visual no Cloudflare não comprovada. Verificação de estrutura do CSS e grid original realizada por leitura do repositório. Confirmar na interface publicada se a lateral voltou à posição esperada sem overflow em desktop/tablet e se os botões continuam legíveis e acionáveis.

**Estado:** AJUSTE VISUAL VERSIONADO / HOMOLOGAÇÃO DA HOME PENDENTE.

---

## 18/11/2026 — Refinamento da Home administrativa: somente agendados e avisos de disponibilidade em ambos os dias

**Solicitação da Titular:** a nova Home administrativa com dois dias úteis ficou visualmente longa e esticada. Corrigir a apresentação para **mostrar exclusivamente consultas agendadas nos dois dias**, preservando ao final de **cada coluna** um único aviso sucinto com os profissionais que possuem horários livres no dia correspondente e link `Consultar agenda`; horários livres individuais não devem ocupar a visão rápida. Manter aniversariantes/atividades recentes na lateral original do Gestor e pendências/faltosos na lateral original do Administrativo Operacional. Não mudar a Home profissional nem a Agenda Geral.

**Implementação pontual GitHub `main`:** `AdministrativeTwoDayAgenda.tsx` passou a usar o modo compacto `today` em ambas as colunas, preservando a consulta separada à grade real de cada dia e o cálculo de segunda a sexta-feira. Passou a apresentar título discreto, linha de contexto `Consultas agendadas · disponibilidade ao final` e resumo de vagas por data (commit `4f1b8744f2f64420fdbbe397324be7ba3eb201f4`). Em `DailyTeamAgendaRows.tsx`, o resumo passou a ser neutro quanto à data (`Profissional · horários disponíveis`), mantendo o filtro de slots `livre` com início posterior ao instante atual, e links `home_professional_schedule` que abrem a agenda canônica na data e profissional; pedidos de remarcação já vinculados ao link continuam preservados (commit `b7cb0d91d5e43a1c8cb0122166e40d3f9cba3759`). O CSS `daily-team-agenda.css` reduziu densidade, tipografia, padding e lacunas **somente dentro de `.capo-two-day-home`**, e limitou a altura por coluna com rolagem interna, para a agenda não se alongar verticalmente nem empurrar os painéis laterais (commit `b03a35a607ee272baa2c96c16c8c9eb8bf6da3dc`). Teste específico de duas colunas alterado para verificar ausência de linhas `Horário livre` em ambas e presença do resumo e link de consulta na segunda, commit `aecfa6fe8a4a0958d760db203960b1fe8aea0d4c`.

**Preservação:** Gestor/Titular e Administrativo Operacional utilizam o mesmo componente de Home administrativa; não foram tocados componentes das Homes de profissionais, estrutura de Agendas, bloqueio/remanejamento homologado, status de presença, banco Supabase, horários, profissionais ou dados reais. A regra de múltiplos profissionais com vagas usa grade real e agrupa por ID de profissional, sem repetir horários na visão rápida. Visualização da Agenda Geral segue autorizada por papel.

**Validação pendente:** arquivos de código e teste versionados; não há confirmação de execução de Vitest, build, Cloudflare ou homologação visual autenticada nesta etapa. Conferir responsividade e legibilidade da lista interna rolável em Gestor e Administrativo Operacional e se o aviso de disponibilidade de ambos os dias acompanha os dados reais.

**Estado:** AJUSTE VISUAL E FILTROS VERSIONADOS NA MAIN / AGUARDA HOMOLOGAÇÃO VISUAL DA TITULAR.

---

## 18/11/2026 — Homologação pela Titular da Home administrativa compacta em dois dias úteis

**Confirmação operacional expressa da Titular:** após a manutenção de layout e filtros da Home administrativa, a Titular informou **“Tá ok deu certo”**, confirmando que a apresentação corrigida funciona conforme esperado na interface utilizada.

**Escopo homologado pela Titular:** somente as Homes de **Gestor/Titular** e **Administrativo Operacional** apresentam agenda em dois dias úteis; em ambos, a visualização rápida mostra consultas agendadas e, ao fim de cada dia, aviso compacto de profissionais com horários livres e acesso para consultar a Agenda Geral. Foram mantidos o painel lateral de **Aniversariantes e Atividades Recentes** no Gestor/Titular e de **Pendências e Faltosos** no Administrativo Operacional; a agenda passou a ser compacta e com rolagem própria para evitar alongamento da Home. As Homes dos profissionais continuam no padrão anterior.

**Decisão de manutenção:** **ENCERRADA E APROVADA VISUALMENTE PELA TITULAR**. Preservar o padrão, sem mudanças preventivas ou reestruturação. Reabrir exclusivamente para erro concreto com novo **VERDE** e correção cirúrgica. A confirmação de uso da Titular não significa execução de suíte automatizada ou homologação de fluxos não exercitados.

**Preservação:** nenhuma modificação de banco Supabase, agendamentos, bloqueios da Agenda Geral ou Homes profissionais neste registro documental.

---

## 18/11/2026 — VERDE: padronização global de barras de rolagem com azul translúcido

**Autorização expressa da Titular:** após aprovar a Home administrativa de dois dias úteis, solicitou substituir o contraste da barra de rolagem por **azul-claro translúcido, discreto, fino e arredondado**. Em seguida ampliou expressamente o escopo visual para **todas as barras de rolagem do sistema CAPO, todos os perfis e todas as telas** e autorizou a execução com **VERDE**.

**Implementação única e global:** `src/styles/global.css`, importado por `src/main.tsx` após `tokens.css` para todos os perfis, recebeu os tokens `--capo-scrollbar-thumb` (`rgb(69 151 214 / 29%)`) e `--capo-scrollbar-thumb-hover` (`rgb(54 131 201 / 48%)`). Aplica `scrollbar-width: thin` e `scrollbar-color: ... transparent` para navegadores com suporte padronizado, e pseudoelementos `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb` com largura e altura de 7px, trilho transparente, borda arredondada e incremento leve de cor no hover para motores que suportem esse desenho. Em `forced-colors: active`, mantém cores e espessura automáticas do sistema para acessibilidade.

**Escopo preservado:** somente CSS global estético. Não alterar `overflow`, direção, posição, altura, gesto de toque, navegação, rolagem efetiva, agendas, bloqueios, agendamentos, notificações, solicitações, permissões, dados reais ou homologação. Em dispositivos e navegadores que desenham barras sobrepostas/nativas, o acabamento pode ser controlado pelo próprio sistema operacional, sem regressão funcional.

**Commit GitHub:** `aec4ff55e362f304cbc247552d8e7cd0e0f9ceef` no repositório `danielecarvalho45/caposistema`, branch `main`. A regra está no único arquivo global já carregado na entrada `src/main.tsx`; os estilos locais de módulos e Homes não precisaram ser alterados.

**Verificações e limites:** conferidos por leitura do GitHub a importação da folha global, ausência de padrão de scrollbar existente na folha global e os tokens da identidade visual. Não executado `vitest`/build, teste visual em Firefox, Chromium, Safari e celular, nem confirmada publicação Cloudflare; o padrão final depende do suporte do navegador. **Status: ESTILO GLOBAL VERSIONADO, HOMOLOGAÇÃO VISUAL DA TITULAR PENDENTE.**

---

## 19/11/2026 — VERDE: Comunicação Interna independente de Solicitações

**VERDE expresso da Titular (19/11/2026).** Implantar canal bidirecional de mensagens/recados entre Administrativo (Gestor/Titular e Operacional) e profissionais ativos, inclusive de profissional para profissional, com destinatário individual ou múltiplo, eventual vínculo opcional com paciente autorizado, respostas, histórico de autoria e leitura. **Toda demanda oficial de providência deve passar pelo Administrativo.** Profissional não pode gerar demanda oficial diretamente para outro profissional. O Gestor/Titular executa as mesmas funções administrativas do Operacional, preservados limites de conduta assistencial.

**Arquitetura obrigatoriamente segregada:** módulo novo `/comunicacao` e tabelas novas `capo_internal_communications` (uma conversa por destinatário) e `capo_internal_communication_messages` (respostas cronológicas por conversa). Distinguir tipos `recado` e `demanda_administrativa`; **somente Gestor/Titular e Administrativo Operacional** podem iniciar tipo `demanda_administrativa` e devem direcioná-lo exclusivamente a profissional assistencial ativo e autenticado. Remetentes profissionais podem enviar somente `recado`, nunca demanda formal. O retorno do destinatário libera conclusão administrativa; aceitar/iniciar, responder e concluir registram situação e alteração temporal. Recado abre como mensagem, leitura automática ao abrir; não gera tarefas, encaminhamentos, agendamentos nem altera paciente/prontuário.

**Fluxo de exemplo sem paciente obrigatório:** Administrativo envia recado de confirmação de agenda, mensagem de reunião ou demanda formal de visita domiciliar/consulta de encaixe; profissional recebe na caixa e pelo indicador próprio no cabeçalho, pode responder; na demanda, pode iniciar e enviar feedback; o Administrativo conclui após resposta. Nenhuma comunicação autoriza agendar, bloquear ou alterar data automaticamente. Para agendamento real sempre usar a Agenda Geral já homologada. Quando precisar formalizar uma demanda de profissional ao Administrativo, preservar o módulo oficial **Solicitações** (/solicitacoes) e seu fluxo intacto.

**Segurança e privacidade:**
- Todas as ações de banco acessadas por novas RPCs `SECURITY DEFINER` com conta ativa, sessão, termo, papel autorizado e validação de participante para leitura, mensagens, ciência e mudanças de estado.
- Ambas as tabelas com RLS habilitado, **sem GRANT direto SELECT/INSERT/UPDATE/DELETE** a `anon` e `authenticated`; RPCs somente `authenticated` (sem execução `anon`). Diretório não inclui contas inativas, não autenticadas ou fora do ambiente.
- Produção não pode comunicar com contas de homologação: exigir equivalência `is_homologation_account`; `manuteste` usa papel simulado efetivo quando contexto de homologação está habilitado. Pacientes vinculados devem ser visíveis no contexto do remetente, sem inserir registros falsos.
- Registro independente de recibo de leitura por remetente/destinatário e respostas, sem reusar `administrative_requests`, `administrative_request_events` ou as notificações já homologadas. Os indicadores de mensagens não lidas são próprios da Comunicação, sem interferir no sino oficial de Notificações.

**Alterações versionadas no repositório principal `danielecarvalho45/caposistema`, `main`:**
- Migrações Supabase `20261119103000_create_capo_internal_communication_isolated.sql` (`4906abdd`), `20261119104000_internal_communication_identity_rpc.sql` (`83974cd1`), `20261119105500_internal_communication_homologation_effective_role.sql` (`8a2cf637`), `20261119111000_internal_communication_feedback_and_read_receipt.sql` (`2dbe9993`), `20261119112000_internal_communication_reply_origin_guard.sql` (`c7381150`), `20261119113000_internal_communication_directory_authorized_targets.sql` (`0708659d`); aplicadas com sucesso ao projeto oficial `fftebavlhbfcrvrtnrld`.
- Componente `src/features/communication/InternalCommunicationPage.tsx` (`99d7fc57`, refinamento `5a1ccb50`), CSS próprio (`93360381`, `c2405a8c`), componente de indicador `CommunicationUnreadLink.tsx` (`55618b0b`).
- Contratos tipados em `src/types/database.ts` (`14d4f265`, `0449267f`), nova rota em `src/app/route-access.ts` (`92fc701a`) e `src/app/App.tsx` (`562cb286`); menu compartilhado em `navigation-config.ts` (`2841872e`) e Gestor em `GestorShell.tsx` (`b0aefc2f`); aviso independente de mensagens no cabeçalho dos shells (`c0c1f8e7`, `08d06346`). Testes de interface/perfis escritos em `tests/unit/internal-communication.test.tsx` (`c77f1861`).
- Não foi alterado o código do módulo `src/features/requests/RequestsPage.tsx`, nem a rota `/solicitacoes`, nenhuma função de notificações existentes, Agenda Geral, bloqueios ou prontuários.

**Verificação de banco executada:** tabelas novas existem com RLS verdadeiro e sem leitura direta para `anon`/`authenticated`; cinco RPCs públicas novas negam execução a `anon` e permitem somente `authenticated`; verificado que só resposta do **destinatário** muda o estado da demanda para `respondida` e que a conclusão exige `respondida`. Consulta de conferência encontrou **zero registros** nas novas tabelas de comunicação. Falha transitória na primeira tentativa da migração de refinamento (delimitador de função sem ponto e vírgula) foi corrigida e aplicada com sucesso na tentativa seguinte, sem alterar dados reais.

**Homologação pendente:** não declarar execução de `npm run typecheck`, Vitest, build, CI, deploy Cloudflare, testes reais de login entre contas distintas e entrega de mensagens na interface como concluídos. Testar com contas reais autorizadas e ambientes isolados, comunicação sem/com paciente, profissionais ↔ profissionais somente recados, Administrativo → profissional recado e demanda, resposta, recibo de leitura, atualização de aviso, conclusão após feedback e ausência de qualquer regressão em Solicitações e Notificações. A nova ferramenta **não reabre nem substitui a manutenção congelada** de Solicitações/Notificações.

**Estado:** BANCO APLICADO E ESTRUTURA FRONTEND VERSIONADA / TESTE OPERACIONAL AUTENTICADO E HOMOLOGAÇÃO DA TITULAR PENDENTES.
