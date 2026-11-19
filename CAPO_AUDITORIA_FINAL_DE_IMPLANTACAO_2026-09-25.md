
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

**Endurecimento complementar do vínculo profissional ativo (19/11/2026):** migração Supabase `20261119115000_internal_communication_active_professional_guard.sql`, commit `b3f63cf084aa6cd46f123e7e735483c4c8986f1e`, aplicada com sucesso. O profissional remetente deve manter vínculo assistencial ativo e capacidade efetiva; Gestor/Titular e Administrativo Operacional continuam dispensados de vínculo assistencial porque exercem função administrativa. O módulo segue isolado de Solicitações/Notificações. A tentativa de acesso à clonagem Git local para compilar encontrou limitação de DNS para GitHub neste ambiente; não foi possível executar build nem testes automatizados por essa via. Não interpretar como falha de build.

**Aprimoramento de auditoria e consolidação da Matriz Funcional (19/11/2026):** migrations aplicadas e salvas em `main`: `20261119120000_internal_communication_immutable_status_events.sql` (commit `8d917f86`) cria tabela própria de eventos imutáveis com RLS e acesso direto revogado; `20261119121000_internal_communication_events_in_thread_view.sql` (commit `cdc6c8e8`) acrescenta eventos cronológicos na RPC de leitura dos participantes. Frontend da Comunicação atualizado para exibir o histórico por etapa, reforçar a verificação de destinatário e evitar consulta de autenticação redundante (`bf6bb93a`), com CSS responsivo (`9624446d`). Matriz Funcional estrutural complementada com nova **seção 19**, commit `6c0ea14505d0b160ec6eb2518ccf2d75cf361ff0`, formalizando a mesma regra para Gestor/Titular e Administrativo Operacional, mensagens diretas somente como recados e demanda formal exclusiva do Administrativo.

**Verificação final de metadados Supabase:** três tabelas de comunicação (`capo_internal_communications`, `capo_internal_communication_messages`, `capo_internal_communication_events`) com RLS ativo e sem SELECT direto por `anon` ou `authenticated`; trigger de evento `trg_capo_internal_record_status_event` instalado; RPC de leitura contém eventos e recibo de leitura; zero registros reais ou fictícios de comunicação criados na implantação. Testes de interface estão versionados, mas não executados no ambiente local por impossibilidade de acesso de rede ao GitHub (erro de DNS na tentativa de clonagem). Não assumir passagem de CI, build nem homologação autenticada. A manutenção anterior de Solicitações/Notificações continua fechada e intocada.

---

## 19/11/2026 — VERDE: correção pontual dos avisos de respostas da Comunicação Interna

**Ocorrência real informada pela Titular:** a Comunicação Interna avisava somente na criação da mensagem. Quando o profissional respondia à mensagem recebida, o Gestor/Titular ou Administrativo Operacional que a enviou não via um novo aviso no indicador da Comunicação.

**Diagnóstico verificado no GitHub e contrato Supabase:** a RPC `get_internal_communications_for_interface` já devolvia `unread` relativo à **conta autenticada** (considera `sender_read_at` para remetente original e `recipient_read_at` para destinatário original), mas os filtros de `CommunicationUnreadLink.tsx` e `InternalCommunicationPage.tsx` contavam exclusivamente `recipient_id === myAccountId`. Assim, respostas destinadas ao **remetente original** não eram contadas, e a conversa não aparecia na caixa Recebidas dele. Como `sender_read_at` de conversas recém-criadas pode estar vazio, simplesmente contar os dois lados criaria falso aviso ao próprio autor.

**VERDE explícito para correção pontual**, sem autorização para modificar outras áreas.

**Manutenção realizada no frontend, sem mudança no Supabase:**
1. `src/features/communication/communication-inbox.ts` (commit `684fef7382454462d5272fbbd575fa68d4880be8`): cálculo compartilhado de aviso de entrada que considera participante autorizado, marcador individual `unread` e **autor da última mensagem ou transição de estado** para não notificar o próprio autor; identificação de conversas com resposta recebida pelo remetente original.
2. `src/features/communication/CommunicationUnreadLink.tsx` (commit `6a892fbede12b17d1d9cd2b33eb8e035ab6a25c8`): contador passa a contar a última interação do outro participante em qualquer direção; consulta a cada 20 segundos durante aba visível, ao focar janela, ao voltar para a aba e após evento local de Comunicação Interna. Nenhuma interferência no sino oficial de Notificações.
3. `src/features/communication/InternalCommunicationPage.tsx` (commit `feea998cb92c5d52b02d3abf639f771cc029867e`): a caixa Recebidas inclui respostas que voltam ao remetente inicial; Enviadas mantém o histórico de mensagens iniciadas por ele; indicador de não lidas segue o mesmo cálculo nos dois participantes. Ações de envio, resposta e leitura disparam evento local para atualização imediata do aviso da mesma aba; a caixa aberta também sincroniza a cada 20 segundos na aba visível.
4. Teste de regressão criado `tests/unit/internal-communication-reply-notifications.test.ts` (commit `a0ec37e4f818224235e85875725a404f7991ffcb`): cenários remetente original sem falso aviso, resposta do profissional para Administrativo, resposta administrativa para profissional, mudança de estado sem texto novo, leitura e isolamento dos participantes.

**Preservação:** nenhum SQL/migration alterado nesta correção. Inalterados `administrative_requests`, `administrative_request_events`, `RequestsPage.tsx`, `NotificationsPage.tsx`, permissões, agenda, bloqueios, prontuários e isolamento real/homologação. O Gestor/Titular e o Administrativo Operacional recebem o mesmo cálculo bidirecional. O aviso da Comunicação é atualizado por eventos na própria aba e verificação periódica de até 20 segundos quando há janela visível; não afirmar push instantâneo entre sessões distintas.

**Verificações e homologação pendente:** reconsultados no GitHub os pontos alterados e o contrato da RPC no Supabase antes da manutenção. Os testes foram escritos e versionados; não declarados como executados. Confirmar em teste operacional duas contas ativas: AO/Gestor envia → profissional abre e responde → AO/Gestor vê indicador → abre Recebidas → lê (contador desaparece); Administrativo responde → profissional é avisado. Verificar também que envio inicial não notifica o próprio autor, que mensagens profissionais entre si continuam apenas recados e que `/solicitacoes` e Notificações Gerais não sofreram regressão.

**Estado:** CORREÇÃO PONTUAL VERSIONADA EM `main`; PUBLICAÇÃO E HOMOLOGAÇÃO ENTRE CONTAS AINDA NÃO CONFIRMADAS.

---

## 19/11/2026 — VERDE: isolamento de suporte técnico e notificações TI (manuteste)

**Relato da Titular:** uma notificação de suporte técnico gerada em produção apareceu no ambiente TI da conta de homologação `manuteste`. **VERDE explícito** para correção pontual do isolamento, mantendo um único Supabase e componentes compartilhados, sem apagar, mover ou alterar dados operacionais.

**Evidência consultada antes da manutenção:** chamado real do profissional Ilton, assunto “Botão de solicitação não está funcionando”, criado em 19/11/2026 às 11h26 (BRT), categoria `erro_interface`, id `d723e5c4-549a-411b-958a-59e1bd5d4f6a`, `requester_account_id` real. Dois avisos `technical_support_new` gerados: `target_role=administrador` e `target_role=administrador_tecnico`, sem destinatário individual. O aviso para TI foi marcado como lido, sem prova individual de quem o leu. A auditoria do chamado mostra passagem de pendente para `em_atendimento` pela conta real de Gestor/Titular, não por `manuteste`.

**Causa raiz:** as três RPCs de leitura de notificações permitiam `target_role='administrador_tecnico'` para notificações sem paciente mesmo em contexto de homologação; a leitura/listagem/histórico e as ações do suporte verificavam papel, mas não a origem real/homologação do **solicitante do chamado**. Assim, registros reais sem paciente podiam atravessar a separação lógica.

**Correção aplicada ao Supabase oficial** `fftebavlhbfcrvrtnrld` e versionada em `main`:
- Migration: `supabase/migrations/20261119123000_isolate_technical_support_notifications_homologation.sql`; commit GitHub `b9dcf3f52c6452c7eb2e5dd98a77a995990e95af`.
- Nova função interna `private.capo_support_ticket_visible_in_context(uuid)` compara `is_homologation_account` da conta **que abriu o chamado** com a do usuário autenticado. Para homologação, exige ainda contexto habilitado. Para produção, rejeita registros de teste.
- Aplicado filtro contextual em `get_technical_support_requests_for_interface`, `get_technical_support_requests_detailed_for_interface`, `get_technical_support_history_for_interface`, `process_technical_support_request_for_interface`, `submit_technical_support_test_for_interface`.
- Aplicado em `get_my_notifications_for_interface`, `get_my_notifications_by_state_for_interface`, `get_my_notifications_by_category_for_interface` e `update_my_notification_for_interface` às notificações `entity_type='technical_support_requests'`, cobrindo recebimento, marcação de leitura e resolução indevida entre ambientes.
- A exceção ampla para `administrador_tecnico` em avisos sem paciente foi restrita ao tipo de suporte sujeito ao **novo filtro de isolamento**.
- **Não alterar** a tabela de notificações nem o fluxo oficial de outras solicitações; preservar Gestor/Titular real no acesso ao suporte, sem concessão indevida ao `manuteste`.

**Verificação executada:** transação SQL `BEGIN READ ONLY ... ROLLBACK` com contexto de autenticação controlado: o chamado real de Ilton foi **invisível ao `manuteste`** (inclusive quando o contexto de homologação estava habilitado), e **visível à conta real de Ilton e à conta real Gestor/Titular**. O teste SQL conferiu ainda os nove contratos de RPC com proteção presente, sem escrever dados. Arquivo de regressão `tests/sql/technical_support_notifications_isolation_readonly.sql`, commit `f1030649ad7fa150cdf00d041982c8052f372216`, executado sem erro.

**Homologação operacional pendente:** confirmar em login real e manuteste na interface a ausência de avisos de produção em `Notificações` e chamados reais em `TI`; confirmar que TI em homologação pode trabalhar somente sobre chamados gerados naquele contexto. Não afirmar execução de Vitest/build, navegação autenticada e Cloudflare apenas pelos testes SQL.

**Estado:** CORREÇÃO DE SEGURANÇA APLICADA E TESTADA NO BANCO; HOMOLOGAÇÃO VISUAL PENDENTE.

---

## 19/11/2026 — VERDE: correção pontual da criação de solicitação geral no perfil Ilton

**Relato e evidência:** chamado real de suporte `d723e5c4-549a-411b-958a-59e1bd5d4f6a`, profissional Ilton, erro `Could not find the function public.create_administrative_request_for_interface(p_description, p_subject) in the schema cache`. A conta `ilton` está ativa, vinculada ao profissional ativo e possui os papéis `profissional` (principal) e `coordenador` (acumulado). A função existente no Supabase é `create_administrative_request_for_interface(p_patient_id uuid,p_subject text,p_description text)` e permite paciente `NULL`. O código em `src/lib/supabase/rpc.ts` omitia `p_patient_id` quando ausente, transmitindo `undefined`, o que fazia o PostgREST procurar uma assinatura com apenas os dois campos de texto.

**VERDE explícito da Titular:** correção pontual da criação de solicitação sem paciente, sem alterar módulos estabilizados ou autorizações do Ilton.

**Correção aplicada:** `src/lib/supabase/rpc.ts`, commit `962deda30c0d48c67473d3266e40161123307ead`, substituiu `undefined` por `null` no parâmetro `p_patient_id`. Refinamento de testabilidade no mesmo arquivo, commit `f17d9d9ddb974bb72b748e319f5b220bae358dc8`, utiliza função determinística `administrativeRequestRpcPatientId` para serializar o paciente opcional: `null` ou `undefined` → `null`; UUID fornecido → UUID preservado. **A RPC sempre recebe os três nomes de parâmetros**, mantendo o comportamento de solicitação geral e solicitação vinculada a paciente.

**Teste de regressão adicionado:** `tests/unit/administrative-request-rpc-args.test.ts`, commit `5da94fb1b457a7abb30af189a4c408c171c9317e`, cobrindo ausência e presença de paciente. O teste de interface pré-existente `tests/unit/requests-page.test.tsx` já confere envio de solicitação geral por profissional com `patientId=null`. Testes versionados, mas **sem prova de execução Vitest, build, login autenticado do Ilton ou publicação Cloudflare neste turno**; não declarar homologação funcional até teste real.

**Escopo preservado:** nenhum SQL, tabela, RLS, RPC de Supabase, registro real, solicitação existente, permissão, agenda, Comunicação Interna ou Notificação Geral alterado. `RequestsPage.tsx` permanece intacto. O chamado de Ilton permanece sujeito ao procedimento normal de TI; não marcar como resolvido antes de homologação.

**Estado:** CORREÇÃO DE CÓDIGO APLICADA EM `main`; COMPILAÇÃO/PUBLICAÇÃO E TESTE OPERACIONAL DO ILTON PENDENTES.

---

## 19/11/2026 — VERDE: quadro de avisos de manutenção no Gestor/Titular e TI

**VERDE expresso da Titular:** colocar quadro próprio de **Avisos de Manutenção** abaixo de **Atividades Recentes** na Home Gestor/Titular e disponibilizar o mesmo quadro no Painel do perfil TI. Não confundir chamados de suporte técnico com Solicitações Administrativas e não misturar ambientes reais/homologação.

**Implementação versionada em `main`:**
- `src/features/technical/MaintenanceNoticeBoard.tsx` (commit `19ebf6c9755b3351a0cc6c728244f682621ed237`): componente reutilizável que consulta `getTechnicalSupportRequests(null,100,0)` da camada CAPO protegida pelas RPCs de isolamento lógico. Somente chamados em `pendente`, `em_atendimento` e `aguardando_teste` aparecem, por data de criação mais recente. Exibe assunto, solicitante, situação, data, contador, até oito avisos e link de abertura; exibe vazio ou erro sem dados fictícios. Atualiza a cada 30 segundos enquanto aba está visível, ao focar e ao retornar à aba; permite atualização manual.
- Estilo próprio `src/features/technical/maintenance-notice-board.css` (commit `81a29840c2101242d99feb5135e2309960bc0983`) sem alterar o estilo antigo da Home ou do Painel Técnico.
- `src/features/gestor/GestorDashboard.tsx` (commit `4d1129f023c82abf116f1f5eab271155d8b41285`): quadro inserido na lateral da Home, **imediatamente depois do card Atividades Recentes**, preservados aniversário, agenda, acessos rápidos e resumo da gestão.
- `src/features/technical/TechnicalPage.tsx` (commits `61c3b99201a710653545e0ea9ab579a00e50bd13`, `630bf0fac4d3b559b8605aaf904ae834a7788ac8`): mesmo quadro no painel técnico, sem alterar comandos de execução do chamado; ao clicar abre aba Chamados e histórico, recarregando a lista. Link da Home Gestor direciona a `/tecnica?chamado=ID` para abrir a ocorrência correspondente.
- Testes de regressão versionados em `tests/unit/maintenance-notice-board.test.ts` (commit `c4f8114959264be436f04bb9be3f92b8d717a092`): estados pendentes/atendimento/aguardando teste, exclusão de resolvidos e cancelados e lista vazia.

**Invariantes:** sem criar tabela, migração, trigger ou notificação duplicada. A identificação do ambiente continua responsabilidade da RPC existente de suporte técnico, com isolamento já corrigido e verificado na manutenção anterior. Gestor/Titular real vê somente chamados do ambiente real; TI de homologação (`manuteste`) vê apenas chamados criados no ambiente de teste. Perfil TI real também vê os registros reais autorizados. Os chamados concluídos permanecem consultáveis na Área Técnica e histórico, não no quadro de pendências.

**Verificação:** foi conferida no GitHub a presença das importações, quadro nas duas telas, link de abertura, filtro de pendências e testes escritos. **Não foi comprovada execução de Vitest/build, publicação Cloudflare nem teste visual autenticado nesta manutenção**; não declarar como homologada até o teste nos dois perfis. Nenhum registro de atendimento ou de suporte foi modificado durante a implantação.

**Situação:** CÓDIGO DE INTERFACE VERSIONADO; HOMOLOGAÇÃO OPERACIONAL PENDENTE.

---

## 19/11/2026 — HOMOLOGAÇÃO OPERACIONAL: avisos de manutenção Gestor/Titular e TI

**Confirmação da Titular:** “testado ok”. O quadro de Avisos de Manutenção, implementado mediante VERDE, foi **testado e aprovado operacionalmente** no fluxo solicitado para Gestor/Titular e perfil TI. A manutenção anterior estava registrada como implementação versionada e pendente de teste visual; o presente registro atualiza o estado para **HOMOLOGADO PELA TITULAR / ENCERRADO**.

**Escopo aprovado:** quadro abaixo de `Atividades Recentes` na Home Gestor/Titular; quadro no Painel Técnico do TI; acompanhamento de chamados técnicos pendentes, em atendimento e aguardando teste, consulta do histórico e acesso ao chamado. Preservados o isolamento real/homologação, a tabela e RPC existentes, as solicitações administrativas, as notificações gerais e as rotinas previamente homologadas.

**Regra de estabilidade:** não alterar ou reconstruir essa funcionalidade homologada sem nova falha comprovada e autorização específica da Titular. Quaisquer futuras manutenções deverão ser cirúrgicas e não regressivas. Esta confirmação diz respeito ao **teste operacional informado pela Titular**; não equivale a afirmar que CI, Vitest ou build foram executados neste turno.

---

## 19/11/2026 — VERDE: cancelamentos e motivos abaixo de Faltosos na Home de todos os profissionais

**VERDE explícito da Titular:** em **todas as Homes profissionais**, acrescentar quadro de cancelamentos de consultas da data atual, com horário original, paciente, motivo, data/hora do cancelamento e responsável pelo registro, **imediatamente abaixo do card Faltosos**. Não reconstruir agenda, não manter consulta cancelada como slot ocupado, não misturar ambientes e não confundir cancelamento com falta.

**Implementação (GitHub `main`):**
- `supabase/migrations/20261119170000_professional_home_daily_cancellation_notices.sql`, commit `f9b81643ba08e97e02fd1aa5ebc5e66a9b304030`, **aplicada ao Supabase oficial**. RPC read-only `public.get_my_daily_appointment_cancellations_for_interface(p_date date)`, `SECURITY DEFINER`, exige autenticação, conta ativa, aceite do termo vigente, papel `profissional`, vínculo profissional `capo_effective_professional_id()`; filtra exclusivamente `patient_appointments.professional_id` do usuário, situação `cancelado`, data local São Paulo e `capo_patient_visible_in_current_context(patient_id)`. Retorna apenas informações pertinentes à consulta e ao cancelamento, sem permissão de escrita. `anon` sem EXECUTE.
- `src/features/agenda/ProfessionalDailyCancellations.tsx`, commit `20d4fe4f0da5dfd9390bdffd678495a1d6554692`, componente informativo com consulta da data atual `capoTodayIso()`, lista, estados de carregamento/erro/vazio e atualização com aba visível a cada 30s e ao voltar foco. Sem botões de cancelamento/remarcação.
- `src/features/agenda/professional-cancellations.css`, commit `54f65a3405d4df013f83733b7ebbbac4560bc631`: estilo discreto e responsivo.
- `src/features/agenda/AgendaPage.tsx`, commit `164e215b1dfad88d6ad0344c34f001f18896eaef`: inserido `<ProfessionalDailyCancellations />` **logo depois do indicador Faltosos**, sob `embeddedHome && isProfessional`. Como `AgendaPage embeddedHome` é compartilhado por `AssistentialPage` (Clínico Geral e demais assistenciais/psicologia/fisioterapia), `NutritionPage` e `SocialPage`, aplica-se às Homes profissionais sem mudanças isoladas em cada perfil.
- Testes versionados `tests/unit/professional-home-cancellations.test.ts`, commit `2e886b0cf709f1f6d1d638682c385d75ab556d7b`: ordenação e ausência de dados fictícios.

**Conferências realizadas:** função criada no Supabase e GitHub, estrutura da Home revisada. Ensaio SQL `READ ONLY` com identidade do clínico Ilton verificou **zero cancelamentos de outros profissionais**, sem gravar dados. Ensaio simulando login Danilo foi **recusado pela validação de termo legal**; consulta dos registros mostrou que a conta Danilo tinha **zero aceites de termo** no momento da verificação. Isso não autoriza contornar o termo nem afirmar tela homologada: ele precisará cumprir o fluxo normal do aceite antes de poder utilizar recursos protegidos. A consulta real de Dulce de 19/11 às 12h10 permanece `cancelado`, preservando `attendance_reason` e auditoria.

**Invariantes:** nenhuma alteração em `patient_appointments`, grade ativa, `get_agenda_schedule_grid_for_interface`, Notificações, Faltosos, filas, óbito, retorno, remarcações, agenda recorrente, componentes existentes, permissões ou ambiente de homologação. Nenhuma duplicação de dados, criação de segundo banco, alteração de status de consulta ou aviso automático ao profissional (este último é demanda distinta).

**Pendente de homologação:** execução automatizada de Vitest/build, publicação Cloudflare e teste visual após login/aceite do termo de cada profissional. Não declarar homologado até confirmação da Titular.


---

## 19/11/2026 — HOMOLOGAÇÃO APROVADA: Cancelamentos do Dia na Home profissional

**Manifestação da Titular:** após verificar a alteração na interface do ambiente de teste (`manuteste`), a Titular declarou expressamente: **“testado o comportamento no ambiente teste e foi aprovado”**.

**Status:** **HOMOLOGADO E APROVADO NO AMBIENTE DE TESTE; MANUTENÇÃO ENCERRADA.**

**Escopo homologado informado pela Titular:** quadro `Cancelamentos do Dia` imediatamente abaixo de `Faltosos` na lateral da agenda da Home profissional compartilhada, com informações de cancelamento e motivo, sem reocupar o slot cancelado e mantendo o histórico. A implementação utiliza a leitura individual do profissional e respeita a separação lógica entre produção e homologação.

**Proteção contra regressões:** preservar a posição do quadro, sua finalidade apenas informativa, a grade ativa, Notificações, Faltosos, prontuários, fluxos de remarcação e demais componentes já homologados. Não iniciar alterações preventivas ou reestruturação. Uma nova manutenção nesta frente exige erro concreto e autorização específica (`VERDE`) da Titular.

**Limite de evidência:** a aprovação relatada é um teste de comportamento **no ambiente de homologação**. Não equivale a afirmar testes autenticados no perfil real de cada profissional, execução de Vitest/build ou publicação Cloudflare confirmada por ferramentas neste registro. A pendência anterior de aceite do termo legal da conta Danilo não foi alterada.

---

## 19/11/2026 — VERDE: isolamento do feedback individual do suporte no sininho Gestor/Titular

**Relato e VERDE da Titular:** o sininho do Gestor/Titular exibia o feedback do chamado técnico aberto pelo clínico Ilton, apesar de o feedback ter sido produzido pelo próprio perfil Gestor e destinado ao solicitante. Houve VERDE expresso para investigar e corrigir pontualmente, sem reconstruir Notificações, suporte ou TI.

**Evidência Supabase anterior:** chamado `d723e5c4-549a-411b-958a-59e1bd5d4f6a`, estado `aguardando_teste`, feedback administrativo “por favor recarregue a pagina do capo e teste o botão novamente”. A notificação `technical_support_test_requested` tinha `user_id` do login `ilton`, `target_role='usuario'`, não havia duplicação para o Gestor. As três RPCs `get_my_notifications_for_interface`, `get_my_notifications_by_state_for_interface`, `get_my_notifications_by_category_for_interface` permitiam `or 'administrador'=any(v_roles)`, fazendo o Gestor enxergar mesmo notificações individualmente endereçadas a outro usuário. A RPC `update_my_notification_for_interface` tinha autorização ampla equivalente, permitindo potencialmente leitura/resolução indevidas.

**Implementação:** migração `supabase/migrations/20261119183000_notification_direct_recipient_guard.sql`, commit `b45636e765ca0c1575d96548d3f93f89ffac89d3`, **aplicada com sucesso ao Supabase**. Nas quatro RPCs foi acrescentada a verificação obrigatória `(n.user_id is null or n.user_id=auth.uid())` antes da autorização por papéis. Destinatários individuais ficam exclusivos; notificações institucionais sem `user_id` continuam sujeitas ao filtro de papéis, inclusive o acesso amplo legítimo do Gestor/Titular. Permanecem os filtros de paciente, ambiente de homologação e ticket de suporte já homologados. Sem alteração de estado ou exclusão de notificações, sem alteração de frontend ou fluxos do módulo TI.

**Validação realizada com identidade simulada em transação, sem persistir alterações:**
1. Consulta como `daniele` a `get_my_notifications_for_interface`, `get_my_notifications_by_state_for_interface('all')` e `get_my_notifications_by_category_for_interface('general','all')`: 0 ocorrências do feedback individual do Ilton.
2. As mesmas três consultas como `ilton`: 1 ocorrência da notificação individual.
3. Aviso institucional `technical_support_new` para `administrador`: mantido visível no Gestor.
4. Ação `update_my_notification_for_interface` como `daniele` contra o aviso individual do Ilton: **negada com SQLSTATE 42501**, testada dentro de transação revertida. Nota: uma tentativa prévia de executar ação em transação `read only` foi bloqueada por `SELECT FOR UPDATE` antes de validar a regra; repetido corretamente em transação revertida.
5. Reconsultado o registro: `read_at IS NULL`, `resolved_at IS NULL`, e as quatro RPCs contêm a guarda de destinatário.

**Limites:** testes SQL funcionais concluídos, porém testes de interface autenticada do sininho e deploy Cloudflare não foram executados neste turno. A regra já está no banco em uso, sem necessidade de implantação do frontend. Proteção contra regressões: não interferir nos Quadros de Avisos de Manutenção, Comunicação Interna, Agenda, Faltosos, nem nas notificações institucionais por papel. Acompanhamento operacional pela Titular antes de homologação visual final.


---

## 19/11/2026 — VERDE: atualização automática e protegida de versão do CAPO

**Solicitação e VERDE da Titular:** atualizar automaticamente o CAPO quando uma nova versão das telas for publicada, sem impor `Ctrl+R` e **sem interromper consultas, agendamentos, formulários ou registros assistenciais não salvos**. Preservar todos os perfis e o isolamento dos dados, sem alteração de operações de banco.

**Implementação cirúrgica em GitHub `main`:**
- `vite.config.ts`, commit `a76258717b7839a83e0bf276c5591a7618fcbe4a`: em cada build Vite, gera um identificador único `capoBuildVersion` embutido no JavaScript e publica um arquivo estático `/capo-version.json` com o mesmo ID. O servidor Cloudflare Pages precisa concluir a publicação do novo build antes que o navegador detecte a mudança.
- `src/components/system/CapoAutomaticVersionUpdate.tsx`, commit `76468f3c6701a27752068077f07f05466d08f2cb`: consulta `/capo-version.json` a cada 60s somente com aba visível e conexão disponível (`cache: no-store`), também ao voltar para a aba; compara com a versão do bundle atual. Ao detectar mudança, exibe aviso discreto `Nova versão do CAPO disponível`. **Recarga automática somente na rota Home `/`, após 120s sem interação, com aba visível, online, sem qualquer campo editado na sessão, sem editor em foco e sem diálogo/modal aberto**. Em qualquer outra tela ou sessão com edição, mantém o aviso de atualização manual; se houve edição, o clique exige confirmação explícita antes do recarregamento. A verificação não modifica dados, autenticação, agendas ou prontuários.
- `src/components/system/automatic-version-update.css`, commit `20ec8c5019fa0c5301248fbbee7b91ddea75e466`: aviso discreto e responsivo.
- `src/app/providers.tsx`, commit `5c1bac5fa383da6c4cd47dd7f0ca119054e8408c`: mecanismo único para todos os perfis, dentro de `AccessGate`; fluxo público de confirmação `/confirmar-consulta` permanece independente e não recebe atualização automática.
- `tests/unit/capo-automatic-version-update.test.ts`, commit `df3086cf4000a98c9a920e25d8784bbff310a81b`: testes de segurança de rota, tempo de ociosidade, edição, campos ativos, modal, conexão e visibilidade.

**Comportamento contratado:** atualização do Supabase entra em vigor nas próximas consultas e não depende do novo mecanismo. Atualização de frontend depende primeiro da publicação pelo Cloudflare Pages. O cliente detecta o novo manifesto e recarrega **somente em condição conservadora e segura**, preferindo a segurança de informações não salvas à atualização imediata. O aviso pode permanecer pendente até a próxima situação segura ou clique consciente do usuário. O mecanismo não promete reconhecer todo processo assíncrono ou auto-salvamento como seguro; por isso restringe a recarga automática à Home ociosa e nunca força reload nas telas assistenciais.

**Status da verificação:** código e testes foram versionados no GitHub. Ainda não há prova, neste registro, de execução automatizada de Vitest, build Vite, publicação Cloudflare ou teste operacional autenticado. Não declarar o comportamento homologado antes da verificação da Titular em produção/homologação. Manutenção nova não altera banco Supabase.


---

## 19/11/2026 — VERDE: agendamento de visita domiciliar no próprio bloqueio da Home da Assistência Social

**Autorização expressa da Titular (VERDE):** manter a Home de Assistência Social com a mesma agenda visual dos demais profissionais, retirar painel separado e textos longos de `Agendar Visita Domiciliar`, e oferecer inclusão de pacientes **diretamente no período de Visita Domiciliar previamente bloqueado**, como no fluxo de Gestão/Titular. Preservar os bloqueios, pacientes vinculados, histórico, Agenda Dia/Semana/Mês e a regra de horários coletivos.

**Inspeção prévia:** a Home `src/features/social/SocialPage.tsx` já compartilha `AgendaPage embeddedHome`; a agenda exibia adicionalmente um `SocialHomeVisits mode="schedule"` separado, com avisos desnecessários. A grade canônica usa `get_agenda_schedule_grid_for_interface` e o módulo existente `manage_social_home_visits_for_interface` é responsável por adicionar paciente ao bloqueio `visita_domiciliar`. A agenda da profissional Natália apresentou bloco ativo do dia 18/11/2026 09h–12h com um paciente (leitura anterior, sem alteração de dados).

**Mudanças cirúrgicas GitHub `main`:**
- `src/features/agenda/AgendaPage.tsx`, commits `6584b099ec22fc34466dee9a414b0fb08c9d8e4c` e `8c4192b53f0f0d09283b321d662688d03e8e779c`: removido o painel separado `SocialHomeVisits mode="schedule"` apenas do fluxo da profissional de Assistência Social; inserido botão `Adicionar paciente` diretamente no cartão de período de Visita Domiciliar exibido na agenda, com formulário compacto expandível; filtradas as linhas redundantes de bloqueio de mesmo período quando esse bloco coletivo já está representado. Dia/Semana/Mês e os demais perfis utilizam os componentes homologados sem mudanças.
- `src/features/agenda/SocialHomeVisits.tsx`, commit `81b5e4e4c6069e5389c6992794a953f64685e9f9`: acrescentadas props opcionais `onlyBlockId` (somente o bloco clicado) e `compact` (sem longas explicações e listagem duplicada). A chamada existente ao Supabase `manage_social_home_visits_for_interface`, ação `add`, permanece a mesma, com `p_block_id` do bloqueio e `p_visit_time: null`, sem agendamento paralelo.
- `src/features/agenda/agenda-page.css`, commit `e9878ef9c17f25ff644b17fbd4fa58dc4abdfa21`: formulário compacto integrado visualmente ao cartão do período.
- `tests/unit/social-home-visits.test.tsx`, commit `92f943d005c123b4694d477c6f2bad705e65767f`: acrescido cenário de inclusão de paciente somente no bloco clicado, sem ação `create`, com ausência de painel explicativo no modo compacto.

**Garantias:** nenhuma migração, atualização ou criação de registro no Supabase nesta manutenção; nenhum paciente fictício; consulta e escrita já protegidas pela RPC oficial que restringe a agenda e o contexto; o bloco continua único, coletivo e com motoristas responsáveis pela rota; ações do Gestor/Titular/Administrativo e fluxo de configuração dos bloqueios não foram modificados.

**Status:** implementação versionada em `main`. Teste unitário adicionado ao repositório, mas **não foi executado nesta sessão**; build, publicação Cloudflare e teste autenticado da Home da profissional ainda não confirmados. Solicitar à Titular teste operacional em ambiente de homologação antes de declarar aprovação/homologação.


---

## 19/11/2026 — VERDE: escolha inicial de Cadastro Novo / Cadastro Existente

**Autorização:** apresentar primeiro apenas as opções Cadastro Novo e Cadastro Existente; ao selecionar, abrir o mesmo formulário atual. Preservar integralmente dados, campos, regras, obrigatoriedades, duplicidade, oferta, permissões e RPCs.

**Código:** src/features/patients/PatientsPage.tsx, commit 0096ae0b80f604975e75d48a15a870367714ef13 (main). Seletor inicial por botões antes dos campos; título do tipo escolhido e opção de voltar à seleção. A reabertura da aba Cadastrar e a finalização dos fluxos de cadastro retornam à escolha inicial. Sem alteração nos campos, persistência ou no banco.

**Estado:** versionado em main; testes automatizados, build, publicação Cloudflare e homologação visual não confirmados. Homologação operacional em manuteste pendente.


---

## 19/11/2026 — VERDE: cartões visuais na escolha inicial do tipo de cadastro

**Pedido:** fazer a tela de escolha do cadastro no mesmo formato da demonstração aprovada: dois cartões lado a lado, com ícone, título, descrição curta e ação Selecionar. Não alterar nenhum dado, campo ou regra dos formulários.

**Implementação em main:** src/features/patients/PatientsPage.tsx commit 7f11f6142cb1d912965d683a37a04e65855317af; src/features/patients/patients-page.css commit 1a2ae61859f41f01dc3222b852eb021b6e0eee82. Botões Cadastro Novo e Cadastro Existente em cartões clicáveis, layout responsivo com uma coluna no celular; ambos abrem o formulário atual já condicionado a registrationKind.

**Invariantes:** sem mexer no formulário, dados, campos, obrigatoriedades, banco, RPCs, oferta inicial, duplicidade ou permissões. Apenas apresentação da seleção inicial. **Status:** código versionado; homologação visual, build e deploy não confirmados nesta sessão.


---

## 19/11/2026 — Ajuste pontual do bonequinho no cartão Cadastro Novo

**Solicitação da Titular:** manter o bonequinho, porém com desenho mais bonito, sem modificar as cores e definições homologadas do Manual da Interface.

**Implementação:** somente o emoji de pessoa no cartão Cadastro Novo foi substituído por SVG vetorial discreto, de linhas finas e cor herdada do tema, no arquivo src/features/patients/PatientsPage.tsx, commit 06d65cdf732fc911cab5c86d57924cfcf52d24a3. O cartão Cadastro Existente, as cores, estilos globais, formulários, regras e banco permanecem sem alteração.

**Estado:** código versionado em main; publicação Cloudflare e homologação visual pendentes de confirmação.


---

## 19/11/2026 — Homologação visual do ícone do Cadastro Novo e VERDE para Solicitações Recebidas

**Confirmação da Titular:** "DEU CERTO" referente ao novo ícone vetorial do Cadastro Novo. Manutenção visual aprovada operacionalmente e encerrada, sem mudanças na paleta nem nos formulários.

**Novo VERDE da Titular:** iniciar a tela de Solicitações pela visão **Recebidas**, e não por **Todas**, preservando os demais filtros, status, abas e procedimentos do módulo.

**Diagnóstico:** em `src/features/requests/RequestsPage.tsx` a aba `recebidas` já vinha selecionada, mas o estado inicial do filtro `status` era vazio (Todas), o que carregava solicitações de qualquer situação. O botão Recebidas também reconfigurava indevidamente o filtro para vazio.

**Correção cirúrgica no GitHub main:** commit `7083215e03699bbe7bac87cd50238188748b92bf`: status inicial `pending`, e comando Recebidas agora usa `pending`. Mantidos filtros e ações das demais abas. Teste de regressão versionado em `tests/unit/requests-page.test.tsx`, commit `42bcee41b18543a6dbc7e02a0c6510dcaef9a0fb`, confere botão Recebidas selecionado, filtro em pending e RPC invocada com pending. Nenhuma alteração de Supabase, registros ou permissões.

**Situação:** código e teste versionados; execução de Vitest/build, publicação Cloudflare e homologação operacional ainda não comprovadas. Não declarar manutenção homologada sem confirmação da Titular.


---

## 19/11/2026 — VERDE: simplificação exclusiva do descritivo da tela Transporte

**Autorização expressa da Titular:** manter o fluxo de Transporte como está — inclusive necessidade ativa, vínculo obrigatório a agendamento, PDF e permissões — e substituir somente a lista extensa “Como solicitar transporte”, considerada visualmente inadequada, por orientação breve no padrão visual existente.

**Alteração cirúrgica:** em `src/features/transport/TransportPage.tsx`, substituída somente a lista de etapas pela orientação “Solicitação de Transporte — Selecione o paciente e um agendamento válido para registrar a solicitação. A necessidade de transporte permanecerá ativa até seu cancelamento formal.” Reaproveitado o contêiner `home-ops` já usado no CAPO, sem nova paleta, CSS, componente ou comportamento. Commit `79f41593c187a562b7323027ff28221c6ea13ee4` na branch `main`.

**Preservação:** nenhum SQL, Supabase, formulário, pesquisa, consulta, agendamento, autorização, validação, PDF, salvamento ou fluxo de processamento foi modificado. **Verificação:** alteração do código registrada; build, testes automatizados, publicação Cloudflare e homologação visual ainda não confirmados.
