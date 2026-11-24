## 24/11/2026 — APROVAÇÃO VISUAL DA TITULAR: logomarca CAPO com efeito 3D

**Manifestação expressa da Titular:** após a implementação do efeito de alto-relevo 3D na logomarca, respondeu **"perfeito, pode registrar"**. Fica registrada a **aprovação do resultado visual da logomarca**, para a tela de login e os menus laterais dos perfis abrangidos pela manutenção anterior.

**Decisão de continuidade:** preservar o acabamento aprovado da logomarca; não substituir o arquivo original nem alterar proporções, cores, dimensões ou posicionamento. Novas mudanças nesse efeito somente mediante novo relato e autorização expressa VERDE. Mantido o backup reversível `backup/logo-antes-relevo-3d-2026-11-24`.

**Limites do registro:** esta é a aprovação visual informada pela Titular; não representa comprovação de testes automatizados, inspeção individual de todos os perfis ou publicação no Cloudflare, que não foram verificados nesta etapa. Nenhuma alteração adicional em CSS, código funcional, dados ou banco.

---

## 24/11/2026 — VERDE: alto-relevo 3D somente na logomarca CAPO do login e menus laterais

**Determinação da Titular:** aplicar sensação de logomarca saindo da tela, em 3D elegante e estático, preservando a própria imagem, as cores, proporções e posicionamento. Abrange login, Gestor/Titular e todos os perfis que utilizam o menu lateral padrão (inclusive o modelo genérico de novos profissionais). Sem alterar os fundos, acessos rápidos, formulários, demais elementos ou funcionalidades.

**Backup reversível:** criada e confirmada a branch `backup/logo-antes-relevo-3d-2026-11-24` apontando para o estado anterior `c3cb07b5e258537c921fa12831501c3bf3d9a503`. Para reverter a mudança, remover somente os três blocos CSS novos e preservar commits posteriores.

**Implementação somente CSS no GitHub `main`:** aplicação de `filter: drop-shadow(...)` em três camadas de profundidade e `transform: translateY(-2px)` sobre a imagem original `/assets/capo-logo.jpg`. Sem substituir arquivo ou alterar HTML/React, altura, largura, cores ou proporção:
- `src/components/auth/access-gate.css`, seletor `.login-wrap .auth-logo` — commit `0644bce6eb6860e414733643bfe0f3a5feb99408`.
- `src/components/shell/app-shell.css`, seletor `.app-brand img[src="/assets/capo-logo.jpg"]` — commit `9baa66ed79226243abda3ca36c50d28dd504785d`.
- `src/features/gestor/gestor.css`, seletor `.gestor-brand img[src="/assets/capo-logo.jpg"]` — commit `5841dfbdf23bfd073ff7c8fa9e584e8f87c99027`.

**Validação:** alterações versionadas, sem alterações de banco, credenciais, regras ou rotinas. Não há comprovação nesta etapa de publicação Cloudflare, execução de testes automatizados ou verificação visual em desktop/mobile; homologação da Titular pendente.

---

## 24/11/2026 — VERDE: concluir padronização 3D dos atalhos da Assistência Social e do Painel Técnico

**Verificação precedente:** os atalhos coloridos dos componentes gerais do Gestor, Home e modelo profissional já possuíam o acabamento 3D, mas a Assistência Social (`.social-quick-card`) e o Painel Técnico (`.technical-quick-card`) utilizavam CSS próprio ainda sem o relevo aprovado. A Titular concedeu VERDE para completar **somente esses botões**, sem linhas de borda nem outras mudanças.

**Backup desta etapa:** branch `backup/atalhos-social-tecnico-antes-3d-2026-11-24` criada a partir do commit `4f3b212c80e3782d643cc501f95dd5a4e5a45565`. Reversão, se solicitada, deve remover somente os seletores desta etapa e preservar o restante das manutenções.

**Alterações em GitHub `main`:**
- `src/features/social/social-page.css`: regras específicas para `.social-quick-access.home-profile-standard .social-quick-card`, removendo a borda e aplicando relevo discreto por sombra e elevação no hover (commit `05c36a909c71ec9abe952be7777e7022c06325b9`).
- `src/features/technical/technical-page.css`: regras específicas para `.technical-page .technical-quick-grid .technical-quick-card`, com o mesmo relevo e sem contornos; o indicador do item ativo do Painel Técnico usa sombra reforçada sem a antiga linha de outline, preservando identificação visual do módulo ativo (commit `7c79a8672bea2f5121d5d35162a3adba4329cb2a`).
- Respeitados ponteiro hover e preferência `prefers-reduced-motion`; estados de foco receberam sombra perceptível. Fundo degradê, cartões não pertencentes aos atalhos, cores, fontes, ícones, tamanho, posição, funcionalidade, permissões e dados permanecem inalterados.

**Status:** alterações de CSS versionadas; sem migração ou modificações no banco. Publicação Cloudflare, testes automatizados e homologação visual de perfis em desktop/mobile não comprovados nesta etapa.

---

## 24/11/2026 — VERDE: efeito 3D discreto somente nos botões coloridos dos Acessos rápidos, sem bordas

**Determinação da Titular:** após aprovação do fundo degradê, manter o fundo exatamente como está (a retirada do branco já foi realizada). Alterar **apenas os botões coloridos dos Acessos rápidos**, com sombra/relevo 3D suave, **sem linha de borda ou contorno**. Não modificar outros botões, cartões comuns, formulários, menus, fontes, cores institucionais, ícones, tamanhos, posições, funções, agendas, permissões ou dados.

**Preservação reversível:** antes da manutenção, criada a branch `backup/atalhos-antes-relevo-3d-2026-11-24` no commit `226f7e16b97ac9c0779bcdf3f61da0f8997b0a08`. Branches anteriores `backup/visual-antes-mudanca-fundo-2026-11-24` e `backup/fundo-degrade-suave-antes-reforco-2026-11-24` permanecem disponíveis. Uma eventual regressão visual deverá reverter **somente os seletores adicionados nesta manutenção**, preservando todas as demais mudanças posteriores.

**Implementação exclusivamente CSS:** `src/features/gestor/gestor.css` (commit `abcb40694ea64fb3489ee92205f38d72cd8d60df`) adiciona relevo por `box-shadow`, remove somente a borda dos atalhos `.gestor-dashboard .gestor-quick-grid .gestor-quick-card`, e aplica elevação discreta ao hover em dispositivos com ponteiro. `src/features/home/home-page.css` (commit `846ad4f7fbcf34dc51f2809eab3e2e1f75f4c89f`) faz o equivalente somente nos `.home-profile-card.quick-*` coloridos das demais Homes. Estados de foco preservam destaque visual por sombra, sem linha de contorno; movimento desativado quando `prefers-reduced-motion: reduce`. Nenhuma regra de fundo da página foi alterada.

**Validação e limites:** alterações versionadas no GitHub `main`. Publicação no Cloudflare, execução de testes automatizados e homologação visual desktop/mobile pela Titular ainda não comprovadas nesta etapa. Não houve alteração no Supabase, no banco, em usuários ou em registros clínicos.

---

## 24/11/2026 — VERDE: reforço de visibilidade do degradê exclusivamente no fundo das telas internas (reversível)

**Relato da Titular:** após a primeira mudança de fundo, as cores da tela de login ficaram visíveis principalmente na parte inferior; o restante da Home permaneceu visualmente branco. A Titular autorizou expressamente reforçar o degradê e conservar a possibilidade de regressão visual se não gostar do resultado.

**Restauração protegida:** antes da segunda alteração, criada a branch `backup/fundo-degrade-suave-antes-reforco-2026-11-24`, apontando para `e02986d6da72ad2896200dd3788af9aa1fee9995`, preservando o estado integral imediatamente anterior ao reforço. A branch original `backup/visual-antes-mudanca-fundo-2026-11-24` continua protegendo o visual anterior à primeira mudança. Se a Titular solicitar retorno, reverter **somente as regras de background alteradas**, sem sobrescrever outras manutenções posteriores.

**Escopo CSS mínimo, sem alteração estrutural:** em `src/styles/global.css`, alterado somente `background` do seletor `html` para distribuir melhor as mesmas cores azul, rosa, amarelo e verde com transparência moderada nas regiões central, superior e inferior; commit `1902661f8d11fde13ec6e1e02424ce027cf1793a`. Em `src/features/gestor/gestor.css`, alterado somente `background` da regra `.gestor-shell` para o mesmo padrão; commit `d3d8eb7cfee6bbe94087fa538444890d55cbf331`. Quadros brancos, superfícies, bordas, botões, cabeçalho, sidebar, login, telas clínicas, permissões, dados e funções não alterados.

**Validação:** alteração CSS versionada; aprovação visual operacional pela Titular e confirmação de publicação Cloudflare pendentes. Sem mudança de banco, contas ou pacientes; nenhum teste destrutivo.

---

## 24/11/2026 — VERDE: somente fundo interno com degradê da tela de login (reversível)

**Solicitação e autorização:** a Titular apresentou imagens da Home do Gestor e da tela de login; autorizou expressamente **somente o fundo** das telas internas, reproduzindo o degradê já existente na tela de login. Quadros, cartões, bordas, menus, cabeçalhos, formulários, tipografia, funcionalidades e dados não podem sofrer alterações por esta manutenção.

**Ponto de restauração anterior à mudança:** branch GitHub `backup/visual-antes-mudanca-fundo-2026-11-24` criada e confirmada apontando para o commit `cf219da3de83c675de8af1d37255deb3945aaa1b`. A restauração, se solicitada, deve reverter pontualmente **apenas os fundos modificados**, preservando quaisquer alterações posteriores e não desfazendo outras funcionalidades.

**Alteração pontual no GitHub `main`:** `src/styles/global.css` — substituição exclusivamente do `background` do seletor `html` pelo mesmo conjunto de gradientes `radial-gradient` azul, rosa, amarelo, verde e `linear-gradient` branco da regra original `.login-wrap` de `src/components/auth/access-gate.css`; commit `f9e58abc7f375124d06d1f693489dd1880110466`. `src/features/gestor/gestor.css` — substituição exclusivamente do `background` da regra `.gestor-shell` pelo mesmo conjunto de gradientes; commit `f2d5239dbccbb7ce2d768e48451fed94664d552e`. A tela de login e os componentes existentes não foram alterados.

**Limites e validação:** somente CSS de fundo; sem migrações, banco, contas, dados assistenciais, RLS ou APIs. Cópia do estado anterior preservada. Teste visual em desktop/mobile, confirmação de publicação Cloudflare e homologação operacional pela Titular pendentes; não declarar testado/homologado previamente.

---

## 24/11/2026 — VERDE: recuperação de senha por link, sem tela de código após envio

**Relato e autorização da Titular:** o e-mail de recuperação já enviava link válido que levava diretamente à tela de definição de nova senha. A interface, porém, apresentava indevidamente `Confirmar código de recuperação` logo após enviar o e-mail. A Titular determinou manter exclusivamente o link e concedeu **VERDE**.

**Correção pontual no GitHub `main`:** `src/features/access/access-context.tsx` passa a apresentar a tela `email-sent` existente após `resetPasswordForEmail` bem-sucedido, com orientação para abrir o link enviado e verificar a pasta de spam; `src/components/auth/AccessGate.tsx` identifica a tela como `Link de recuperação solicitado`; `tests/unit/access-flow.test.tsx` verifica a orientação pelo link, a ausência do campo de código e a navegação de retorno ao login. Commits `f31a522336b2671382abf3660508ec727e0f8e9a`, `76c7a0ace61075decc86ff7493bd7f31a12ad36f` e `5f6cfa9436c4dc9cf4e3927f73fb795688ffb915`.

**Preservação:** não alterados o `resetPasswordForEmail`, o link/token gerado pelo Supabase, o tratamento do evento `PASSWORD_RECOVERY`, a validação de sessão, a alteração de senha, o fluxo de primeiro acesso, MFA, RLS, Edge Functions, banco de dados ou contas existentes. O componente antigo de código permanece no código-fonte sem navegação a partir do envio; a única correção autorizada foi o comportamento de pós-envio.

**Validação:** commits de código e teste versionados. Execução automatizada e confirmação de publicação Cloudflare ainda não comprovadas nesta etapa; homologação operacional pela Titular pendente.

---

## 24/11/2026 — HOMOLOGADO PELA TITULAR — Encerramento administrativo Aguardando início

**Confirmação operacional expressa da Titular:** “utilizado ok testado”. A Titular informa que utilizou e testou o fluxo de **Encerramento administrativo — Aguardando início**, introduzido na manutenção imediatamente abaixo, e o aprovou.

**Status da frente: OK — TESTADO PELA TITULAR / HOMOLOGADO / ENCERRADO.** Fica preservada a regra autorizada: cadastro CAPO mantido ativo, identificação amarela de espera no cadastro, ciclo encerrado administrativamente com histórico, sem contar o paciente como ativo em acompanhamento nos indicadores e relatórios; retorno futuro por novo ciclo sem novo cadastro, respeitando as verificações canônicas. A aprovação de uso foi dada pela Titular; **não afirmar que CI, suíte automatizada ou todas as situações de borda foram testadas** sem evidência específica.

**Regra de estabilidade e continuidade:** não refatorar, reconstruir ou alterar preventivamente esta funcionalidade homologada. Somente reabrir se houver divergência concreta relatada e após novo **VERDE**, com correção pontual e cirúrgica, sem regressão nos demais tipos de encerramento, cadastro, relatórios, Oferta CAPO, agenda ou isolamento de homologação.

**Mudança nesta etapa:** apenas atualização do Documento Mestre de Auditoria. Sem alteração de código funcional, banco ou dados dos pacientes.

---

## 24/11/2026 — VERDE: encerramento administrativo de Oferta CAPO aceita, acompanhamento não iniciado (cadastro AMARELO)

**Solicitação e autorização da Titular:** pessoa que ACEITOU a Oferta CAPO e decidiu AGUARDAR antes de iniciar atendimentos deve poder ter **Encerramento Administrativo — Aguardando início** no módulo `Encerramentos / Ciclos CAPO`. **Não inativar cadastro**, preservar nº CAPO, aceite da Oferta CAPO e histórico; apresentar marcador visual **amarelo** “Aguardando início” no cadastro; separar a pessoa dos **ativos em acompanhamento** nos indicadores e relatórios. Futuro ingresso usa fluxo já existente `open_return_care_cycle_for_interface`, sem novo cadastro. VERDE explícito recebido.

**Auditoria prévia:** `patients.status` (cadastro) é separado de `patient_care_cycles.status` (ciclo). RPC `finalize_care_cycle_for_interface` já exige encerramento de especialidades, portanto não se deve adulterá-la ou confundir ausência de início com alta profissional. `patient_care_cycle_specialties` já prevê `resolution_type='operational_withdrawal'`. `get_home_patient_status_counts_for_interface` considerava como “ativo” qualquer cadastro `status='ativo'` fora da fila de resposta; `get_reports_dashboard_for_interface` também incluía todos os cadastros ativos em `patients.active_current`; ambas precisaram separação. Foi mantido o fluxo original de encerramento/alta profissional e óbito.

**Implementação no Supabase:** 
1. Migration `administrative_closure_accepted_offer_waiting_start_20261124` aplicada. Criada `patient_care_cycle_waiting_start` com ciclo, paciente, justificativa, data/hora, autor; RLS habilitada, sem grants diretos à tabela. Criadas RPCs protegidas `close_unstarted_accepted_care_cycle_for_interface(p_patient_id,p_reason)` e `get_patient_waiting_start_for_interface(p_patient_id)`; restrição adicional de vínculo para leitura por profissional aplicada por migration `restrict_waiting_start_read_to_professional_patient_link_20261124`. As RPCs exigem sessão, termo, conta e papel; a escrita é exclusiva do Gestor/Titular e Administrativo Operacional, com isolamento do contexto via `capo_assert_patient_write_context`.
2. A escrita exige paciente vivo e `patients.status='ativo'`, ciclo ativo com `opening_type='initial_acceptance'` e aceite da Oferta CAPO previamente registrado em `patient_active_searches`. BLOQUEIA quando não há ciclo, há consulta agendada/confirmada/realizada/falta ou outra não cancelada/remarcada, existe encerramento profissional para o ciclo ou especialidade já com status diferente de `ativa`. Assim, nenhuma atividade assistencial pode ser mascarada como desistência antes de iniciar. A operação é transacional: cria registro de espera, encerra especialidades ainda ativas com `operational_withdrawal` (quando existentes) e encerra o ciclo com data/hora; **não atualiza `patients.status`**. Registros anteriores continuam auditáveis.
3. Migration `exclude_waiting_start_from_active_home_and_reports_20261124` aplicada: consulta central `get_home_patient_status_counts_for_interface` acrescenta categoria `awaiting_start`, a retira de `active` e `awaiting_response`, mantém total de cadastrados; `get_reports_dashboard_for_interface` exclui pacientes com esse encerramento e sem novo ciclo aberto de `patients.active_current`, mas preserva `total_current`. Um novo ciclo aberto faz cessar a classificação amarela automaticamente. Outros indicadores assistenciais de produções históricas (consultas realizadas, etc.) não são apagados.
4. SQL reproduzido/versionado na branch `main` em `supabase/migrations/20261124234500_administrative_accepted_offer_waiting_start.sql` commit `da881b4e7909a2cacbd265078c1b95a10375cbf1`; `supabase/migrations/20261124235000_waiting_start_home_reports_separation.sql` commit `09c1c49618788e71ba3a59e49a30ff41bd6910cc`.

**Frontend GitHub main:**
- `src/features/closures/closures-integration.ts` commit `c41db5fe9ce7a1285b19017a02559b536affa7c4`: integração da RPC com tratamento de erro.
- `src/features/closures/ClosuresPage.tsx` commit `1b87ebd5b3583ba7fab017283febc35c2a97f2bb`: quadro administrativo próprio com busca real de paciente, seleção, motivo preenchido editável e botão de confirmação; mantém os encerramentos por especialidade e retorno existentes. A RPC faz todas as verificações e só conclui se for elegível.
- `src/features/patients/PatientsPage.tsx` commit `c18ca559dc51c63b4655f142274eb1b5a4d4a508`: no cadastro selecionado, consulta segura da situação `waiting_start`; troca rótulo apenas na apresentação para “Aguardando início · Cadastro mantido” quando cadastro real está ativo e ciclo de espera confirmado. CSS amarelo pontual `src/features/patients/patients-page.css` commit `e32f0424b7744abb3b494e82c8f0d30f876d7e9f`. Não modifica `patients.status`.
- `src/features/gestor/GestorHomeSnapshots.tsx` commit `09036520efe49db91d7ba80ab3c01911ece30f68`: cartão “Aguardando início” separado dos pacientes ativos/aguardando resposta, com explicação.
- Teste de contrato `tests/unit/administrative-waiting-start-closure.test.ts` commits `91326db15f20c2e8159c1b1fb6b6d4a07a32e863` e `e9d6065a42ba4ab55d991ac4b4e3fc162cca8d32`: sucesso condicionado à confirmação de banco e propagação de erro, sem manipular cadastro por frontend.

**Verificação realizada:** migrações retornaram `success`; duas novas RPCs com EXECUTE para `authenticated`, negado para `anon`; RLS da tabela habilitada; `patient_care_cycle_waiting_start` com **zero registros** imediatamente após implantação, ou seja, nenhum paciente real/homologação encerrado como parte desta manutenção. As funções de indicadores e relatório foram substituídas preservando sua lógica original fora da classificação `aguardando_inicio`.

**Pendente de homologação real:** build/Vitest/CI, publicação Cloudflare, conferência visual desktop/mobile em todos os perfis autorizados; cenário completo de oferta aceita + consulta ainda ativa deve ser bloqueado até regularização; consulta concluída deve bloquear; consulta cancelada sem atendimento deve permitir a conclusão somente se as demais condições forem satisfeitas; cadastro deve permanecer `ativo` com rótulo amarelo, pessoa excluída do contador de acompanhamento ativo e presente nos cadastrados; novo ciclo de retorno elimina a classificação de espera sem apagar o histórico. Não declarar homologado por teste que não ocorreu. Aguardar relato de teste da Titular.

---

## 24/11/2026 — ENCERRAMENTO / OK: Aniversariantes em todas as Homes — homologação pela Titular

**Confirmação expressa da Titular:** “Já foi homologada pode encerrar como ok porém nenhum aniversário no mês mas na home já mudou agora se houver divergência manutenção pontual”.

**Status:** **OK — HOMOLOGADO E ENCERRADO PELA TITULAR** quanto à apresentação da Home conforme a regra autorizada: pacientes aniversariantes apenas do dia e aniversariantes da equipe CAPO do mês, abrangendo todos os perfis cujas Homes já possuem o painel, preservando localização, permissões e isolamento. A Titular confirmou ter observado na Home a alteração de apresentação após a implementação técnica descrita na entrada anterior.

**Limite da homologação observado:** não havia aniversariantes no mês na ocasião; portanto a lista mensal preenchida, a ordenação dos integrantes e o marcador “Aniversário hoje” **não foram validados com dados reais pela Titular**. Isso não impede o encerramento autorizado, mas deve permanecer explícito para auditoria. Não registrar teste inexistente, nem alterar nascimentos ou criar registros fictícios para completar a verificação.

**Regra de continuidade:** frente **ENCERRADA**. Não realizar novas mudanças preventivas, refatoração ou reconstrução do módulo. Reabrir **exclusivamente caso apareça divergência concreta** na listagem, permissões, apresentação, rolagem, mudança de dia/mês ou comportamento de um perfil, mediante nova autorização **VERDE** e manutenção cirúrgica sem regressões.

---

## 24/11/2026 — VERDE: aniversariantes da equipe mensal e pacientes diariamente em TODAS as Homes

**Solicitação e autorização:** Titular corrigiu escopo original: o painel de aniversariantes existe nas Homes de vários perfis; a alteração não é exclusiva da Home Gestor/Titular. VERDE expresso para que os pacientes permaneçam como aniversariantes **somente do dia** (fuso America/Sao_Paulo) e a equipe CAPO exiba **todos os aniversariantes do mês corrente**, inclusive datas já passadas naquele mês e datas futuras; ordenar por dia crescente, mostrar dia/mês, nome e função e distinguir discretamente quando o aniversário da equipe é hoje. Atualização automaticamente conforme a data de referência retornada do Supabase, sem data de nascimento completa, dados fictícios ou novos painéis extensos. Preservar painel no lugar homologado e regras de permissões/isolamento.

**Fontes consultadas:** Especificação Estrutural da Interface 12/09/2026 (regras por perfil e backend como autoridade); Matriz Funcional 12/09/2026 (Home aniversariantes de pacientes e equipe), `TAREFA_05_ANIVERSARIANTES.md` (contrato seguro, escopo por papel, `patients.birth_date` e `professionals.birth_date`), este Documento Mestre (Home preservada por perfil), RPC física e componentes reais do GitHub `main`.

**Supabase:** migration `birthdays_team_month_patients_day_all_profiles_20261124` aplicada com sucesso. A RPC existente `get_birthdays_for_interface()` foi modificada cirurgicamente somente na seleção **da equipe**: remove comparação com o dia corrente, mantém comparação do mês, perfil ativo, `capo_professional_is_production` já existente, demais autorizações e isolamento do paciente; ordena `team` por dia de nascimento crescente e nome; acrescenta apenas `birthday_day` numérico (não fornece nascimento completo, idade ou telefone). A consulta **de pacientes permanece integralmente inalterada** (dia/mês atuais, vivo/ativo, visibilidade no contexto, atuação própria do profissional). Permissões existentes permanecem preservadas. Migration SQL versionada em `supabase/migrations/20261124230000_birthdays_team_month_patients_day_all_profiles.sql`, commit `c47bbf0d7303c5cc74c78d21d7cff233fa94336c`.

**Interface em todas as Homes que usam aniversariantes:** `src/lib/supabase/rpc.ts` passa a interpretar `birthday_day`, preservando o restante do contrato (commit `2f007aaec3d95cd75d8cc57d77260d4cb16bca3e`). Novo componente compartilhado `src/components/birthdays/TeamMonthlyBirthdays.tsx` (commit `7d1fd85ec9285c37aad762fe1a990ab9521bd05a`, CSS compacto com rolagem interna commits `7e2adcc31d187c7026dfa307ffccbc29bd3e2aa8` e `25186c62a1a5a1072fab584d09a082adc226f5bf`) recebe os integrantes do mês e a data do banco, mostra DD/MM, nome e função; não altera hierarquia nem posição dos painéis.
- `src/components/birthdays/BirthdayPanel.tsx` (commit `ce7d2eca2e9b9c0a40ef19544efab222777cf80c`), consumido por Coordenação, Assistência Social e demais perfis assistenciais.
- `src/features/home/HomePage.tsx` (commit `f1fa187c2acbca531727f0a0844b3576d9c660cd`): Home comum e AO.
- `src/features/gestor/GestorDashboard.tsx` (commit `f3d37f3956c7df0cf5621f0f6d1ee7651d914ccb`): Gestor/Titular; preserva WhatsApp do paciente no dia e posição dos avisos de manutenção.
- `src/features/nutrition/NutritionPage.tsx` (commit `a24e5da6a3d29fc4292f610d54fde04b0a3b705a`): Nutrição; preserva navegação da agenda para tela própria de planejamento alimentar.
- Títulos atualizados em `AssistentialPage.tsx`, `SocialPage.tsx` e `CoordinationDashboard.tsx` (commits `dd8e47b00b031c78ebf3c24adf9e05d2e4a86f0f`, `24a22d1f20fde2f743fc3ce3a457fe55c7590c21`, `9793d5cdc9af82358505610cafe8fcbfccb9dcc7`), deixando explícita a divisão Pacientes Hoje / Equipe no Mês.

**Testes versionados, mas execução ainda não confirmada:** `tests/unit/supabase-rpc.test.ts` (commit `1da9b33ffba3d42264d818d2d97653cbec487b2b`) testa novo campo; `tests/unit/team-monthly-birthdays.test.ts` (commit `b284a6a6cd4fa4d05419876918fff8a559482c5f`) testa data mensal e marcador do dia; asserções de títulos adaptadas em `App.test.tsx`, `all-routes-smoke.test.tsx`, `social-page.test.tsx` (commits `8bd9a9636a1b0276e76940565b3ba7a13df7df49`, `97cd22e9f12c09ea137c410b9adb6c3ae289ef2d`, `707282af07ea242151a02fa42fe927e0743fc9bd`).

**Verificação técnica:** RPC em produção lida novamente e verificados filtros: `patients` permanece no dia/mês; `team` somente mês, com `birthday_day` e sem birth_date integral. Função disponível para `authenticated` e vedada a `anon` (confirmação ACL). Nenhum dado real ou de manutenção foi gravado em tabelas para teste. **CI/build, publicação no Cloudflare e testes autenticados nas Homes desktop/mobile não foram confirmados nesta execução**; homologação real pendente. Conferir a troca automática de dia e mês com sessão contínua, listagens por papel e escopo de homologação, visibilidade do mês e compactação mobile sem alongar a Home.

---

## 24/11/2026 — VERDE: inverter a ordem dos painéis na Home Gestor/Titular

**Solicitação aprovada:** mostrar **Avisos de Manutenção** acima de **Atividades Recentes** na Home do Gestor/Titular, inclusive em telas móveis. Manutenção exclusivamente visual, sem alterar conteúdo, notificações, permissões ou comportamento dos painéis.

**Implementação:** em `src/features/gestor/GestorDashboard.tsx`, a ordem de renderização passou de `<AuditRecentActivities /><MaintenanceNoticeBoard />` para `<MaintenanceNoticeBoard /><AuditRecentActivities />`. Commit `6b1588b1a7a8fd5056596750ae35d0ee3c3d93c8` na branch `main`. Nenhum outro componente ou banco foi modificado.

**Verificação:** alteração localizada confirmada pelo retorno do GitHub. Publicação no Cloudflare e inspeção visual autenticada (desktop/mobile) **não confirmadas nesta execução**; aguardam homologação da Titular.

---

## 24/11/2026 — VERDE: Cancelamentos do dia na Home dos profissionais — Cancelada x Remarcada

**Aprovação da Titular:** exibir somente cancelamentos cuja **data original da consulta corresponda ao dia atual na timezone America/Sao_Paulo**, abaixo dos Faltosos, em todos os perfis profissionais que já utilizam o painel canônico. Quando o paciente não possui nova consulta vinculada, mostrar **Cancelada**, horário original, motivo e **Sem nova consulta agendada**. Quando existe um sucessor válido vinculado ao agendamento cancelado, mostrar **Remarcada**, horário e motivo originais e a **data/hora da nova consulta**. Não duplicar registros, não apagar o original e não listar cancelamentos de dias anteriores/futuros na Home de hoje. O histórico e as agendas já homologados devem permanecer intocados.

**Situação confirmada antes do VERDE:** a RPC original `get_my_daily_appointment_cancellations_for_interface(p_date)` já filtrava `attendance_status='cancelado'`, profissional autenticado/contexto e data original do dia; `ProfessionalDailyCancellations.tsx` já aparecia na Home com atualização ao foco/visibilidade e a cada 30 segundos. A lista mostrava hora, paciente, motivo, data de cancelamento e autor, mas **não diferenciava se houve remarcação vinculada**. Não houve necessidade de alterar a estrutura de agenda, pacientes, notificações ou remarcações.

**Implementação cirúrgica:** 
- Supabase: aplicada com sucesso a migration `professional_daily_cancelled_or_rescheduled_labels_20261124`, função **read-only** `public.get_my_daily_appointment_cancellations_detailed_for_interface(p_date)`. Preserva a RPC anterior intacta, checa sessão ativa, termo, papel profissional, contexto de paciente e profissional, data original, e acrescenta `cancellation_status` e `new_appointment_date`. A nova data é obtida **somente** se existir sucessor de fato vinculado por `rescheduled_from_id`, mesmo paciente e profissional, e status não cancelado/remarcado; usa `LEFT JOIN LATERAL ... LIMIT 1` para impedir duplicidade. Não cria correspondências por nomes/data aproximados nem altera qualquer registro. Permissões: EXECUTE para `authenticated`, não para `anon`; controle de perfil continua na RPC. SQL versionado na branch `main` em `supabase/migrations/20261124220000_professional_daily_cancellation_status_presentation.sql`, commit `6a480c2a0de58f350c161a0a241fff0a44990de2`.
- UI: `src/features/agenda/ProfessionalDailyCancellations.tsx`, commit `10dc17c90829e5cadb4a6ad8cfeaabd47fa4b681`, consome a leitura enriquecida, exibe rótulo **Cancelada** ou **Remarcada**, motivo e horário originais, informação da nova data quando houver e texto **Sem nova consulta agendada** sem sucessor. Não move o painel nem altera outros componentes. `src/features/agenda/professional-cancellations.css`, commit `892afb24667245b26c0211fdc5096b6e6eaa239e`: etiquetas compactas e responsivas. `tests/unit/professional-home-cancellations.test.ts`, commit `6292bc922341d065ad221dcf5eecf4d243ab6cb5`: casos acrescentados para cancelamento simples e remarcação.
- Verificação de banco: `pg_proc` confirmou RPC nova, filtro por dia/status/contexto, EXECUTE para `authenticated` e NÃO para `anon`. Nenhuma consulta real ou fictícia foi modificada/criada para teste.

**Status:** código GitHub `main` e migration Supabase implementados. **Não há comprovação de build/teste automatizado, publicação Cloudflare ou teste operacional no login profissional em desktop/mobile**; portanto requer homologação da Titular. Confirmar em `manuteste` que cada perfil profissional enxerga apenas cancelamentos da data original de hoje; um registro `cancelado` sem sucessor exibe `Cancelada`, e com sucessor comprovado exibe `Remarcada` com nova data. Validar que outros dias permanecem no histórico, sem duplicidade, e que atualização automática/foco continua.

---

## 24/11/2026 — VERDE: correção cirúrgica da remarcação por link sem pendência residual

**Relato e investigação (somente leitura antes do VERDE):** quando o paciente selecionava “Não poderei comparecer” no link, a consulta original era cancelada, mas a Home Gestor/Titular e AO mantinha “Remarcação solicitada” mesmo após agendamento de nova data. O fluxo JÁ EXISTIA e não deveria ser reconstruído. A função `respond_appointment_confirmation_link` já altera a consulta original para `cancelado` e cria `notifications.appointment_patient_reschedule`; a RPC geral `reschedule_appointment_for_interface` aceita apenas `agendado`, `confirmado` ou `faltou`, não aceita o cancelamento pelo link. A navegação `patient_link_cancellation` em `AgendaPage.tsx` abria `createAppointment` comum, gravando a consulta com `operational_origin='cancelamento_link_paciente'` sem `rescheduled_from_id` e sem concluir a notificação. A rotina de Home `get_home_link_reschedule_for_interface` já depende da notificação não resolvida e de sucessor ativo vinculado, confirmando a lacuna.

**Registros investigados antes da alteração:** seis notificações de paciente pelo link ainda pendentes, seis consultas originais canceladas e dez agendamentos gerais com origem `cancelamento_link_paciente`. Em cinco das seis pendências existem novas consultas **possivelmente relacionadas** do mesmo paciente/profissional após o aviso; isso **não prova** que cada uma corresponde a uma remarcação específica porque o vínculo histórico não foi gravado. Portanto **não encerrar automaticamente nenhum registro preexistente sem correspondência documental exata**, preservando auditoria, isolamento e dados reais. Nenhum dado real ou de `manuteste` foi modificado nesta correção.

**VERDE expresso autorizado para a ligação já planejada. Supabase:** migration `patient_link_cancellation_atomic_rebooking_resolution_20261124` aplicada com sucesso. Nova RPC `rebook_patient_link_cancellation_for_interface(p_appointment_id,p_new_professional_id,p_new_slot_start,p_new_notes)`: exige Gestor/AO autenticado, conta ativa, aceite do termo, isolamento do paciente; valida consulta original **cancelada pelo link real** (decisão `nao_comparecera`) e notificação pendente, profissional original, ciclo/especialidade preservados, data futura, ausência de sucessor ativo. Usa a rotina canônica `create_appointment_for_interface` (respeita grade/vagas), vincula `rescheduled_from_id`, grava `reschedule_origin='paciente_link'` e resolve `appointment_patient_reschedule` na **mesma transação**, somente depois de criar o novo horário. Se qualquer etapa falhar, toda a operação reverte, mantendo a pendência. A consulta anterior fica `cancelado` para histórico e seção Cancelamentos do profissional, sem excluir o registro. A RPC é executável por `authenticated` (autorização interna por papel), não por `anon`. SQL versionado em `supabase/migrations/20261124210000_patient_link_cancellation_atomic_rebooking.sql` commit `634220219f27456d4a5a06d93d5b8285bc668521`.

**Frontend:** `src/lib/supabase/rpc.ts` commit `dbc20c55b6ca280756eaf522ef8d621c6946a7af` inclui a RPC na camada permitida. `src/features/agenda/AgendaPage.tsx` commit `7bc35fcc0213205b2033ce2141057096f1f54cb9` mantém a mesma tela, mas quando a origem for `patient_link_cancellation` valida o ID original, preserva seleção de paciente/profissional e usa o método específico `rebookPatientLinkCancellation` em vez de `createAppointment` sem vínculo. Após sucesso consome o estado de navegação para evitar reabrir a pendência. Demais agendamentos, retornos, remanejamentos, faltosos, Psicologia e familiar/cuidador continuam nas RPCs anteriores. Teste unitário de contrato de RPC acrescentado em `tests/unit/supabase-rpc.test.ts` commit `2b30abce6e92bc32ee41e25390bbb03b09a406b1` (não há prova de execução).

**Verificação:** migração retornou sucesso; `pg_proc` confirma RPC presente e EXECUTE apenas para usuário autenticado, não anônimo; nenhuma remarcação fictícia foi criada e nenhum paciente alterado. Imediatamente após a mudança: **seis notificações antigas permanecem pendentes**, porque não há prova de vínculo entre os agendamentos passados. Não interpretar isso como regressão da nova operação. Não foi confirmado build/CI, deploy Cloudflare ou teste autenticado end-to-end com Gestor/AO; requer homologação operacional no `manuteste`.

**Homologação necessária:** (1) consulta do ambiente de testes recebe `nao_comparecera` pelo link, sai da agenda ativa, aparece em cancelamentos/histórico e em pedido pendente; (2) Gestor/AO abre o pedido pelo botão da Home, escolhe a nova vaga **do mesmo profissional**, confirma e verifica novo `rescheduled_from_id`, `reschedule_origin='paciente_link'`, e notificação `resolvida`; (3) Home Gestor e AO deixam de listar a pendência após recarregar, novo horário aparece na agenda do profissional, horário antigo continua apenas em cancelamentos/histórico; (4) simular falha de vaga e confirmar que notificação permanece pendente e sem novo agendamento; (5) impedir remarcação duplicada, preservar local de atendimento e mensagem manual WhatsApp; (6) revisar separadamente seis pendências preexistentes antes de decidir conciliação, sem vinculação automática por nome/data.

**Estado:** implementação técnica registrada no GitHub e banco; aguarda homologação operacional.

---

## 24/11/2026 — VERDE: anexos PDF, link externo protegido e impressão para o Setor de Transporte

**Autorização:** após a manutenção do PDF de Transporte, a Titular solicitou anexar documentos adicionais ao mesmo pedido e enviar ao setor por **um único link na mensagem manual do WhatsApp**, para destinatário sem login CAPO **visualizar, baixar ou imprimir**. Modelo visual aprovado com prazo de validade, revogação, controle de acesso e código adicional. Concedido novo **VERDE**. Escopo restrito ao Transporte; não alterar dados clínicos, prontuários, agenda, contatos institucionais nem confirmação de WhatsApp.

**Implementação técnica:**
1. **Supabase — migration aplicada `transport_secure_documents_share_and_attachments_20261124`:** criadas tabelas `public.transport_document_attachments` (PDFs vinculados a um `transport_requests.id`, autor e momento do upload) e `public.transport_document_shares` (token e PIN armazenados como hashes, expiração, revogação, tentativas, última abertura, contador de acessos, emissor). Ambas protegidas por RLS e SEM acesso direto de `anon` ou `authenticated`; operações são mediadas por funções específicas. Contatos, pacientes, agendamentos e documentos antigos não foram alterados. Até 10 anexos por pedido, PDF de no máximo 10 MB, respeitando limites do bucket privado `capo-documents`. Não permite anexar em pedido encerrado ou já encaminhado.
2. **Correção da regra de Storage:** a função existente `private.capo_storage_document_access` ainda permitia **inserção de PDF de Transporte somente para Gestor**, embora o AO já tivesse permissão em RPCs e interface. Foi ajustada cirurgicamente para aceitar **Gestor/Titular e Administrativo Operacional** na pasta do pedido, com verificação de contexto/estado, preservando a leitura e os demais módulos. O bucket continua `public=false`, apenas MIME PDF, limite 10 MB. Função foi versionada na migration.
3. **RPCs autenticadas (somente Gestor/AO com sessão, conta ativa, termo vigente e contexto correto):** `register_transport_attachment_for_interface`, `list_transport_attachments_for_interface`, `create_transport_share_for_interface` e `revoke_transport_share_for_interface`. A criação exige o PDF oficial **preparado** da solicitação; retorna token e código somente no momento da emissão, com validade de **sete dias** por padrão. Nova emissão revoga a anterior. Após anexar outro PDF, a migration adicional `transport_invalidate_share_on_attachment_change_20261124` também revoga links anteriores, evitando exposição imprevista de novos anexos.
4. **Acesso externo:** Edge Function Supabase `transport-share-access` foi implantada com status `ACTIVE` versão **2** e código versionado em `supabase/functions/transport-share-access/index.ts` (commit `6258caab96a8fda58958032dac32d41e8d8f00c6`). Exige POST originário de `https://caposistema.pages.dev` com token aleatório de 256 bits e PIN de 8 dígitos; **nunca utiliza sessão do paciente ou conta CAPO no navegador externo**. Função administrativa de verificação `open_transport_share_for_edge` é `EXECUTE` **somente pelo `service_role`**, não por `anon` ou `authenticated`. Verifica expiração, revogação, PIN, limite de tentativas (até 5 por 15 minutos), pedido e PDF preparado, e emite URLs assinadas privadas de 120 segundos para visualizar ou baixar cada arquivo. Revogar impede **novas aberturas**; URLs de arquivo já emitidas podem permanecer válidas por até 120 s. Os anexos permanecem privados e nenhuma tabela clínica é exposta publicamente.
5. **Página externa estática:** `public/transporte-documentos.html` e `public/transport-documents-client.js` em `main`, commits `29242e83457ae2d34aef27ec68726b7f9a6fb383`, `546ca25a83553f3b2423ba81203f4f8d93ed858f`, `54a44316f7677312b80f06b6d32a5ce4f4c19a3c` e `35f76efcbe28ff31c7e2fb15dbae4ae54ba9e6bd`. Link `https://caposistema.pages.dev/transporte-documentos.html#acesso=<token>`: token somente em fragmento URL (não no caminho ou consulta HTTP); usuário informa o PIN recebido **por outro canal**; listagem contém botões separados **Visualizar, Baixar PDF e Imprimir**. “Imprimir” abre o visualizador PDF, que permite imprimir pelo dispositivo/navegador; não imprime automaticamente. Não fornece acesso ao CAPO interno. Incluídos cabeçalhos da página em `public/_headers` (commit `e3e9d69d15889b9eed01f24aeef22e38840d5258`) para impedir indexação por referer, armazenamento em cache e enquadramento em iframe, e limitar scripts/conexões.
6. **Frontend administrativo:** `src/features/transport/TransportPage.tsx`, commits `07af76f52932b890e2fc700dde15fe5f15865ca9` e `33104d674f36f080d3456a1d06328bfd0b6a763f`, inclui ícone **📎 Documentos complementares** com janela compacta, visualização/seleção de PDF; **🔗 Gerar link seguro** e **Revogar link** após PDF preparado; mostra código separadamente e permite copiá-lo; o WhatsApp/e-mail institucional permanece manual, mas agora recebe o link único na mensagem predefinida. É preciso transmitir o PIN por canal diferente, de preferência ligação. Sem confirmação de recebimento, sem anexo automático, sem registrar entrega apenas por abrir WhatsApp. Métodos e whitelist de RPC em `src/lib/supabase/rpc.ts` commit `594fd332c2e4e599ed6427670ae6e2a5a34cd0c2`, estilos compactos no `transport-contacts.css` commit `19a3f5c371cb7f1b903474c3aa672e0cad2e7e51`.
7. **Versionamento SQL:** `supabase/migrations/20261124190000_transport_secure_document_sharing.sql` commit `35a041997b13ace4db99daa14cbf7cde43d4a446`; `supabase/migrations/20261124200000_transport_revoke_share_on_new_attachment.sql` commit `a1e2b9926ff88f236e2c3cc32dbecaf391244212`.
8. **Testes unitários acrescentados (não executados nesta execução):** `tests/unit/supabase-rpc.test.ts` commit `be8e3dd2bc7e3db1e91ed5cc6857d4e0d60ec3d5`.

**Verificação objetiva realizada:** migration do Supabase retornou sucesso, Edge Function retorna `ACTIVE` (v2), consultas read-only confirmaram RLS/tabelas e permissões: `open_transport_share_for_edge` permite `service_role` mas NÃO permite `anon` nem `authenticated`; funções administrativas permitem `authenticated` mas NÃO `anon`. Armazenamento `capo-documents` continua privado. Contadores após implantação: **3 solicitações já existentes, 0 anexos, 0 links**, nenhuma informação de paciente inventada ou alterada para teste; nenhum documento publicado ou WhatsApp enviado.

**PENDÊNCIAS DE HOMOLOGAÇÃO REAL:** não houve clique autenticado Gestor/AO, upload PDF de ponta a ponta, criação de link real, acesso com PIN de destinatário, visualização/download/impressão em celular, execução de build/testes e confirmação de deploy da página HTML na Cloudflare. Não declarar homologado até que a Titular teste. A página está no GitHub `main`; a Edge Function está publicada no Supabase, mas o site Cloudflare depende do pipeline de publicação. A ação “Baixar todos em ZIP” não foi implantada, pois os arquivos podem ser baixados individualmente. Os anexos suportados nesta etapa são **PDFs**, não fotos JPG/PNG. O código enviado por outro canal é intencional para proteção de dados de saúde. Rever LGPD, retenção, validação do destinatário e eventual política institucional antes do uso real.

**Homologação orientada:** (1) Gestor/AO em `manuteste` incluir PDF sem contaminar base real, consultar anexo e gerar PDF oficial já preparado; (2) gerar link, copiar o código, abrir no browser sem login em celular/desktop e verificar lista, download e impressão; (3) errar PIN 5x e confirmar bloqueio temporário; (4) revogar link e confirmar negação, gerar novo e verificar antigo inválido; (5) acrescentar anexo e verificar revogação automática de link anterior; (6) abrir WhatsApp e confirmar **somente texto preparado**, envio humano; (7) verificar estado da agenda, PDFs antigos, contatos institucionais, permissões de Assistência Social, RLS, responsividade e isolamento real/manuteste.

---

## 24/11/2026 — VERDE: complementos pontuais do PDF de Transporte, embarque, periodicidade e lembretes manuais

**Autorização:** Titular aprovou o modelo de confirmação do local de embarque independente do endereço cadastrado e acrescentou os dados obrigatórios para o PDF oficial: nome, número CAPO, CMS, endereço residencial e endereço de embarque; em pedido vinculado à consulta, nome do profissional, especialidade, data/hora (24h) e endereço oficial de atendimento; periodicidade única/semanal/quinzenal; justificativa original; identificação de quem solicitou e assinatura institucional identificando o **login real de quem gerou**. A Assistência Social solicita; Gestor/Titular e Administrativo Operacional conferem e emitem. Para periodicidades semanal e quinzenal, aviso ao Administrativo com mensagem pronta de **WhatsApp para envio manual**, sem integração, botão “Recebido”, confirmação de recebimento ou falsa declaração de mensagem enviada. **VERDE específico concedido para esta manutenção**, sem autorização para alterar outras telas, agendas ou dados reais.

**Mudanças no Supabase (migrations efetivamente aplicadas):**
- `transport_pdf_details_boarding_periodicity_20261124`: novas colunas **exclusivas da solicitação** `transport_requests.boarding_address`, `boarding_source`, `periodicity`, `pdf_details_confirmed_at`, `pdf_details_confirmed_by`, com restrições de valores. Não atualiza `patients.address`, não altera agenda. RPC restrita `set_transport_pdf_details_for_interface(request_id,boarding_source,boarding_address,periodicity)` confere sessão, termo, Gestor/AO, paciente do contexto real/homologação, status do pedido e existência de PDF; grava endereço de embarque confirmado, que pode usar o endereço do cadastro ou outro informado somente no transporte. `get_transport_context_for_interface` retorna dados para o PDF: número CAPO e CMS via paciente; endereço residencial, embarque, periodicidade, justificativa, solicitante e função, profissional, especialidade, horário e `patient_appointments.care_location` com fallback em `professionals.care_location`.
- `transport_pdf_require_boarding_confirmation_20261124`: `register_transport_pdf_for_interface` rejeita registro oficial do PDF enquanto endereço e periodicidade não tiverem sido confirmados.
- `transport_manual_recurring_reminders_20261124`: RPC de leitura administrativa `get_transport_reminder_queue_for_interface()`, calculando a próxima ocorrência de transporte semanal (+7 dias) ou quinzenal (+14 dias), ancorada na data/hora da consulta vinculada. Exibe avisos relativos a consultas hoje ou amanhã, quando a solicitação já tem PDF confirmado, a necessidade permanece ativa e o paciente está ativo. Sem integração ou resposta automática do WhatsApp; mensagem é preparada para abertura por clique e enviada manualmente.
- Complementos `transport_pdf_appointment_specialty_priority_20261124` e `transport_reminders_exclude_cancelled_appointments_20261124`: priorizar **especialidade vinculada ao próprio agendamento**, e não a primeira do profissional, e excluir consultas canceladas/remarcadas da fila de lembretes. O sistema não cria agendamentos futuros nem inventa comparecimento ou envio. O cálculo de aviso antecipado usa provisoriamente **o dia anterior e o próprio dia**; esse prazo não havia sido fixado pela Titular e deverá ser validado na homologação. Para pedido genérico sem data de consulta, não existe data-base para lembrete recorrente automático; mantém a periodicidade no pedido, mas não inventa agenda.

**Mudanças no GitHub `main`:**
- `src/features/transport/TransportPage.tsx`, commits `1fb7829fbe68d6d71d976688568febd8ff68cc58`, `367d9ffe9717d207dac97c67c404466178ab4acc`, `93e35cf115da714c6b192de2642e324689bca487`: PDF oficial passa a apresentar os campos do paciente, endereço residencial (consulta), endereço de embarque confirmado, origem/destino, dados de consulta, periodicidade, justificativa, autoria da solicitação e autoria efetiva de emissão com cargo, data e **identificação institucional do login emissor no bloco de assinatura**, sem alegar assinatura digital certificada. O endereço do atendimento é obrigatório para gerar PDF de solicitação vinculada; não substitui por um endereço presumido. Ícones discretos “Endereço de embarque” e “Periodicidade” abrem janela pequena reutilizando padrão visual CAPO; o Administrativo deve confirmar explicitamente ambos antes do PDF. O endereço alternativo pertence só ao pedido; não altera cadastro do paciente. Novo aviso na **tela de Transporte** permite clicar “Abrir lembrete no WhatsApp” com texto preenchido para envio manual e não registra recebimento; ausência de push/cron e não há ação no sininho principal nesta etapa.
- `src/lib/supabase/rpc.ts`, commits `cd92fbfdafedfe93522c11d6bf52457e4860af74`, `dbd18e7ea79e829404cfb86071e8a7f66d89bc23`: métodos e whitelist das duas novas RPCs. `src/features/transport/transport-contacts.css` commit `61f5bd826e2e1745b9f004da4ff90b6950a03d1e`: somente estilos compactos do modal e aviso. `tests/unit/supabase-rpc.test.ts` commit `1851a5f1bd61a95b6c5331ae74085bf81a5f07f6`: adicionada regressão de roteamento das novas RPCs.
- SQL versionado em `supabase/migrations/20261124160000_transport_pdf_boarding_periodicity_manual_reminders.sql`, commit `1815edfb5ab2a5e6abb7f99e10e74a6a16678d79`, e em `supabase/migrations/20261124170000_transport_pdf_specialty_and_reminder_guard.sql`, commit `b62d5b559ef32beb6e2ab36236737b24ed673ad9`. Migration consolidada contém definições finais à época; último complemento prevalece em ordem de execução.

**Verificações sem gerar dados reais:** `information_schema.columns` confirmou as cinco colunas novas; `pg_proc` confirmou EXECUTE autenticado e ausência de permissão anônima nas RPCs de conferência, lembrete, registro de PDF e contexto. GitHub confirmou os commits de código e SQL. Nenhum endereço real ou de homologação foi modificado para teste; nenhuma mensagem WhatsApp foi enviada. **Não houve execução confirmada de build/CI, teste autenticado com perfis, PDF real, impressão ou publicação na Cloudflare. Implementação técnica não significa homologação.**

**Homologação operacional necessária:** confirmar endereço original/alternativo e que `patients.address` permaneça idêntico; cada solicitação tem endereço e periodicidade próprios; consulta vinculada mostra o **local real do atendimento** e o profissional; pedido genérico omite dados de consulta; PDF oficial contém CMS, número CAPO, justificativa e autoria solicitante/emitente corretas; não permitir PDF antes de confirmação; rotina de semanal/quinzenal aparece apenas para pedidos elegíveis, abre WhatsApp sem envio automático, sem confirmar recebimento, com reaproveitamento da aba; verificar responsividade e isolamento `manuteste`. A escolha provisória de antecipação de um dia deve ser ratificada antes da homologação desse subfluxo.

---

## 24/11/2026 — VERDE: Transporte administrativo completo, solicitações genéricas e governança de cadastros

**Autorização:** após testar e aprovar a aparência do Transporte, a Titular relatou que `Salvar solicitação` não produziu o resultado esperado nem o PDF e definiu novas regras. Deverá ser permitida **mais de uma solicitação para o mesmo paciente**, sem substituir a anterior; o sistema deverá aceitar solicitação **genérica automática apenas quando o paciente não tiver agendamento ativo**, sem novo seletor de modalidade. A Assistência Social encaminha solicitação e justificativa diretamente à administração; **Gestor/Titular e Administrativo Operacional** podem ambos iniciar solicitações, receber as da Assistência Social, confirmar, gerar/confirmar PDF oficial, encaminhar aos contatos fixos e concluir com PDF de encerramento. A diferença entre os dois perfis no módulo de Transporte é o **cadastro e edição dos contatos do setor**, exclusivos do Gestor/Titular. **VERDE expresso recebido** para execução cirúrgica sem regressões.

**Regra geral de governança aprovada:** no CAPO, **Gestor/Titular** é o único responsável por cadastro/alterações de usuários, profissionais, departamentos, contatos institucionais e configurações que alterem o comportamento do sistema; também executa todas as atividades administrativas operacionais, sem invadir conduta clínica. O **Administrativo Operacional** mantém o cadastro/atualização de **pacientes** e todas as ações administrativas de rotina já autorizadas (agenda, solicitações, transporte, relatórios operacionais, etc.), mas não pode criar usuários, departamentos nem redefinir regras e configurações estruturais. Profissionais não recebem privilégios administrativos por esta mudança. Interpretar esta governança sem remover atos operacionais homologados que não sejam cadastro de usuários/departamentos ou configurações do sistema. Mudanças futuras em permissões de outros módulos requerem auditoria pontual para evitar desconstituição do que já foi homologado.

**Causa concreta do problema de salvamento/PDF:** `TransportPage.tsx` exigia `selectedAppointmentId` e a RPC `create_transport_request_for_interface` exigia agendamento existente; o banco tinha `transport_requests.appointment_id NOT NULL`. A tela impedia salvar pedidos sem agendamento. A tela e as RPCs de gerar/confirmar PDF ainda restringiam emissão ao Gestor, impedindo que o Administrativo Operacional executasse o novo fluxo. A criação e emissão são etapas distintas por segurança; **Salvar solicitação** registra a solicitação; **Confirmar solicitação → Gerar PDF → Confirmar/assinar PDF** mantém a sequência administrativa, e os documentos podem então ser encaminhados. Havia ainda problema de feedback: `loadContext` removia a mensagem de êxito logo após salvar, confundindo o operador.

**Alterações realizadas na branch `main`:**
1. **Banco Supabase (migrations aplicadas com sucesso):** `transport_operational_generic_and_social_routing_20261124` e `transport_administrative_inbox_20261124`. A coluna `transport_requests.appointment_id` admite NULL; a RPC de criação valida agendamento somente quando indicado, mantém motivo obrigatório, necessidade de transporte ativa e as verificações de permissão; permite Gestor/Titular, Administrativo Operacional e Assistência Social com capacidade/vínculo exigido, mantendo a auditoria de autoria e ID individual por solicitação. `get_transport_context_for_interface` passa a fazer LEFT JOIN com agendamento para não ocultar registros genéricos. `recognize_transport_need_for_interface`, `register_transport_pdf_for_interface`, `sign_transport_pdf_for_interface` e `manage_transport_request_for_interface` foram ajustadas **apenas** para permitir o mesmo processamento pelo AO e Gestor, preservando aceite de termo, sessão autenticada, estado válido, caminho seguro do PDF, confirmação e demais bloqueios. A RPC de criação envia notificação ao papel administrativo operacional quando a solicitação vem da Assistência Social autorizada. Nova RPC `get_transport_administrative_queue_for_interface` fornece exclusivamente a Gestor/AO, com isolamento contextual, as solicitações abertas e suas justificativas, sem expor dados a usuários anônimos. Migração de código versionada no GitHub: `supabase/migrations/20261124133000_transport_operational_generic_and_inbox.sql`, commit `0b11efea5d5693f9f234bf91c3aaf603b457ce91`.
2. **Frontend de Transporte:** `TransportPage.tsx`, commits `02437c05c85431ad93a93c2b85bdb19f5a47e73a`, `dd30b5db0333002041409df56a674b9a93fa0ebf` e `d4131fc20b0a60412beab93a1d62f678a41ce33d`. AO pode reconhecer necessidade, criar solicitação, confirmar, gerar/confirmar PDF, encaminhar e concluir, como Gestor. O formulário utiliza seleção de consulta **somente quando há agendamento ativo**; sem agendamento, exibe mensagem breve de solicitação genérica e envia `p_appointment_id:null`. Não aparece um controle de modalidade. O registro de solicitação não tenta emitir PDF antes da confirmação administrativa; feedback após `loadContext` agora permanece visível. A justificativa da Assistente Social fica acessível na nova seção **Solicitações recebidas**, com lista compacta de pendências e abertura do paciente selecionado. Assistência Social apenas salva pedido justificado; não emite PDF nem efetua encaminhamento externo. Os contatos institucionais **continuam fixos**, editáveis somente pelo Gestor, visíveis/selecionáveis pelo AO.
3. **RPC frontend:** `src/lib/supabase/rpc.ts`, commit `11426e56dc0d276e484f5f7aaa35e42b83437a0a`: inclusão do método e da whitelist da nova fila de Transporte. **Estilo:** `src/features/transport/transport-contacts.css`, commit `d55425b1b325dbe4c15c84832198a39446964441`: apenas apresentação compacta da fila, preservando janela de contatos, posição do formulário acima do cancelamento e rosa institucional já aprovados pela Titular.
4. **Regressão unitária acrescentada:** `tests/unit/supabase-rpc.test.ts` commit `f07e77d972114c98c6b2c7bbd509faf84e41cce5`: verifica roteamento na camada RPC para fila administrativa, solicitação genérica com agendamento NULL, contatos e conclusão documental. **Teste foi adicionado, não há comprovação de execução automatizada.**

**Governança global examinada sem alterações desnecessárias:** `src/app/route-access.ts` já restringia `/gestor/equipe` e `/gestor/administracao` ao papel Gestor/Titular; `/transporte` já contemplava ambos os perfis administrativos e Assistência Social autorizada. A Home do AO já tinha atalho para Transporte. As funções DB inspecionadas de cadastro/atualização de profissionais e usuários, criação de especialidades, configuração de agendas e alteração de dados institucionais exigiam Gestor/Titular, inclusive a RPC de contatos do Transporte. Portanto, esses controles já implantados foram **preservados**, sem mudança global de RLS ou revisão ampla de rotinas clínicas. A governança ora explicitada é obrigatória para novas funções e manutenção futura; a inspeção não certifica exaustivamente todas as funções existentes.

**Endurecimento do isolamento após revisão:** aplicada ainda a migration `transport_request_guard_patient_context_20261124`, que faz a criação da solicitação exigir `capo_assert_patient_write_context(p_patient_id)` e paciente ativo/não falecido, impedindo gravação cruzada entre contextos real e homologação. O SQL consolidado foi atualizado no GitHub `supabase/migrations/20261124133000_transport_operational_generic_and_inbox.sql`, commit `f7b37ee6377698f87efdd2ea7e8140a6adbedc68`. Esta proteção foi acrescentada sem modificar registros existentes.

**Verificação objetiva:** Supabase confirmou a aplicação das migrations; leitura de `information_schema` confirmou `appointment_id IS_NULLABLE=YES`; `pg_proc` confirmou as RPCs da nova fila e funções administrativas com EXECUTE para `authenticated`, sem acesso `anon`; `transport_requests` manteve três registros existentes e nenhuma solicitação genérica fictícia foi gravada. Nenhum paciente real foi modificado para testar. Conferidos os commits do GitHub `main`. Os testes de clique com sessão autenticada, anexo/envio efetivo de PDF, compilação/CI e publicação Cloudflare **não foram comprovados** nesta execução. **Não classificar como homologado até teste da Titular.**

**Homologação obrigatória por perfil:** (i) Gestor cria/edita contato fixo, AO somente consulta e marca destinatários; (ii) AO salva vários pedidos com agendamento para o mesmo paciente sem duplicar/alterar o agendamento; (iii) AO salva genérico quando não há agenda e visualiza no histórico; (iv) Assistente Social salva justificativa, vê confirmação sem gerar PDF e Gestor/AO veem pedido na fila; (v) Administrativo confirma, gera, confirma PDF, baixa e anexa manualmente no WhatsApp ou e-mail com mensagem predefinida, registra encaminhamento e conclui com PDF de encerramento; (vi) rever isolamentos de `manuteste`, cancelamentos, PDF, responsividade mobile e ausência de regressões nas telas já aprovadas. Registrar homologação operacional separadamente, quando a Titular declarar os testes aprovados.

---

## 24/11/2026 — VERDE: manutenção cirúrgica do fluxo de Transporte — contatos, encaminhamento e encerramento

**Solicitação e autorização:** Titular pediu corrigir em conjunto (1) bloqueio de comunicação no encerramento com PDF; (2) ícone discreto de contatos do Setor de Transportes, com WhatsApp principal, telefone secundário do responsável e e-mail institucional, seleção de um, dois ou os três destinatários e abertura do WhatsApp com mensagem predefinida ao preparar envio do PDF e demais documentações; (3) posicionamento do formulário de solicitação acima do cancelamento, com as cores institucionais e detalhes no rosa da logomarca do CAPO. Concedeu **VERDE**, exigindo manutenção cirúrgica sem regressões.

**Estado anterior confirmado:** `TransportPage.tsx` já possuía reconhecimento da necessidade, vínculo de consulta, solicitação, confirmação, geração/assinatura de PDF, registro de encaminhamento, conclusão e PDF de encerramento; a função backend de conclusão existia com permissão `EXECUTE` para `authenticated`, mas `createSupabaseTransport` não liberava `complete_transport_request_with_closure_pdf_for_interface`, interrompendo a conclusão pela interface. Cancelamento da necessidade aparecia acima do formulário de solicitação. Não existia cadastro de contatos persistente nesse módulo.

**Correções na branch `main`:**
1. `src/lib/supabase/rpc.ts`, commit `1c0cc99b2990d8ac9cd3c9de0cf923b4684e98a8`: inclui explicitamente `complete_transport_request_with_closure_pdf_for_interface` no transporte permitido e acrescenta métodos de leitura/gravação de contatos com operações `get_transport_sector_contacts_for_interface` e `set_transport_sector_contacts_for_interface`. Não altera contratos de confirmação, geração, assinatura nem encerramento.
2. **Supabase, migrations aplicadas com sucesso:** `transport_sector_contacts_safe` e `transport_contacts_isolate_homologation`. Criada `public.transport_sector_contacts` com campos WhatsApp principal, telefone responsável, e-mail, alteração por conta e carimbo temporal; `slot=1` para produção, `slot=2` para conta de homologação, sem misturar os contatos. RLS habilitada, sem concessões diretas a `anon`/`authenticated` para a tabela; funções RPC `SECURITY DEFINER` fazem checagem de sessão, conta ativa, aceite do termo e perfil, concedidas apenas a `authenticated`. Leitura autorizada ao Gestor/Titular, AO e profissional autorizado; gravação somente a perfil Gestor/Titular. A gravação normaliza DDD/números e valida e-mail. Não foram preenchidos dados institucionais fictícios.
3. `src/features/transport/TransportPage.tsx`: commits `43a723f55b7a292448b2319b12ccca39317f9dd8`, `da0ffbb6114e83c6ed246b9529be59a87a566b8a`, `227e459cd4510de8f4314710108d9c01693aceb8` e `06a52afecb8060c76322a71284d92e94daddc024`. Acrescentado botão/ícone `Contatos do Transporte`, com janela própria pequena e fechamento; campos institucionais salvos por RPC, seleção independente por checkbox de até três destinatários e botões para abrir cada canal. Ao clicar em WhatsApp, abre mensagem preestabelecida com saudação contextual, nome do paciente e data do atendimento vinculados à solicitação, em aba nomeada para reutilização, e assinatura pelo usuário. O e-mail abre mensagem predefinida. Abas de destinatários são acionadas **mediante clique**, não há disparo automático sem revisão. O PDF assinado já existente pode ser baixado pelo comando original, e o usuário precisa anexá-lo manualmente com os demais documentos necessários ao WhatsApp ou e-mail. O CAPO não afirma entrega automática nem anexo automatizado. Confirmação administrativa de encaminhamento permanece ação distinta após o envio efetivo.
4. A mesma página foi reorganizada: seção de **preenchimento da solicitação acima da seção de cancelamento da necessidade**, mantendo reconhecimento prévio da necessidade e ações já existentes, inclusive justificativa, permissões e histórico.
5. `src/features/transport/transport-contacts.css`: commits `3c85fd988f52428c0e7e023b999b310b85d3adb3` e `7e1a6fe48c3651d10b36b2a577eb14b99db6d773`. Padrão visual existente com rosa institucional `#e90059` em detalhes, botão compacto e janela sobreposta que **não alonga a página**.
6. `tests/unit/supabase-rpc.test.ts`, commit `7d4bb905519978b3c951086ce27a94bd891bb554`: teste acrescentado para o encaminhamento das duas operações de contato e da conclusão documental na whitelist da camada de RPC.

**Verificações realizadas:** GitHub confirmou gravação dos commits; Supabase confirmou sucesso das duas migrations. Leitura do `pg_proc` confirmou RPCs existentes, `EXECUTE` para `authenticated` e não para `anon`. Consulta mostrou RLS habilitada na nova tabela, funções de contato com divisão produção/homologação e **zero registros novos**, sem números fictícios. Leitura de `transport_requests` indicou uma solicitação `solicitado`, duas `cancelado`, nenhuma `confirmado`, `realizado` ou encaminhada aguardando encerramento; nenhum pedido real foi alterado para teste. GitHub não exibiu execução de teste/CI associada aos commits consultados.

**Homologação operacional ainda exigida (não declarar testado sem execução):** na conta Gestor/Titular, abrir janela de Contatos, cadastrar dados institucionais corretos e comprovar persistência após recarregar; na conta AO, comprovar leitura, seleção e ausência de edição; no `manuteste`, comprovar contatos separados; selecionar um, dois e três destinos, testar abertura e mensagem do WhatsApp para cada número e e-mail, conferir anexo manual do PDF e demais documentos, registrar encaminhamento **apenas após envio efetivo**; confirmar solicitação, gerar/assinar PDF e concluir com PDF de encerramento, visualizar/baixar; verificar cancelamento abaixo do formulário, aparência em desktop/mobile, sem regressão na agenda, permissões e outras rotinas. **Não utilizar paciente real como ensaio** nem disparar mensagens para números reais de teste.

**Status:** IMPLEMENTAÇÃO E MIGRATIONS VERSIONADAS/APLICADAS; TESTES AUTOMATIZADOS, PUBLICAÇÃO CLOUDFLARE E HOMOLOGAÇÃO POR CLIQUE NA INTERFACE NÃO COMPROVADOS. Não declarar sistema homologado antes da aprovação da Titular.

---

## RESULTADO DO TESTE DOCUMENTAL 24/11/2026 — NÃO APARECEU

**Relato da Titular:** após a anotação de teste no Documento Mestre (commit `b06adddb399f367c0101a6b76d59289ca1e8fc86`), foi solicitado observar se o CAPO emitia indevidamente a mensagem de atualização. A Titular respondeu: **"não apareceu"**.

**Resultado observado:** APROVADO NO CENÁRIO TESTADO. A alteração exclusivamente documental não produziu novo aviso visível de atualização na sessão observada pela Titular, conforme o comportamento esperado.

**Escopo da homologação:** somente ausência do aviso indevido após edição documental. O teste não valida a exibição, os 5 segundos de minimização, a reabertura, a recarga segura nem outras sessões/dispositivos.

**Estado:** TESTE DOCUMENTAL ENCERRADO; NÃO REQUER CORREÇÃO. Registro documental sem modificação de frontend, banco ou dados assistenciais.

---

## TESTE DOCUMENTAL CONTROLADO 24/11/2026 — AVISO DE ATUALIZAÇÃO

**Finalidade:** verificar, no comportamento real do CAPO publicado, se uma anotação feita **somente neste Documento Mestre de Auditoria** dispara indevidamente a mensagem `Nova versão do CAPO disponível`.

**Ação de teste autorizada pela Titular:** adicionar este registro documental na branch `main`, sem alterar qualquer arquivo funcional (`src/`, `public/`, `vite.config.ts`, dependências ou gerador de versão), sem mudar configuração de atualização e sem modificar dados de pacientes ou Supabase.

**Resultado esperado:** após o commit exclusivamente documental, o sistema CAPO **não deve** apresentar um novo aviso de atualização por causa desta anotação; seu identificador de versão do frontend deve permanecer idêntico para os mesmos arquivos funcionais. A navegação e os atendimentos devem continuar normalmente. Se aparecer aviso, investigar primeiro se existia uma versão funcional pendente de atualização e qual versão o navegador já utilizava, antes de atribuir a causa a este registro.

**Procedimento de verificação da Titular:** manter uma sessão previamente atualizada do CAPO e observar o aviso; conferir também após voltar à aba, pois a verificação ocorre periodicamente (aproximadamente a cada 60 segundos). Não forçar atualização durante atendimento ou preenchimento de formulários. Informar se apareceu nova mensagem e em que circunstâncias.

**Situação:** TESTE DOCUMENTAL REGISTRADO — AGUARDANDO OBSERVAÇÃO E RESULTADO DA TITULAR. Este registro não representa teste visual realizado pelo assistente e não constitui homologação antecipada.

---

## 24/11/2026 — HOMOLOGAÇÃO DA TITULAR — botão Início no cabeçalho do Gestor/Titular

**Confirmação expressa:** após a correção de localização do botão `⌂ Início`, imediatamente antes de `Mensagens` no cabeçalho do login individual da Gestor/Titular Daniele, a Titular informou **"testado ok"**. Considerar a manutenção pontual aprovada operacionalmente no cenário verificado pela Titular.

**Decisão:** manutenção do posicionamento do botão **ENCERRADA/HOMOLOGADA PELA TITULAR**. Preservar a restrição individual, navegação em um clique e os demais comandos do cabeçalho. Não modificar preventivamente; reabrir apenas para ocorrência concreta com novo VERDE.

**Limites:** a confirmação de uso não equivale à execução de suíte automatizada, teste em todos os dispositivos ou demais perfis. Nenhum código funcional, dado real ou objeto do Supabase alterado neste registro documental.

---

## 24/11/2026 — Ajuste de localização do botão Início da Titular, conforme imagem

**Esclarecimento da Titular:** o botão `Início` solicitado anteriormente não pertence ao aviso flutuante de atualização; deve aparecer no cabeçalho fixo da Home/áreas do Gestor/Titular, imediatamente **antes de Mensagens**, conforme imagem encaminhada. Mantido o VERDE concedido para esse botão e a restrição individual da conta `daniele`.

**Correção na `main`:**
- `src/features/gestor/GestorShell.tsx` commit `83952389dff33a0ce11bab17e9f541ed94ba4b7c`: botão `⌂ Início` inserido imediatamente antes de `CommunicationUnreadLink` no `gestor-header-actions`, em um clique navega por React Router para `/`. Exibição restrita ao ID da conta individual oficial da Titular e contexto principal `administrador`; não é habilitado para qualquer Gestor de forma genérica.
- `src/components/system/CapoAutomaticVersionUpdate.tsx` commit `209f6adb337dca815e5ec5463612aacd405ed438` e `src/components/system/automatic-version-update.css` commit `49164a79ee875235c7a8e5898b1ac498c3619105`: removem o botão anteriormente colocado no aviso flutuante e seu CSS exclusivo. Preservadas minimização automática em 5 segundos, reabertura, opção `Atualizar agora`, detecção por versão e proteção de dados e atendimentos.

**Limites:** sem mudança no Supabase, em agendas, registros ou perfis. Comandos anteriores de Mensagens, Voltar, Avisos e Perfil não foram alterados. Commits confirmados no GitHub; não há prova de publicação Cloudflare, build/testes automatizados ou homologação de navegador. Conferir na conta real da Titular a posição imediatamente antes de Mensagens e navegação de um clique; confirmar ausência em outros logins e comportamento mobile.

**Estado:** CORREÇÃO DE POSIÇÃO VERSIONADA NA MAIN; PUBLICAÇÃO E HOMOLOGAÇÃO PENDENTES.

---

## 24/11/2026 — VERDE — botão Início exclusivo da Titular no aviso de atualização

**Problema e pedido:** no aviso de nova versão do CAPO, Titular solicitou botão `Início` ao lado da mensagem, com retorno à Home em um clique, apenas em sua conta de Gestor/Titular; confirmou VERDE para a implementação no aviso expandido e minimizado.

**Implementação pontual na `main`:**
- `src/components/system/CapoAutomaticVersionUpdate.tsx` — commit `b8285369c716e6d6655e3684327f36186aa1fed0`: usa o contexto autenticado existente (`useAccessFlow`) para exibir o botão exclusivamente quando `user_account_id` corresponde à conta oficial `daniele` e `primary_context.code === 'administrador'`. A verificação é individual, não por simples nome ou papel genérico. Botão `⌂ Início` aparece ao lado do título expandido e da faixa minimizada; usa navegação React Router `router.navigate('/')`, sem obrigar recarga da página. Nenhum novo privilégio é concedido.
- `src/components/system/automatic-version-update.css` — commit `2194a2aedd1f1c940088c241f4621d83291beb37`: alinhamento compacto/responsivo dos botões em desktop, tablet e celular.

**Proteções mantidas:** detecção da versão, minimização aos cinco segundos, botão `Atualizar agora`, confirmação em caso de edição e recarga automática somente na Home segura após 120 segundos de ociosidade, com demais critérios originais. O botão Início é navegação comum, não atualização forçada. Nenhuma alteração em banco Supabase, sessões, permissões, dados reais, homologação, agenda, atendimento ou formulários.

**Validação e limites:** commits de código confirmados no GitHub. Não foi executado build, Vitest, CI, deploy Cloudflare ou teste autenticado em conta da Titular e outros perfis. Conferir na interface o retorno à Home em um clique e ausência do botão nos demais logins; manter o aviso minimizado sem obstruir funções.

**Estado:** VERSIONADO NA MAIN; PUBLICAÇÃO E HOMOLOGAÇÃO OPERACIONAL PENDENTES DE CONFIRMAÇÃO.

---

## 24/11/2026 — VERDE: minimização automática do aviso de atualização da versão

**Relato e autorização:** aviso `Nova versão do CAPO disponível` permanecia expandido no canto inferior e dificultava a utilização de comandos na tela. Após leitura do histórico de 19/11/2026, Titular concedeu VERDE para a correção exclusivamente visual: exibir aviso normalmente, minimizar em cinco segundos, permitir reabrir e manter `Atualizar agora`.

**Correção cirúrgica na branch `main`:**
- `src/components/system/CapoAutomaticVersionUpdate.tsx`, commit `4614e5c20fa68f0bae83123cd06eb75ffada5bac`: estado local `noticeMinimized`; temporizador de cinco segundos iniciado quando se detecta nova versão e cancelado na desmontagem; cartão passa a faixa compacta `Atualização disponível`, com botão de reabertura; ação manual `Minimizar`. O comando `Atualizar agora` continua disponível ao reabrir e mantém a confirmação prévia quando houve edição.
- `src/components/system/automatic-version-update.css`, commit `8b355a7cea1f63e3c52069a06c109487276b3a2b`: faixa discreta e responsiva no canto inferior direito, ocupando apenas a área do próprio aviso; apresentação compacta também no celular.

**Invariantes preservadas:** nenhuma mudança na detecção por hash, intervalo de verificação de 60 segundos, recarga automática exclusiva da Home após 120 segundos sem atividade e demais condições de segurança (visibilidade, conexão, ausência de edição, editor e modal). Nenhuma alteração em Supabase, SQL, autenticação, agenda, atendimento, formulários, dados reais, perfis ou isolamento `manuteste`. A minimização não altera se e quando ocorrerá recarga segura.

**Validação e limites:** commits retornaram sucesso no GitHub. Não foi comprovada execução de build, Vitest, CI, deploy Cloudflare ou teste autenticado em desktop/tablet/celular. Homologar detectando uma versão realmente nova; verificar cartão por cinco segundos, faixa compacta, reabertura e botão de atualização, inexistência de obstrução de cliques e manutenção da proteção contra perda de dados. Não afirmar homologação sem confirmação da Titular.

**Estado:** CORREÇÃO VERSIONADA NA `main` / HOMOLOGAÇÃO OPERACIONAL E PUBLICAÇÃO PENDENTES DE CONFIRMAÇÃO.

---


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


---

## 19/11/2026 — VERDE: encaminhamento interprofissional exclusivamente para agendamento administrativo

**Decisão da Titular:** profissional encaminha paciente para outra especialidade; somente Gestor/Titular e Administrativo Operacional recebem e processam a pendência. Ao aprovar e atribuir um profissional, deve abrir a Agenda Geral com paciente, especialidade e destino preenchidos; a especialidade de destino só recebe o paciente após o agendamento real, e não uma tarefa de encaminhamento. Preservar histórico, notificações cabíveis ao solicitante, filas e componentes homologados.

**Evidência antes da manutenção:** encaminhamento de Ilton para José Luiz dos Reis, destinado a Juliana Teixeira Rios Camargo, criado às 13h25, aprovado às 13h34 e iniciado às 13h35 pelo Gestor em 19/11; sem consulta criada para o par paciente/profissional. Uma notificação indevida `referral_assigned` havia sido emitida à destinatária. Registro real não foi excluído, refeito, alterado ou agendado automaticamente.

**Banco aplicado:** migração `supabase/migrations/20261119200000_interprofessional_referral_admin_scheduling.sql` no GitHub, commit `447b48a31e90cc270aef3879432e5a9e057a6b35`, aplicada com sucesso no projeto `fftebavlhbfcrvrtnrld`. A leitura de encaminhamentos restringe a visão recebida à gestão administrativa; o destinatário não recebe nem processa a tarefa apenas por estar atribuído. O processamento de agendamento deixa de notificar a destinatária na aprovação; mantém feedback de aprovação ao solicitante. A conclusão genérica é vedada e a RPC `complete_interprofessional_referral_scheduling_for_interface(uuid,uuid)` exige agendamento efetivamente persistido e correspondente ao paciente, profissional, especialidade, ciclo e aprovação; registra vínculo `scheduled_appointment_id`, evento e aviso ao solicitante. RPC concedida somente a `authenticated`, protegida por checagem interna Gestor/AO; execução `anon` negada. As notificações anteriores permanecem para auditoria; não serão apagadas.

**Frontend versionado:** `src/features/referrals/ReferralsPage.tsx` commit `1f671c28`: aprovou/atribuiu → navegação direta à Agenda Geral, com paciente, especialidade, profissional e ID do encaminhamento; gestor/AO têm atalho para encaminhamentos já aprovados/em andamento; operações de destinatário removidas; profissional solicitante consulta os próprios enviados. `src/lib/supabase/rpc.ts` commit `fe77cb8f`: contrato tipado de vínculo de agendamento; `src/features/agenda/AgendaPage.tsx` commit `de6ec8a2`: pré-preenchimento e conclusão do encaminhamento somente após criação de consulta confirmada pela RPC; erro de vínculo informado sem afirmar que consulta não foi gravada. `tests/unit/referrals-page.test.tsx` commit `9769c340`: regressão de visões iniciais por perfil.

**Verificações:** migração retornou `success=true`; função de conclusão existe, com execução para authenticated e não para anon; código e testes versionados. **Não foram executados** build, Vitest, teste em navegador autenticado e confirmação do deploy Cloudflare. **Pendente de homologação:** validar em Gestor/AO que a aprovação abre agenda, que a marcação confirma e conclui o encaminhamento, que a notificação pós-agendamento retorna ao solicitante, que a destinatária não recebe pendência prévia e que, sem vaga, o fluxo operacional de fila permanece acessível. Não encerrar homologação sem testes.


---

## 19/11/2026 — VERDE: feedback ao solicitante após agendamento de encaminhamento

**Ocorrência real:** encaminhamento `313de7f1-e4c6-4f51-8122-9115c5fc7433` de Ilton para José Luiz dos Reis, destinado a Juliana Teixeira Rios Camargo, permaneceu `in_progress` apesar da consulta `4360b6c3-3fb7-4e4c-b38f-1b7056f2c08f` criada às 13h48 de 19/11/2026, para 23/11 às 16h30. O campo `operational_origin` dessa consulta tinha valor `ENCAMINHAMENTO ILTON`, e não estava vinculado ao encaminhamento; inexistia `referral_scheduled`.

**VERDE expresso:** corrigir vínculo real, emitir retorno ao Ilton e prevenir reincidência, preservando agendamento e auditoria.

**Implementação no GitHub `main` e Supabase:** migração `supabase/migrations/20261119202000_fix_referral_scheduled_feedback.sql`, commit `fcc8f26821f4ec19427f73acef99652db97431da`, aplicada com `success=true`. Trigger `trg_capo_complete_referral_on_appointment_insert` em INSERT de `patient_appointments` captura somente consultas novas com origem operacional de encaminhamento e correspondência **única**, encaminhamento aprovado/em andamento, mesmo paciente, profissional, especialidade e ciclo, e aprovação anterior à consulta. Se não houver correspondência única, não modifica encaminhamento; se houver, vincula, conclui, registra evento e notifica o solicitante sem duplicar aviso preexistente. A RPC explícita anterior continua disponível e idempotente. A migração também regularizou somente o par já auditado, validando todos os campos e sem recriar consulta.

**Verificação após implantação:** encaminhamento aparece `completed`, `scheduled_appointment_id=4360b6c3-3fb7-4e4c-b38f-1b7056f2c08f`; evento `completed` registrado às 13h54 de 19/11/2026 com `actor_role='sistema'`; notificação individual `referral_scheduled` ID `3530659f-f964-4ed1-aaf6-508bb9984b9b` enviada ao auth user do Ilton às 13h54, ainda sem leitura registrada. Trigger físico confirmado no Supabase. **Não foram realizados** testes de interface autenticada nem teste de criação de nova consulta após a migração; homologação preventiva do próximo caso permanece pendente. 


---

## 19/11/2026 — VERDE: aviso de atualização apenas após alteração real do frontend

**Solicitação e VERDE da Titular:** manter o aviso de atualização e a proteção contra interrupções, porém não notificar usuários por mera auditoria, consulta, relatório, alteração de Documento Mestre ou manutenção exclusivamente no banco. Atualização deve acontecer somente quando houver mudança nos arquivos utilizados pelo frontend CAPO. Não reconstruir ou alterar demais funcionalidades já homologadas.

**Diagnóstico:** `vite.config.ts` usava `Date.now()` para gerar `__CAPO_BUILD_VERSION__` e `/capo-version.json`. Assim qualquer compilação, inclusive decorrente de commit apenas documental, gerava identificador diferente e exibia `Nova versão do CAPO disponível`. O componente consulta a cada 60s e a recarga automática é condicionada à Home, inatividade de 120s, visibilidade, conexão e ausência de edição/diálogo; essa proteção permaneceu inalterada.

**Mudança controlada na branch main:** `scripts/capo-build-version.ts`, commits `8694f167` e `666e0838`, introduz hash SHA-256 determinístico truncado em 24 caracteres hexadecimais, calculado exclusivamente a partir de `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts` e do próprio gerador. Migrations, relatórios, auditorias, manuais e testes não entram no hash. `vite.config.ts`, commit `83f27c86`, deixa de usar timestamp e publica hash idêntico no bundle e no manifesto; builds sem mudança nos arquivos funcionais preservam a mesma versão, mesmo que o Cloudflare realize nova publicação. `src/components/system/CapoAutomaticVersionUpdate.tsx`, commit `3629ae54`, aceita o novo formato hexadecimal e o antigo timestamp numérico (compatibilidade da migração), preservando intervalos, proteção contra perda de dados, botão e mensagens. `tests/unit/capo-build-version.test.ts`, commit `38da3d7c`, adiciona regressões para estabilidade do hash, irrelevância de documentos/migrations/testes, e detecção de alteração real de JS/CSS/recursos públicos.

**Limites e verificação:** componente ainda usa atualização de página inteira, não hot-reload parcial em produção. Alteração exclusivamente no Supabase continua aplicável às próximas consultas e não exige download do bundle. Um primeiro aviso será normal na transição do identificador numérico antigo para o novo identificador por hash. O código foi relido na branch main; **não há comprovação de execução de testes, build, implantação Cloudflare nem inspeção dos gatilhos específicos do projeto Cloudflare Pages**. A garantia implantada é sobre o aviso no navegador: publicação documental não altera o hash nem solicita recarga. Verificar em homologação a sequência: publicação documental → sem aviso, commit de código → aviso, formulário em andamento → sem recarga automática.


---

## 19/11/2026 — VERDE: regularização de Angelo Aparecido Piva (CAPO 74) e proteção contra reagendamento duplicado

**Relato e autorização expressa:** Titular informou ter desmarcado em 18/11 a consulta de 19/11 com Ilton e reagendado Ângelo para 25/11. O paciente permaneceu na agenda de 19/11 e o profissional marcou Falta; Titular requisitou regularização, prevenção de recorrência e retirada específica da fila ativa de Faltosos.

**Evidências anteriores, sem inferências além do registro:** consulta antiga `dc4c5712-615e-4e83-bf97-358e033eb131` (19/11 11h30 BRT) estava `faltou` desde 13h35; consulta nova `3563a474-734d-4faf-b4b8-d5e79ce0fc54` (25/11 10h30 BRT) foi criada em 18/11 às 16h02 como retorno administrativo independente, sem `rescheduled_from_id`. Auditoria não apresentava UPDATE de cancelamento/remarcação anterior; somente criação da nova. A ocorrência `patient_no_show_followups` `8c675b38-eb9b-4916-9470-326d78594f51` estava `em_contato` com registro administrativo explícito de que paciente já havia sido reagendado.

**Regularização cirúrgica aplicada e consultada após gravação:** ocorrência de Faltosos alterada para `encerrado`, vinculada ao agendamento válido de 25/11 e com nota administrativa de correção; contato e histórico de falta originais foram preservados. Consulta antiga alterada de `faltou` para `remarcado`, com anotação explicativa e trilha de UPDATE. Consulta de 25/11 permaneceu `agendado` e recebeu `rescheduled_from_id` apontando para a antiga, `reschedule_origin='manual'` e justificativa administrativa. Paciente, profissional, ciclo, especialidade, cronologia e status foram validados antes das mutações. **Nenhum agendamento foi recriado ou excluído.** No banco, conferidos os dois status, os IDs vinculados, fila encerrada e transições antigas/novas na auditoria.

**Proteção preventiva no frontend `main`:** `src/features/agenda/AgendaPage.tsx` commits `da6ea09c42de97d5b286aa8ab17668e647e7c180` e `04dc831bd250590bf33baccbb32ed85537725dbd`. Antes de gravar novo agendamento administrativo, consulta o histórico autorizado do paciente; quando existe outro agendamento futuro ativo com o mesmo profissional, exige confirmação explícita de que a nova consulta é **adicional** e que as duas devem permanecer; caso substitua a anterior, instrui usar a rotina homologada de **Remarcação**, que torna a antiga `remarcado` e vincula as duas na transação. Sem consulta do histórico ou profissional validado, impede gravação; verificação é refeita no clique. O usuário pode manter dois horários legítimos (ex.: dois slots consecutivos), mas não por aceitação silenciosa. Não foi introduzido cancelamento automático de consultas distintas por apenas coincidirem paciente/profissional, preservando retornos recorrentes legítimos.

**Estado de verificação:** ajustes dos registros de produção confirmados com SELECT e audit_logs. Proteção da interface escrita no GitHub, mas **sem evidência ainda de build, Vitest, publicação Cloudflare ou teste autenticado e homologação da Titular**. Não declarar proteção totalmente homologada até conferir alerta em novo agendamento com consulta ativa, remarcação normal e possibilidade consciente de consulta adicional.


---

## 19/11/2026 — VERDE: somente rótulo do botão de Faltosos (Gestor/AO)

**Autorização:** substituir exclusivamente o texto visível do botão `Solicitar remarcação` por `Agendar` na tela administrativa de Faltosos. A Titular confirmou expressamente que o fluxo atual deve ser mantido, sem introduzir um fluxo novo para Assistência Social.

**Execução:** `src/features/no-shows/NoShowsPage.tsx`, branch `main`, commit `09246c5d812fde025c10ae3736812ef94556c9b6`: alterada uma única ocorrência do texto do botão. Não houve alteração de evento `onClick`, chamada de RPC `requestNoShowRescheduling`, permissões, banco, agendamento, filas, estados ou componentes de outros perfis.

**Comportamento preservado e ressalva funcional:** o botão agora é rotulado `Agendar`, mas continua executando a solicitação administrativa de remarcação e encaminhando-a à fila, **sem abrir a Agenda Geral diretamente**. Essa correspondência entre texto e ação foi informada à Titular antes da autorização. Nenhum teste em navegador, build ou publicação Cloudflare foi confirmado nesta etapa.


---

## 19/11/2026 — VERDE: Faltosos → Agenda do profissional → confirmação → notificação individual

**Decisão da Titular:** botão `Agendar` da fila administrativa de Faltosos deve abrir diretamente a agenda do profissional da consulta em que houve falta para remarcação; apenas depois que a nova consulta for concluída, notificar o profissional. Não criar nova consulta independente, não encerrar fila antes da confirmação e não envolver Assistência Social nessa mudança.

**Frontend:** `src/features/no-shows/NoShowsPage.tsx`, commit `87d62e57fa2d54bfacf62b52e092abfa866bb8b1`: `Agendar` vira `Link` para `/agenda` com `origin='no_show_reschedule'`, patientId, patientName, professionalId e appointmentId originais, tanto com solicitação administrativa prévia quanto sem ela; ocorrência encerrada apresenta apenas texto de histórico. Removido o acionamento da RPC de solicitação intermediária desse formulário. `src/features/agenda/AgendaPage.tsx`, commit `9483fd93c2b88ede9889c23d241507cb3eb4c4f0`: receber esses dados abre a tela oficial em modo `remarcacao`, pré-seleciona consulta e profissional, mantém a origem `faltoso`, trava alteração do tipo/agendamento original e verifica correspondência paciente/profissional antes de confirmar; usa o agendamento/remarcação, a comunicação ao paciente e as regras de vaga já existentes.

**Banco:** migração `supabase/migrations/20261119220000_notify_professional_after_no_show_rescheduling.sql` commit `f6e7b5b233efcd223c54586f4812e30e56e1703d`, aplicada com sucesso. Amplia a função `close_no_show_followup_after_reschedule()` existente sem modificar seu gatilho: após vínculo por `rescheduled_from_id` e `reschedule_origin='faltoso'`, encerra a ocorrência, registra o evento no timeline, procura a conta ativa do profissional de destino e envia **notificação individual** `no_show_rescheduled` com data/hora brasileiras e referência à nova consulta, evitando duplicidade. Notificação e encerramento ocorrem na transação de remarcação, não no clique do botão. Migração `supabase/migrations/20261119221000_enforce_no_show_same_professional.sql` commit `5325416cbe13676893a643c06f5c154a8096e103`, aplicada com sucesso, restringe a origem `faltoso` na RPC `reschedule_appointment_for_interface` a profissional idêntico ao original e exige ocorrência de Faltosos ainda ativa; não interfere nas outras origens de remarcação.

**Regressão versionada:** `tests/unit/no-shows-page.test.tsx` commit `86f9ef79f772043733e469112ea14d349cf0179e`, com cobertura de Link `Agendar` e ausência de criação de solicitação ao clicar; testes existentes recebem contexto de navegação.

**Verificação:** migrações Supabase retornaram `success=true`; existência do gatilho real e cláusulas de encerramento/notificação verificadas no banco; ocorrência já regularizada de Angelo Aparecido Piva segue `encerrado`, com consulta anterior `remarcado` e novo retorno de 25/11 às 10h30 mantido. Nenhum agendamento real de teste foi feito; **a execução de build, Vitest, navegação autenticada, entrega do aviso e publicação Cloudflare permanece pendente de homologação**. Não alterar dados de pacientes reais para teste.


---

## 19/11/2026 — VERDE: quatro abas funcionais no módulo Faltosos

**Autorização:** Titular identificou na imagem botões "Acompanhar faltas", "Contatos", "Motivo / providência" e "Remanejamento / Remarcação" aparentemente estáticos, solicitou consulta ao Documento Estrutural e Documento Base e autorizou com `VERDE` a correção pontual para cada aba exibir sua função. Referências: `CAPO_ESPECIFICACAO_FUNCIONAL_ESTRUTURAL_DA_INTERFACE_2026-09-12.md`, `CAPO_ESPECIFICACAO_ESTRUTURAL_DA_INTERFACE_2026-09-12.md` e `CAPO_MATRIZ_FUNCIONAL_DE_PERFIS_E_AUTOMACOES_2026-09-12.md`.

**Causa comprovada:** `NoShowsPage.tsx` mantinha estado `view` e alternava `setView`, mas a área à direita não utilizava o estado para selecionar os formulários; os quatro botões eram visualmente clicáveis, sem separar seus conteúdos.

**Mudança cirúrgica:** `src/features/no-shows/NoShowsPage.tsx` commit `98750a3bb4b3aa68dfce4d0b3ff41c07648f17b2`: mantém lista de ocorrências selecionáveis e resumo operacional; vista `faltas` mostra acompanhamento e histórico; `contatos` mostra WhatsApp, método, resultado, aceitação, situação e histórico; `motivo` mostra formulário de resultado/estado/próximo contato/próxima ação/observação e histórico; `remarcar` mostra somente o link Agendar para a Agenda Geral filtrada pelo profissional original, ou aviso de ocorrência encerrada. Operações existentes `registerNoShowContact`, `getNoShowContacts` e remarcação por `/agenda` não foram modificadas. Para ocorrências encerradas, os formulários de escrita deixam de aparecer, mas o histórico continua consultável. Nenhuma tabela, perfil ou permissão do Supabase foi alterada.

**Testes atualizados:** `tests/unit/no-shows-page.test.tsx` commit `a42f0c383fe95de0180c9c7720b1bb7e6ff9d303` adaptou os testes existentes à seleção de abas e acrescentou verificações de conteúdo condicional, botão Agendar exclusivo da remarcação e proteção dos registros encerrados. **Execução de testes automatizados, build, publicação Cloudflare e homologação autenticada não foram comprovados nesta etapa.** A correção é alteração de interface e precisa ser publicada antes de ser vista na tela do usuário.


---

## 19/11/2026 — VERDE: três colunas de ocorrências em Faltosos, sem filtro por situação

**Ordem da Titular:** substituir o filtro de situação na tela administrativa de Faltosos por três colunas fixas `Ocorrências novas`, `Ocorrências pendentes` e `Ocorrências encerradas`. Ao selecionar o paciente, apresentar o acompanhamento abaixo das colunas, mantendo os quatro botões funcionais anteriores, a mesma origem de dados, a remarcação e as notificações.

**Classificação preservando os estados reais:** `pendente` fica em **Novas**; `encerrado` em **Encerradas**; `em_contato`, `contatado`, `nao_localizado`, `recusou` e `remarcacao_solicitada` em **Pendentes**, mantendo os rótulos de estado específicos dentro de cada ocorrência. Essa categorização é de apresentação: não reclassifica status nem modifica banco.

**Frontend, branch main:** `src/features/no-shows/NoShowsPage.tsx` commit `40a78145a9927c7f31de27c7d5a361aac572931e` introduz as três colunas e retira `statusFilter` e o seletor `Situação/Todas`; os cartões selecionáveis carregam o mesmo registro na área de acompanhamento abaixo. Commit `365fe114085f67674b1912c38e607744c1327e4b` passa a consultar lotes de até 100 ocorrências pelo contrato existente, com `Carregar mais ocorrências` quando necessário, sem ocultar filas acima de 100 registros. `src/features/no-shows/no-shows-page.css` commit `66cbe0bb6db782bb51480ee80e0ae6fc21fdd9af` estabelece três colunas iguais em desktop, empilhamento responsivo e acompanhamento abaixo, sem alterar estilos de outras páginas. `tests/unit/no-shows-page.test.tsx` commit `91026b0db1519f47e21b7ddaea8c593a8f72bc41` adiciona cobertura de agrupamento, remoção do filtro, seleção de ocorrência encerrada e consulta sem filtro no serviço.

**Escopo:** não foram alterados Supabase, status de pacientes, ocorrências, regras de remarcação, notificações ou permissões; fluxo da Assistência Social preservado. **Pendente:** execução de testes/build, confirmação de deploy Cloudflare e homologação visual autenticada da Titular; não declarar testado ou publicado sem evidência.


---

## 19/11/2026 — VERDE: ocorrência de Faltosos em página separada, sem rolagem longa

**Solicitação:** a Titular determinou que, ao clicar no nome em uma das três colunas de Faltosos, o CAPO abra outra página de acompanhamento, para evitar formulário extenso abaixo da lista; inserir `Voltar para Faltosos`. VERDE concedido nesta conversa.

**Implementação na branch main:** `src/features/no-shows/NoShowsPage.tsx` commit `437dfd54cda553d32496db97ed7f924538b3e7e0` cria navegação por URL dentro da rota existente `/faltosos`, utilizando `?ocorrencia=<followup_id>`. A página principal mostra **apenas as três colunas** de Novas, Pendentes e Encerradas; nomes são links e não mais seletores que estendem a mesma página. Ao acessar `/faltosos?ocorrencia=...`, apresenta somente o acompanhamento da ocorrência e suas quatro abas já homologadas, ocultando as três colunas; `Voltar para Faltosos` remove o contexto e retorna à página principal. A rota existente e suas proteções de acesso são preservadas. IDs enviados por notificações via `initialContextId` continuam aceitos, e a navegação de retorno limpa `contextId` no estado. A consulta e o histórico permanecem vinculados ao mesmo `followup_id`. Commit `646bdeb941cedd58a979fdd8df45ec5c49ca963e` permite localizar ocorrências profundas em lotes de 100; commit `5a0aee66febfebe26fc96170a947c3bed68d2ebe` limita repetição automática em caso de erro de paginação.

**Estilo:** `src/features/no-shows/no-shows-page.css` commit `5135b36bcf9779c533493e39ce4eaeabaa6893e2` torna os cartões de ocorrências links e estiliza o botão Voltar, mantendo layout responsivo da lista.

**Regressões:** `tests/unit/no-shows-page.test.tsx` commit `2425bbd6624bbb4b8204a61e0180cb2aa605ecd7` atualiza seleção pelo link, verifica separação entre quadro e acompanhamento e retorno às colunas, sem mudar contratos de RPC. **Nenhuma modificação no Supabase**, nos status, nas remarcações, no disparo de notificações, nas permissões ou na Assistência Social.

**Limites:** alterações versionadas e inspecionadas no GitHub; execução de Vitest, build, publicação Cloudflare e teste visual autenticado ainda não foram confirmados. Não declarar homologação da interface sem essas evidências.


---

## 19/11/2026 — VERDE: Home Gestor/Titular — atividades reais, indicadores, diagnóstico e cadastro no alto

**Autorização expressa:** a Titular aprovou quatro adequações da Home: integrar Atividades Recentes à auditoria global, mostrar indicadores gerenciais reais, consultar o Status do Sistema e mover o botão colorido de Cadastro de Profissionais para o alto, ao lado de Equipe. Complementou durante a execução: **manter a cor e o padrão visual do CAPO**.

**Escopo e evidências:** `src/features/gestor/GestorHomeSnapshots.tsx`, commit `5ebf33ae8e614991966e987f42e6704e70f779fb`, implementa três componentes usando exclusivamente os contratos CAPO existentes `getAuditLogs` (6 eventos recentes, período até sete dias, limitado pelos controles da RPC de auditoria), `getReportsDashboard` (mês atual), `getTechnicalSystemStatus` (resumo de componentes técnicos). Todos usam loading/empty/error com mensagem explícita, botões Atualizar, recarga ao retornar à janela e revisão periódica de 60s durante página visível. A auditoria mostra ação, área, autoria, horário e resumo autorizado; leva para `/gestor/auditoria`, não para a timeline individual do paciente. Os indicadores seguem as métricas reais `patients.active_current`, `patients.registered_period`, `agenda.realized_period` e `agenda.no_show_period`, com período definido pelo relógio de Brasília; ajustes no commit `e2c307970fbe54cdda62c5f43c480b726e99bd43`. O diagnóstico exibe estado consolidado dos componentes retornados pela função canônica, com link para `/tecnica`, sem exibir status fictício.

**Integração visual:** `src/features/gestor/GestorDashboard.tsx`, commit `e1a68e44fe9513b178b42eeedc3547f71bf9a393`, substitui o link estático Atividades Recentes pelo painel real, mantendo-o abaixo de Aniversariantes e acima do quadro de manutenção; os resumos de indicadores e status são exibidos abaixo da agenda, e o atalho `Cadastrar profissional` foi movido imediatamente depois de `Equipe` no grupo superior. A rota original `/gestor/administracao` continua inalterada; não há duplicação do formulário.

**Padrão cromático CAPO:** `src/features/gestor/gestor.css`, commits `0ac053d9ab5bf2b47023f1bf1b508fabb923bb2c` e `da07af69ed14103b48dcdb31aeeab742d6b53b68`: atalho usa o mesmo azul institucional `#006bd9`, base `rgb(232 246 255 / 82%)`, fontes, arredondamentos e sombras do padrão `gestor-quick-card`; mantém distribuição superior, agenda de dois dias e coluna lateral. O resumo inferior reorganiza-se em duas colunas responsivas e preserva a lista de alterações estruturais aprovadas. `tests/unit/gestor-dashboard.test.tsx`, commit `1401164b1c68b01d7c3622ccb264a49d1ebc8e5a`, revisa asserções de atalhos, ordem Equipe/Cadastro, presença dos quadros e links aos módulos oficiais.

**Segurança e não regressão:** nenhuma tabela, permissão, função ou migration alterada; consumidas apenas RPCs oficiais com autorização e isolamento de produção/homologação. **Testes unitários, build e publicação Cloudflare não foram comprovados nesta execução; a Titular ainda não homologou o resultado visual em produção.** Não registrar como produção testada sem evidência.


---

## 19/11/2026 — VERDE: quatro contadores de pacientes na Home Gestor/Titular

**Pedido e aprovação:** incluir na Home Indicadores do Sistema as quantidades de **Pacientes cadastrados**, **Pacientes ativos**, **Aguardando resposta** e **Encerrados**, mantendo identidade visual e separação produção/homologação. VERDE expresso recebido.

**Auditoria prévia de dados (somente leitura):** `patients.status` não representa resposta à Oferta CAPO, portanto não se pode inferir espera pelo status `ativo`. A espera é registrada em `patient_active_searches` com `search_type` `initial` ou `offer_rescue`, `flow_status='ativo'`, `closed_at is null` e `accepted_service is distinct from true`. As duas filas podem ter o mesmo paciente (2 sobreposições observadas), devendo usar `DISTINCT patient_id`. Consulta pontual a pacientes reais, excluindo `is_test`, retornou **84 cadastrados, 45 ativos fora da fila de resposta, 38 aguardando resposta e 1 encerrado por óbito** (valores sujeitos a variação em produção). Encerrados inclui `status` encerrado/inativo/óbito e/ou marcação `deceased`; a categoria de óbito não deve reaparecer como ativa.

**Implementação:** migration `supabase/migrations/20261119230000_home_patient_status_counts.sql`, commit `8cca3cb91e43865414ffed6110b58047fe3d9bb8`, aplicada ao projeto `fftebavlhbfcrvrtnrld` com sucesso. Cria RPC `get_home_patient_status_counts_for_interface()` somente leitura, `SECURITY DEFINER`, com sessão autenticada, conta ativa, termo vigente e papel administrador verificados dentro do banco. Isola `patients.is_test` conforme `capo_is_homologation_account()`; `anon` sem permissão, `authenticated` com execução sujeita às verificações internas. Um paciente aparece uma vez no total e é classificado por status atual e Oferta/Resgate em aberto; nenhum dado pessoal individual é devolvido.

**Frontend:** `src/lib/supabase/rpc.ts`, commit `d5e0fd52e8c9349ad833c40ce2f0cbcc8d9ecc28`, adiciona método oficial da RPC sem filtros controlados pelo cliente; `src/features/gestor/GestorHomeSnapshots.tsx`, commit `9c68847aa6687f8f56ada3115f410a62ba4645e3`, substitui o resumo genérico do mês pelo quadro de quatro totais solicitados, mantendo fonte de dados, atualização e cartão no padrão existente do CAPO. O relatório gerencial completo permanece acessível pelo link. Teste de contrato acrescentado a `tests/unit/rpc-team-management.test.ts`, commit `a8db373ec71287ad1534066c65e381f0568dd4c2`.

**Verificações:** migration retornou `success=true`; função existe no Supabase e possui `SECURITY DEFINER`, `authenticated` pode executar, `anon` não. A regra de contagem foi reproduzida com SELECT antes de aplicar e confirmou a separação dos 84 pacientes. **Pendente:** execução local de Vitest/build e teste autenticado de tela/deploy Cloudflare; não declarar a interface homologada sem evidências. Os contadores de encerrados incluem óbito como encerramento administrativo do cadastro e não equivalem automaticamente a encerramento de uma especialidade.


---

## 19/11/2026 — VERDE retomado: ampliar Agenda da Home, mover alterações aprovadas e incluir Encaminhamentos

**Sequência de autorização:** após aprovação visual da disposição da Home Gestor/Titular, a Titular declarou `PARE`, e nenhuma gravação foi feita naquela etapa. Em seguida, solicitou integrar ao mesmo escopo o botão colorido `Encaminhamentos`, sempre respeitando as cores da logomarca, os ícones e o design CAPO. A Titular emitiu um novo **VERDE** autorizando explicitamente a execução conjunta.

**Mudanças pontuais, branch main:**
- `src/features/gestor/GestorDashboard.tsx`, commit `22f7a55a4e7fbab77094873893c25619a793b703`: insere `Encaminhamentos` em **Acessos rápidos**, na sequência de Solicitações, usando a classe institucional existente `gestor-quick-green`, ícone `clipboard` já disponível e a rota existente `/encaminhamentos` (sem criação de fluxo paralelo). Move o artigo existente `gestor-approved-agenda-changes` de `gestor-summary-grid` para a coluna lateral `gestor-side-stack`, **imediatamente após `MaintenanceNoticeBoard`**, preservando integralmente a lógica `getAgendaChangeRequests('aprovada')`, os estados de carregamento/vazio/erro, `Atualizar solicitações` e `Efetivar alteração aprovada`. Quadro não duplicado: aparece só uma vez. Mantém `Aniversariantes`, `AuditRecentActivities`, `MaintenanceNoticeBoard` e, abaixo do quadro central, `HomeIndicatorSummary` e `HomeTechnicalStatus`.
- `src/features/gestor/gestor.css`, commit `2845a78f72aec8af9a2eb351a9516b47573deb7a`: amplia a área horizontal da Agenda de dois dias úteis no desktop com grid da Home Gestor/Titular `minmax(0,3.2fr) minmax(285px,.9fr)`, mantendo a lateral compacta e os espaços legíveis. Para larguras de até 1150px, empilha as áreas sem forçar painel lateral estreito. Garante quebra adequada de controles do quadro deslocado. CSS escopado a `.gestor-dashboard` para não modificar o painel do Administrativo Operacional e preserva as classes e cores institucionais atuais.
- `tests/unit/gestor-dashboard.test.tsx`, commits `a6538eb945e8026a437c44552052e422d741c9fd` e `987a551b1514945b0f8b2eb74f9a347659afaabf`: novas asserções para rota e cor do atalho Encaminhamentos; artigo de alterações aprovadas único e presente na lateral depois do componente `.capo-maintenance-notices`; ausência de duplicação do quadro no resumo inferior; agenda ainda visível.

**Preservação:** nenhum schema, migration ou registro de pacientes alterado; nenhuma modificação nas regras de agendamento, atendimento, bloqueios, remanejamento, notificações, autorização de aprovações ou fluxo de Encaminhamentos. CSS usa apenas paleta e padrões de cartões já usados pelo CAPO.

**Limites verificáveis:** alterações gravadas no GitHub `main` e inspecionada estrutura JSX, mas ainda não houve execução demonstrada de Vitest/build, publicação Cloudflare ou homologação visual autenticada. Não declarar essas etapas concluídas sem evidência.


---

## 19/11/2026 — VERDE: Agenda Geral preenche o espaço vertical livre da Home Gestor/Titular

**Autorização:** a Titular solicitou eliminar o grande espaço em branco abaixo da Agenda Geral de dois dias úteis na Home do Gestor/Titular: **"não deixar buracos, expandir até preencher o buraco atual"**, com organização também do conteúdo interno, sem criar horários nem consultas fictícias. A Titular emitiu **VERDE**.

**Implementação cirúrgica no frontend:** `src/features/gestor/gestor.css`, commit `40a60b8c643bef853432af5866bab1a1c473eae5`. Em desktops com largura superior a 1150px, a grade principal da Home Gestor/Titular passa a estender seus itens até a altura da coluna lateral; o componente existente `capo-two-day-home` passa a organizar cabeçalho, grade de dois dias e rodapé com flexbox; as duas colunas acompanham essa altura; as listas de consultas e os cartões reais podem ocupar o espaço vertical sem o antigo limite interno de 415px; a disponibilidade livre real, inclusive a mensagem de ausência de horários, ocupa a área restante usando o esquema cromático institucional já adotado pelo CAPO. O ajuste não gera slots adicionais nem registros duplicados. Em telas com até 1150px, a Home mantém o comportamento responsivo previamente existente, sem forçar preenchimento artificial em dispositivos estreitos.

**Preservação:** estilos estritamente sob `.gestor-dashboard`; sem tocar em `AdministrativeTwoDayAgenda.tsx` ou `DailyTeamAgendaRows.tsx`, regras de horários, confirmação, avisos, remarcação, cancelamento, registros reais, Supabase, Administração Operacional, manutenção ou indicadores. O quadro de alterações aprovadas continua abaixo dos avisos de manutenção na lateral; o atalho Encaminhamentos permanece no topo.

**Verificação e limites:** modificação registrada na branch `main` e inspecionada; **execução de testes automatizados, build, publicação Cloudflare e homologação visual autenticada não foram confirmados**. Monitorar em telas grandes com agendas muito cheias ou vazias para assegurar legibilidade.


---

## 19/11/2026 — VERDE: Renovação de Receita, continuidade médica e acompanhamento AO/Gestor

**Decisão aprovada:** corrigir a continuidade do fluxo entre a ação médica `Recebido` e a decisão `Receita pronta` / `Necessita consulta`, preservando retorno automático ao Administrativo Operacional (AO) e visibilidade ao Gestor/Titular, sem gerar duplicações. A Titular autorizou **VERDE** após confronto com a Matriz Funcional de 12/09/2026, seções 11.3, 14.9 e 18.10, e histórico 28.28, 28.35, 28.58.

**Evidência de produção antes da intervenção, somente leitura:** no dia 19/11/2026 uma solicitação real destinada a Ilton foi criada em `awaiting_medical`, aviso individual registrado/lido e ação `medical_started` executada pelo login real de Ilton. Permaneceu em `medical_in_progress`, sem `medical_outcome`, `medical_returned_at` ou `medical_processed_by`. A conta estava ativa com perfil principal `profissional`, adicional `coordenador`, primeiro acesso concluído e capability `renovacao_receita`. Não se constatou erro de login ou de autorização.

**Causa no frontend:** `RenewalPrescriptionPage.tsx` iniciava o filtro médico em `awaiting_medical` e, após confirmar `start` no banco, executava `loadItems()` mantendo esse filtro. A solicitação passava para `medical_in_progress` e desaparecia da lista de recebidas, interrompendo a continuidade sem avisar como encontrar a próxima etapa.

**Correção na branch main:** `src/features/renewals/RenewalPrescriptionPage.tsx`, commit `e5f727efc72d8d91c4b604732ece5ef46821910d`: depois de a RPC confirmar `start`, a tela preserva a identificação da solicitação, muda para `Em andamento`, exibe imediatamente os campos e as ações de decisão médica, e faz nova consulta oficial ao banco pela mudança do filtro. No erro, mantém comportamento anterior e apresenta mensagem. As decisões `renewed` e `needs_consult` e suas validações permanecem inalteradas. `tests/unit/renewal-prescription-page.test.tsx`, commit `570213e27cd48285828f4b94aeb86f9e9d42fdb1`: inclui regressão `Recebido → Em andamento → decisões disponíveis`, proteção da separação de controles por perfil e consulta de casos `awaiting_admin` nos papéis `administrador` e `administrativo_operacional`; corrige seleção do filtro no teste preexistente para `medical_in_progress`.

**Notificações e papel administrativo (sem migração):** a RPC existente `manage_prescription_renewal_medical_for_interface` gera **um único aviso** dirigido a `administrativo_operacional` quando a decisão médica é registrada, com tipo `prescription_renewal_ready` ou `prescription_renewal_needs_consult`, entidade `prescription_renewal_requests` e vínculo da solicitação; a mesma solicitação passa para `awaiting_admin`. A RPC de leitura `get_my_notifications_for_interface` e as versões por estado/categoria incluem `or 'administrador'=any(v_roles)` na regra de autorização, de modo que o Gestor/Titular também lê os avisos gerais administrativos existentes, respeitado o isolamento e a visibilidade do paciente. O frontend `App.tsx` mapeia a entidade para `/receita`. **Não se cria outro aviso duplicado nem se altera banco/permissões.** Isso difere da hipótese inicial de que o Gestor não receberia: o código real da consulta de notificações demonstra que já recebe a notificação de AO em sua visão autorizada.

**Preservação:** nenhuma alteração no registro real do Ilton, em pacientes, termos, Auth, permissões, decisão clínica, conteúdo da prescrição, procedimentos de atendimento, agendamento, contato com pacientes, isolamento de homologação ou Supabase.

**Limites:** inspeção do código e das RPCs concluída. Testes automatizados foram acrescidos, **mas execução Vitest/build, validação visual autenticada em Ilton/AO/Gestor e publicação Cloudflare ainda não comprovadas**; não declarar a correção homologada na produção sem essas evidências.


---

## 19/11/2026 — VERDE: calendário oficial de feriados não conta como dia útil na Home administrativa

**Autorização:** a Titular solicitou reconhecer feriados nacionais, de Minas Gerais e do município de Pouso Alegre para que, em particular, o bloqueio de agendas feito em 20/11/2026 não seja interpretado como um dia útil no quadro de dois dias da Home do Gestor/Titular e do Administrativo Operacional. **VERDE** recebido. Bloqueio anterior, justificativa e agendamentos reais intocados.

**Confronto prévio:** `src/features/home/AdministrativeTwoDayAgenda.tsx` calculava dia útil considerando somente sábado e domingo, causando exibição de feriados na Home. Buscas no repositório identificaram esse cálculo `nextBusinessDay` como ponto concreto de dependência da regra de dia útil. O banco já tem o tipo de exceção `feriado` para bloqueios reais de agenda; esse mecanismo não deve ser substituído nem ativado automaticamente apenas pelo calendário.

**Implementação versionada:**
- `src/lib/calendar/capo-holidays.ts`, commits `60e9aadcba79ed20ba8436087f9fca8ed314c985` e `fa076d6535e761c1b8a1be1b82560411c4363950`: utilitário compartilhável com `capoHolidaysForYear`, `capoHolidayOn`, `capoIsBusinessDay`, `capoNextBusinessDay`. Combina datas nacionais fixas, Paixão de Cristo (data móvel), feriados municipais (Corpus Christi móvel, Senhor Bom Jesus em 06/08 e São Paulo da Cruz/Emancipação em 19/10). Tiradentes em 21/04 também é Data Magna de Minas Gerais: uma única data contada como não útil, sem duplicidade. Computus gregoriano calcula datas móveis por ano, inclusive viradas. Fonte principal municipal: Lei Ordinária Pouso Alegre 5.070/2011, arts. 1º e 2º, https://www.legislador.com.br/legisladorweb.asp?ID=122&WCI=LeiTexto&aaLei=2011&inEspecieLei=1&nrLei=5070 ; feriados nacionais 2026 e distinção de pontos facultativos: https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026 ; 20/11 Lei 14.759/2023. Pontos facultativos do município ou do estado **não são automaticamente feriados nem bloqueios CAPO**.
- `src/features/home/AdministrativeTwoDayAgenda.tsx`, commit `310692172a21a70c8a14c15717227f5bd0066da0`: usa utilitário para selecionar os dois próximos dias úteis na Home administrativa compartilhada, sem alterar RPCs, slots, horários nem banco. Em 19/11/2026 mostra 19/11 + 23/11; em 20/11/2026 apresenta 23/11 + 24/11; sábados/domingos continuam ignorados.
- `tests/unit/administrative-two-day-home.test.tsx`, commit `d3023a5772f3804f94498fcaaf736bc2a4c2cd2a`: ajusta expectativa antiga que considerava 20/11 útil e cobre feriados nacionais, feriados municipais móveis/fixos, Data Magna MG, pontos facultativos e fim de semana.

**Não escalar indevidamente:** o VERDE não autoriza cancelar/agendar/remanejar pacientes automaticamente, criar bloqueios gerais, modificar o calendário das grades profissionais ou alterar a governança de dispensa. O cálculo visual da Home não substitui a grade real (que permanece consultável em Agenda Geral), nem impõe calendário de pontos facultativos não homologados. O utilitário agora está disponível para outras funções que explicitamente necessitem de *dia útil*, mas a integração atual foi restrita ao consumidor identificado e aprovado.

**Verificação:** arquivos inspecionados e gravados no GitHub `main`; testes unitários escritos, porém sua execução, build, deploy Cloudflare e homologação autenticada ainda não foram confirmados.


---

## 19/11/2026 — VERDE — correção auditável de confirmação manual registrada por engano

**Ocorrência:** Gestor/Titular informou ter confirmado manualmente uma consulta por engano e pediu solução para corrigir a confirmação sem cancelar o agendamento. Foram aprovados os resultados **Confirmação pendente**, **Paciente avisado — aguardando resposta** e **Contato realizado — sem resposta**, exigência de motivo, preservação do histórico, segurança do link individual do paciente e disponibilidade para **Gestor/Titular e AO**. **VERDE** explícito nesta conversa.

**Confronto técnico:** o botão `Confirmar` da Home administrativa executava `register_appointment_previsit_contact_for_interface` (e para familiar `register_family_psychology_previsit_contact_for_interface`), gravando `confirmou` em histórico append-only e encerrando automaticamente `appointment_confirmation_unanswered` pelo gatilho `capo_close_unanswered_on_manual_confirmation`. Não havia API própria para desfazer a confirmação manual. Essa confirmação prévia **não** altera `patient_appointments.attendance_status`, não confirma presença profissional e não inicia atendimento.

**Supabase — migration real aplicada** `supabase/migrations/20261119170000_correct_manual_previsit_confirmation.sql` (commits `eca3fb89730775244b13acec8682fa2f2f82cef8` e `b686511bc946e49ae15a93fe46aaaa82ded9a832`): a função autenticada `public.correct_manual_previsit_confirmation_for_interface(uuid,text,text,text)`, `SECURITY DEFINER` com checagem de termo, conta ativa e papel administrativo, validação de paciente/ambiente com `capo_assert_patient_write_context`, consulta ainda agendada e último evento `confirmou`. Impede corrigir confirmação efetuada por link individual (`decision=comparecera`). Exige motivo de 5 a 500 caracteres e insere **novo** evento de contato `correcao_pendente`, `avisado` ou `sem_resposta`, sem atualizar nem excluir o anterior. Tabela `capo_manual_confirmation_corrections` audita agendamento, origem, contato anterior, resultado anterior/novo, justificativa, ator e horário; RLS habilitada, sem permissões diretas `authenticated`/anon. Novo aviso operacional de confirmação pendente só é gerado se havia alerta `appointment_confirmation_unanswered` histórico encerrado e não há outro alerta ativo para a mesma consulta/entidade; o aviso anterior fica preservado. A função não altera consulta, presença, ausência, notificações individuais de outros fluxos ou resultado do paciente no link.

**Frontend — interface compartilhada:** `ManualConfirmationCorrection.tsx` (commits `ba3286da5d3fa820afdb44502e9f7493f5abbcf9`, `2a0b78b4f9ce15db819f8891fa8875a8a4b2bd16`, `3b0945e2c2ce3c32e040cdbc28e667407aa79847`) e `manual-confirmation-correction.css` (`ab0a84b8aa053bb7b4efccf9e12e6d0cfe6d27fb`). Exibe botão `Corrigir confirmação` somente quando há confirmação manual vigente, campos de resultado e motivo obrigatório, `Salvar correção` e `Voltar`. `DailyTeamAgendaRows.tsx` (commit `5b46efd07d27744b585dd08a7e3cb7bddaf81198`) na Home administrativa e `AgendaPage.tsx` (commit `155f4351fc13479b5704b6da09ae2abb53f35293`) na Agenda Geral, incluindo Familiar/Cuidador. `agenda-page.css` foi limpo de estilos duplicados (`0eeb017e65545e8375ce96e7c5e355e513d900cc`). Estado corrigido é exibido de modo claro. Botão nunca aplica atualização local em caso de erro da RPC.

**Testes de regressão adicionados:** `tests/unit/manual-confirmation-correction.test.tsx` (commit `cda824205976fb002206bbdc5350ddda48f65cf6`) com casos de motivo obrigatório, confirmação positiva do backend e falha de autorização/resposta pelo link. **Execução dos testes/build não confirmada**; homologação real e publicação Cloudflare pendentes.

**Verificação física:** confirmação de existência da nova RPC (`SECURITY DEFINER`), permissão de EXECUTE para `authenticated` e não para `anon`, constraints dos dois históricos ampliadas, tabela de auditoria com RLS ativo e consulta da leitura atual `last_notice_result` no familiar. Antes de homologação nenhum evento de correção real foi escrito; o erro relatado pela Titular **não foi corrigido automaticamente** por não se saber qual agendamento deve ser retificado. Nenhum dado real de consulta, paciente ou familiar foi modificado durante a implantação.

**Restrições:** Não reabrir os módulos gerais de notificações, confirmações pelo link, cancelamento/remanejamento, agenda bloqueada homologada, perfis profissionais ou isolamento de manutenção; somente corrigir a confirmação manual com autorização administrativa. Registro da confirmação anterior é intocável; confirmação pelo paciente via link tem prioridade e não pode ser revertida administrativamente.


---

## 19/11/2026 — VERDE: Nutrição, primeira consulta de 60 minutos sem alterar a marcação na interface

**Autorização e regra:** a Titular configurou a grade da nutricionista Juliana Teixeira Rios Camargo para 30 minutos em todos os períodos ativos e autorizou (**VERDE**) uma implementação cirúrgica: `Primeiro atendimento no CAPO` e `Primeiro atendimento na especialidade` em **Nutrição** devem ocupar **60 minutos**, reservando automaticamente dois horários consecutivos de 30 minutos, enquanto `Retorno` mantém a duração normal da grade (30 minutos no calendário atual). O Administrativo permanece selecionando os mesmos dados, tipo e um único horário inicial, no mesmo formulário e botão `Confirmar agendamento`. Nenhuma segunda linha de paciente é criada.

**Constatação prévia física (Supabase + GitHub):** especialidade da Juliana = `Nutrição`; configurações ativas: seg/qua 13h10–17h30 (30 minutos), ter/qui 07h10–12h (30 minutos); bloqueios e intervalos existentes preservados. O frontend `src/features/agenda/AgendaPage.tsx` já envia o `appointmentType` escolhido para `getRpcService().createAppointment`, que chama a RPC canônica `create_appointment_for_interface`. O banco já possuía a RPC segura `create_extended_appointment_for_interface`, que valida dois horários livres contíguos e insere **uma única** linha de `patient_appointments` com `appointment_end` explícito. Os gatilhos `trg_capo_prevent_professional_overlap` e `trg_capo_prevent_patient_overlap` continuam impedindo ocupações concorrentes; `get_available_appointment_slots` preserva os bloqueios, intervalos, exceções e agendamentos vigentes. A remarcação `reschedule_appointment_for_interface` chama a mesma RPC canônica de criação com o tipo original.

**Manutenção aplicada diretamente no Supabase por migration, espelhada no GitHub `main`:** `supabase/migrations/20261119183000_nutrition_first_consultation_60_minutes.sql`, commit `31b494d4acfdb4fec89331d4096c38a47e9734b7`. Conserva a assinatura e todas as condições da função existente `create_appointment_for_interface` e acrescenta, logo após resolver a especialidade, **apenas** o encaminhamento para primeira consulta de Nutrição (tipos normalizados `primeiro_capo`, `primeiro_especialidade`, `primeira_consulta`). Verifica a disponibilidade do horário escolhido na grade oficial. Se a duração do slot é 30 minutos, retorna o resultado de `create_extended_appointment_for_interface(...,2)`, que garante dois slots de 30 minutos e registra um único atendimento de 60 minutos; se uma grade legítima já oferecer slot de 60 minutos, utiliza a função simples existente, sem duplicar a duração; para outra duração incompatível, recusa o agendamento e solicita revisão da grade. **Nenhum desvio se aplica a `retorno` ou às outras especialidades.** Como a remarcação usa `create_appointment_for_interface` com o tipo original, preserva 60 minutos nas primeiras consultas de Nutrição futuras, inclusive com troca de horário, sem alterar a própria RPC de remarcação.

**Interface e demais funcionalidades intocadas:** nenhum arquivo de frontend foi alterado; permanecem formulário original, pesquisa, oferta CAPO, aviso WhatsApp, retorno, agendamento adicional, confirmação, presença/falta, remanejamentos, cancelamento, histórico, protocolos de bloqueio, configuração da grade e isolamento de `manuteste`. As duas células consecutivas ficam ocupadas por **um único agendamento** no banco. Se apenas uma vaga de 30 minutos estiver disponível, a RPC recusa o agendamento inicial com mensagem sobre necessidade de dois horários livres; não reserva parcialmente. Histórico anterior, incluindo consultas de primeira vez já criadas com 30 minutos antes desta regra, **não é regravado retroativamente**. Um retorno antigo de 60 minutos também permanece preservado no histórico; a nova regra orienta **novos** agendamentos pela grade atual de 30 minutos.

**Verificações:** `pg_get_functiondef` confirma a nova ramificação e assinatura original no Supabase. Reconsulta de `agenda_configs` confirmou grade ativa de 30 minutos. Reconsulta estatística de `patient_appointments` confirmou agendamentos anteriores com tempos de 30/60 minutos mantidos, sem migração de pacientes; nenhuma linha real foi criada, remarcada ou alterada para o teste. Testes de contrato **somente-leitura** registrados em `tests/sql/nutrition-first-consultation-readonly.sql`, commits `0bb9849e9357a371dd3eb187ee75cb1f2c5a83ce` e `9436615fdbde897f42b5643a641c16202f349d7b`: **7 de 7 verificações SQL passaram** (incluindo criação estendida, escopo de tipos, duração do retorno, sobreposição e remarcação). Esses testes são estruturais, **não equivalem a um teste autenticado de reserva real**.

**Limitações de homologação:** execução Vitest/build, implantação Cloudflare e prova de ponta a ponta com conta administrativa em ambiente de homologação ainda não foram confirmadas. Recomenda-se verificar dois horários livres, um segundo horário ocupado, intervalo/bloqueio entre eles, retorno normal, remarcação de primeira consulta, mensagem WhatsApp e visão profissional sem duplicação. Manutenção permanece **implementada e auditada**, mas não declarada homologada sem prova da Titular.


---

## 19/11/2026 — VERDE: adequação pontual de três primeiras consultas já agendadas na Nutrição (23/11/2026)

**Autorização:** a Titular, após investigação que identificou três agendamentos futuros de 30 minutos na agenda da nutricionista Juliana Teixeira Rios Camargo, determinou intervenção **cirúrgica** e autorizou com **VERDE** a ampliação para 60 minutos, sem remarcação ou alteração dos dados originais.

**Escopo exato:** `patient_appointments` de 23/11/2026, profissional `a15e4860-82be-44cf-965c-2d76fb66c062`, especialidade Nutrição. Agendamentos: `dc002413-f8b6-47af-9123-0721353da9a6` (primeiro CAPO, 13h10–14h10), `ab2f1060-d3a3-4179-bd68-89968b08a69e` (primeiro especialidade, 14h10–15h10) e `4360b6c3-3fb7-4e4c-b38f-1b7056f2c08f` (primeiro especialidade, 16h30–17h30). Antes da alteração, cada um tinha 30 minutos de duração, todos status `agendado`.

**Execução controlada:** SQL transacional no Supabase `fftebavlhbfcrvrtnrld`, com bloqueio consultivo por profissional/data compatível com proteção da agenda, validação obrigatória de exatamente três registros alvo, especialidade, status, dia, duração inicial, grade ativa de 30 minutos, ausência de sobreposição com agendamentos do paciente/profissional, ausência de bloqueios/intervalos e ausência de exceções de agenda. Para cada registro, aplicado **somente** `UPDATE public.patient_appointments SET appointment_end = appointment_date + interval '60 minutes'`, mantendo os demais campos sem mutação explícita. Atualização de todos os três na mesma transação, com `RAISE EXCEPTION` e rollback em qualquer falha. Triggers de validação, sobreposição e auditoria permanecem atuantes.

**Prova pós-gravação:** consulta `SELECT` confirmou os três registros com início original, fim respectivamente 14h10, 15h10 e 17h30, duração exatamente **60 minutos**, tipos intactos e status **agendado**. Verificação dos registros em `audit_logs` comprovou existência de entradas `UPDATE` para os três identificadores. Não foram criados novos agendamentos nem modificados os registros cancelados/remarcados/passados. A interface, as grades, os bloqueios, mensagens WhatsApp e regras de demais especialidades não foram alterados.

**Status:** correção de dados aplicada e verificada no banco real. A conferência visual autenticada da agenda profissional e do Administrativo ainda depende de homologação pela Titular; não confundir prova SQL com homologação de interface.


---

## 19/11/2026 — VERDE: grade Nutrição — segunda vaga de consulta 60 min sem duplicar paciente

**Problema reportado e confirmado:** após adequação cirúrgica dos três agendamentos de primeira consulta da nutricionista Juliana Teixeira Rios Camargo em 23/11/2026, a interface mostrou o mesmo paciente nos dois blocos de 30 minutos. A tabela `public.patient_appointments` já continha **um único registro por consulta**. A RPC canônica `public.get_agenda_schedule_grid_for_interface` selecionava por sobreposição temporal a mesma consulta no primeiro e segundo slot e repetia `appointment_id`, `patient_id`, `patient_name` e `appointment_type`; por isso a interface repetia também as ações em cada slot. A Titular autorizou a correção cirúrgica específica com **VERDE**.

**Correção aplicada no Supabase e registrada no GitHub `main`:** migration `supabase/migrations/20261119194000_nutrition_grid_continuation_without_duplicate_patient.sql`, commit `baa1f965895c21ee1436489307b05c040d7cc4cf`. Substituída somente a projeção dos dados do agendamento na CTE `normal_rows` da função canônica, introduzindo `nutrition_continuation` após o join de pacientes/familiares. Critério rigoroso: agendamento de especialidade **Nutrição** (`specialties.name` = Nutrição, normalizado), duração real de **60 minutos**, grade de **30 minutos**, paciente já iniciado antes do início do slot atual, consulta ainda vigente no slot e não pertencente a grupo psicológico. No primeiro bloco, os dados completos do paciente e o identificador original continuam presentes. No segundo bloco, mantém `slot_status='agendado'`, mas retorna `appointment_id=null`, `patient_id=null`, `appointment_type=null` e `patient_name='Continuação do atendimento'`. Como o contrato de status e a assinatura da RPC não mudaram, os componentes existentes renderizam a continuação ocupada sem oferecer agendamento ou duplicar ações. O banco segue impedindo sobreposição pela duração real registrada.

**Não alterado:** nenhuma linha em `patient_appointments`, nenhum horário de começo/fim, duração configurada, disponibilidade, agendamento de retorno, WhatsApp, bloqueios, remanejamentos, permissões, isolamento de teste, outras especialidades ou frontend. Preservadas todas as CTEs de grade, grupos, família, bloqueios e exceções fora da projeção específica acima.

**Validação executada:** migration Supabase retornou `success:true`. Teste SQL somente-leitura registrado em `tests/sql/nutrition-grid-continuation-readonly.sql`, commit `913b462499125a4a90d3eb15cee0267d2c70557a`. **10 de 10 verificações passaram**: status agendado intacto, continuação sem identificador repetido, rótulo correto, filtro exclusivo de Nutrição, primeiros slots de 13h10/16h30 preservados, retorno de 15h10 preservado, segundos slots de 13h40/14h40/17h00 projetados sem identificador. Os horários do teste são reais do dia 23/11/2026 e a verificação usa leitura do banco e contrato atual da função, **não** uma sessão autenticada da UI. Não foi gravado paciente fictício.

**Estado:** correção de projeção do banco aplicada e validada estruturalmente. Homologação visual autenticada nas vistas Dia, Semana, Mês, Home administrativo e Home profissional permanece pendente da Titular. Não afirmar build, publicação Cloudflare ou teste de ponta a ponta sem evidência.


---

## 19/11/2026 — VERDE — Nutrição: confirmação em Minha Agenda abre Plano Alimentar do paciente

**Regra institucional ratificada pela Titular:** o **registro clínico é realizado no VIVVER**, não no CAPO. No CAPO, após clicar em **Confirmado** na agenda profissional, deve ser registrada a presença e apresentado automaticamente o **Plano Alimentar do mesmo paciente**, sem exigir nova pesquisa. Respeitar a Matriz Funcional 12/09 (§3.2), o comportamento da Home já implementado e a integridade dos registros nutricionais; preservar todas as demais áreas do sistema.

**Diagnóstico anterior:** `src/features/nutrition/NutritionPage.tsx` já recebia `onConfirmed` da agenda incorporada à Home e consultava `get_nutrition_context_for_interface(patient_id)`, selecionando o paciente. Entretanto, a rota isolada `/agenda` em `src/app/App.tsx` só redirecionava confirmações para `/atuacao` (Clínico Geral e assistenciais padrão) e `/assistencia-social`, sem callback correspondente para Nutrição. O Supabase dispõe de `update_appointment_attendance_for_interface`, `get_professional_appointment_context_for_interface` e `get_nutrition_context_for_interface`, todos mantendo autenticação, termo legal e escopo profissional. Não foi alterado registro clínico nem integração VIVVER.

**Execução cirúrgica aprovada com VERDE:**
- `src/app/App.tsx`, commit `4a4e43ecc3d275594d18ec54cf66c56c6ac61124`: acrescentado **somente** ramo de profissional `nutricao` no `onConfirmed` da rota `/agenda`, encaminhando `confirmedAppointmentId` para `/nutricao`. Os dois ramos assistenciais preexistentes e os demais perfis permanecem inalterados.
- `src/features/nutrition/NutritionPage.tsx`, commits `4ef791aed4250288497bf4ddccfebc9b079bfb75` e `992eca42b535d4b141624e810a593f4792871395`: a tela de Nutrição lê **somente o ID da consulta**, reconsulta a RPC `getProfessionalAppointmentContext` para obter dados do banco e exige situação `confirmado`, profissional igual ao efetivo na sessão e especialidade Nutrição, antes de chamar o método já existente `selectNutritionPatient`. Este consulta `getNutritionContext` e carrega o Plano Alimentar. O `scrollIntoView` passou para `useEffect` após `patientId` e `planLoaded`, garantindo que a seção condicional esteja no DOM na Home. Falhas de autorização/consulta apresentam mensagem, sem abrir plano de outro paciente. Não se passa conteúdo clínico por parâmetros de URL nem se cria prontuário CAPO.
- `tests/unit/nutrition-confirmed-appointment.test.tsx`, commit `43aeb4420f503732dc9c8ac21cfcc5769dbbc5be`: regressões versionadas para agendamento confirmado, revalidação por RPC, seleção do mesmo paciente, bloqueio de consulta agendada sem presença, de outro profissional, de outra especialidade, de erro de autorização e de navegação sem ID.

**Verificação de escopo:** 12 verificações estruturais de inspeção de código com resultado verdadeiro para manutenção dos outros redirecionamentos, acionamento exclusivo de Nutrição no perfil profissional, uso exclusivo do ID do agendamento, confirmação e especialidade revalidadas, escopo de profissional, consulta nutricional pelo banco, rolagem após renderização, Home intacta, testes negativos presentes e ausência de mutação de atendimento na tela de Nutrição. Função SQL `get_professional_appointment_context_for_interface` conferida por leitura, comprovando exigência de conta ativa, termo legal, papel profissional e agendamento do profissional vinculado.

**Limitação honesta:** o teste Vitest foi escrito, **não executado nesta sessão**, pois não há checkout local do repositório e o acesso Git direto não está disponível neste runtime; o commit consultado não possuía status de CI publicado na API do GitHub (`statuses=[]`). Não houve sessão autenticada de homologação nem prova de deploy Cloudflare; não afirmar homologação de tela. A validação operacional pela Titular deverá usar profissional de Nutrição e dados permitidos, confirmando uma consulta real apenas quando ocorrer atendimento real, e conferir que a Home e `/agenda` abrem o mesmo Plano Alimentar sem pesquisa.

**Sem alterações:** Supabase, `patient_appointments`, planos existentes, grade de 30/60 min, bloqueios, faltosos, confirmações por link e WhatsApp, retornos, agenda da Psicologia, Administrativo, Home de outros perfis, VIVVER, isolamento de `manuteste` e regra de aviso automático de atualização.


---

## 19/11/2026 — VERDE: reformulação documental do Plano Alimentar da Nutrição e PDF em coluna única

**Origem:** Titular enviou imagem do modelo institucional de Plano Alimentar da Nutricionista, com assinatura/identificação profissional, data e cidade, identificação do paciente, refeições e orientações em coluna única. Aprovou previamente modelo textual com os campos editáveis de café da manhã, almoço, sobremesa do almoço, lanche da tarde, jantar, sobremesa do jantar, hidratação, suplementação nutricional, outras orientações, orientações para tratamento oncológico e observações complementares, além de título editável. **VERDE expressamente concedido.** Todos os textos das seções são livres e não recebem dietas nem recomendações pré-preenchidas. Identificação do paciente e autoria profissional permanecem automáticas pelo banco.

**Escopo e integridade:** alterações aditivas e cirúrgicas em Nutrição, sem mudanças na agenda, presença, confirmação, fluxo VIVVER, regras de acesso dos demais perfis, protocolos de bloqueio, produção/homologação ou mecanismo de aviso de versão. Planos e documentos anteriores preservados. Os novos PDFs representam uma revisão documental gerada a partir do plano salvo, não um segundo plano.

**Supabase aplicado:**
- `supabase/migrations/20261119210500_nutrition_documental_plan_free_text.sql` (commit `f404c657f63d33004bba5f445085918d3928fed6`, aplicada com `success:true`): adicionadas exclusivamente cinco colunas opcionais em `nutrition_plans` — `dessert_lunch`, `dessert_dinner`, `oncology_guidance`, `additional_notes`, `document_title` — mantendo os sete campos anteriores intactos. Nova RPC `save_nutrition_plan_detailed_for_interface` reutiliza as regras validadas da RPC clássica (sessão/termo, autoria de Nutricionista ativa, paciente/ciclo real, escopo, histórico de planos, limites de 5000 caracteres e autorização por profissional) e grava os novos campos junto dos anteriores em uma única transação. A RPC antiga continua íntegra, para compatibilidade. `get_nutrition_context_for_interface` retorna os novos campos do plano atual e histórico. `create_nutrition_document_for_interface` fotografa o conteúdo dos 12 campos em `plan_snapshot`, com `template_version='2'`, identificações e CRN/registro profissional obtidos no banco, mantendo autoria/revisão.
- `supabase/migrations/20261119213000_nutrition_management_documental_snapshot.sql` (commit `f944e70b6b541910cdaa05884549424592bf2ad4`, aplicada com `success:true`): a geração gerencial de documento pela autorização já existente utiliza **o mesmo snapshot completo**, sem dar permissão ao Administrativo para editar plano. Versões anteriores permanecem disponíveis.

**Frontend no GitHub `main`:**
- `src/lib/supabase/rpc.ts` (commit `f4eaf1b2b9822385f679b2bf2082c263b131812c`): método `saveDetailedNutritionPlan` em paralelo ao antigo.
- `src/features/nutrition/NutritionPage.tsx` (commits `0ddc2cd7ea05eafc0f69add8de43c9aa4f09df2a`, `8eece73259ad33aacd7d8796b0d899758b8af170`, `888ed87cbb96f091017a370fc7b013911f8b5573`): edição documental em coluna única, 11 seções de `textarea` livre com `maxLength=5000`, título textual editável, prévia em formato de documento, identificação CAPO/CMS lida de `getNutritionContext`, conteúdo corrente/histórico recuperado do banco, salvar via RPC nova e recarregar plano real. O PDF oficial permanece gerado a partir do **snapshot imutável** da revisão no banco: cabeçalho institucional, serviço, autora/registro, data/cidade, paciente/Nº CAPO/CMS, título, seções com texto e quebras digitados, autoria/revisão, rodapé e páginas pelo gerador CAPO existente. Não são inseridas refeições-modelo. Bloqueada a emissão de PDF com alterações ainda não salvas (`planDirty`); solicitar salvar antes de gerar, evitando divergência entre formulário e PDF. O acesso a planos de outro profissional permanece sem edição.
- `src/features/nutrition/nutrition-document.css` (commit `6341bd8a1a0af928d3bab848f4aba1d9adeb39d6`): estilo isolado para uma coluna documental, responsivo, impressão e área de prévia; sem alterações CSS globais.

**Testes/evidências:** `tests/unit/nutrition-documental-plan.test.tsx` (commit `4c1b5be5a5b56f38c3ec31cc5048946bc20e31dc`) adiciona cenários de formulário digitável, ligação do paciente da agenda, campos extras, prévia e bloqueio de PDF não salvo; **testes Vitest ainda não executados** nesta sessão, sem status de CI disponível. `tests/sql/nutrition-documental-plan-readonly.sql` (commit `f5005177c3a704e6a0bb4b3822f25389ddb5ad5e`) foi efetivamente executado no Supabase: **11/11 verificações de leitura passaram** (cinco colunas, contrato antigo, nova RPC com autoria e escopo, limites, contexto, snapshots profissional e gerencial, versão 2 e nenhuma gravação artificial de plano).

**Pendência de homologação:** publicar/confirmar publicação Cloudflare e realizar teste operacional autenticado na conta da Nutricionista, preferencialmente com dados seguros no contexto `manuteste` isolado: abrir paciente, digitar múltiplas linhas em cada campo, pré-visualizar, salvar, recarregar, emitir PDF, verificar quebra de páginas/cabeçalho/rodapé, registrar e consultar PDF gerencial, manter autoria/revisão e verificar continuidade de planos históricos. Não afirmar PDF visual conferido ou publicação concluída sem evidência.



---

## 19/11/2026 — VERDE — Nutrição: corrigir alinhamento justificado e excesso de texto operacional no PDF

**Relato da Titular:** a imagem do PDF nutricional emitido demonstrou texto muito pequeno, concentrado em coluna estreita à esquerda, cabeçalho de informações repetidas e rodapé gerado automaticamente com nome/cargo da conta de homologação. A Titular ratificou que o Plano Alimentar deve acompanhar o modelo documental entregue pela Nutricionista (arquivo de referência enviado na conversa), mantendo **uma coluna, mas texto dos parágrafos realmente justificado entre as margens**, com fonte legível, autoria somente uma vez no cabeçalho, rodapé minimalista e preservação integral dos textos digitados. Autorização expressa **VERDE**.

**Constatação:** `buildCapoDocumentPdf` em `src/lib/pdf/capo-document-pdf.ts` coloca cada linha em coordenada horizontal constante 45 e adiciona rodapé operacional `capoPdfFooter` com nome e função da conta emissora, inclusive `manuteste`. Corrigir esse gerador global mudaria relatórios e documentos já homologados. O método anterior `buildNutritionPdf` de `NutritionPage.tsx` entregava arrays de strings já quebradas por número de caracteres, sem formatação tipográfica, à rotina geral, fazendo as linhas ficarem apenas alinhadas à esquerda, jamais justificadas.

**Correção cirúrgica exclusivamente do PDF Nutrição:**
- `src/lib/pdf/nutrition-document-pdf.ts`, commits `9338da186cd3c98a41079b959ec76d764ad23e53` e `5c6e62d00700a7a140654860a695549ede849a7c`: criado renderizador próprio A4 que reutiliza exatamente o timbre oficial CAPO, mas não utiliza nem modifica `buildCapoDocumentPdf` nem `capoPdfFooter`. Margens de corpo de 55 a 540 pontos, fonte Helvetica 11,25 pt com entrelinha 17 pt. Quebra de linhas pelos comprimentos tipográficos da fonte Helvetica; justificação real por operador PDF `Tw`, calculando o espaçamento entre palavras para distribuir os parágrafos até a margem direita. Última linha e quebras manuais de parágrafo não são justificadas; evita espaçamento exagerado quando há poucas palavras. Títulos das refeições em negrito e alinhados à esquerda; cabeçalho institucional com timbre, profissional e registro uma única vez, cidade/data, identificação do paciente e título do documento; seções em fluxo vertical e quebra automática entre páginas, sem truncamento intencional; rodapé somente `Página X de Y`. Mantida a codificação PDF Latin-1/WinAnsi e integridade dos separadores binários de objetos e streams. Nenhum dado fictício é inserido em documentos reais.
- `src/features/nutrition/NutritionPage.tsx`, commit `12422b26b5ef898c1ecae25d6e05664312df1768`: rotas de emissão profissional e gerencial passam a usar `buildNutritionDocumentPdf(officialDocument)` a partir da mesma revisão/snapshot obtida do Supabase, removendo apenas a antiga montagem de linhas específica da Nutrição; o frontend, o formulário, o salvamento, o registro de versão, o upload e as entregas continuam inalterados.
- `tests/unit/nutrition-document-justification.test.ts`, commit `09123fe75538a026fdf2fd339cd4de35de414517`: criados testes para linhas intermediárias justificadas, última linha não justificada, respeito às quebras manuais, assinatura PDF A4 com timbre e só paginação, ausência de repetição da homologação, e documentos longos multipágina sem descartar orientações.

**Conferências efetuadas:** inspeção no GitHub `main` confirmou renderizador isolado, margens 55–540, `Tw` com espaçamento calculado, quebras manuais preservadas, rodapé sem `capoPdfFooter`, geração profissional e gerencial ambas com o renderizador próprio e ausência de alteração do fluxo no Supabase. Nenhuma migração nesta manutenção. O commit mais recente não apresentava status de CI disponível (`statuses=[]`), e os testes unitários adicionados ainda **não foram efetivamente executados** por esta sessão; a inspeção estrutural não constitui prova de renderização visual autenticada.

**Pendente:** confirmação da publicação do build no Cloudflare, execução do Vitest/compilação e homologação visual do PDF emitido pela conta profissional autorizada, incluindo parágrafos extensos, listas curtas, página 2+, cabeçalho, rodapé e acentos. Proteger conteúdo clínico no VIVVER e privacidade das revisões/autorizações existentes. Não afirmar que a publicação ocorreu sem evidência.


---

## 19/11/2026 — VERDE: salvar/atualizar Plano Alimentar no ambiente isolado `manuteste`

**Relato:** Titular observou que após o redesenho do formulário Nutrição não conseguia salvar e atualizar o plano **no ambiente de teste**. Investigação anterior identificou chamadas HTTP 200 da RPC antiga `save_nutrition_plan_for_interface` por volta de 20h25 e nenhuma chamada observada à nova RPC `save_nutrition_plan_detailed_for_interface` nos logs recentes. Não houve comprovação de que o navegador já estivesse usando a nova publicação, nem erro HTTP específico que permitisse atribuir exclusivamente a falha à permissão ou ao código. **VERDE** concedido para correção cirúrgica.

**Diagnóstico Supabase, exclusivamente leitura de dados protegidos do teste:** `manuteste` é conta ativa de homologação, com contexto simulado `profissional`, Nutrição, profissional ativo, paciente de teste ativo com ciclo aberto, um plano atual pertencente ao profissional simulado e escopo nutricional. A simulação de identidade com `set_config('request.jwt.claim.sub',auth_user_id_manuteste,true)`, dentro de transação revertida, confirmou `has_accepted_current_legal_term=true`, papel profissional, contexto de homologação e escopo de paciente; `get_nutrition_context_for_interface` retornou plano, paciente e `current_plan.owned_by_me=true`. A nova RPC havia sido criada com `proacl=null`, implicando `EXECUTE` para `PUBLIC`/anon, ao contrário do contrato antigo apenas para `authenticated`.

**Correções executadas:**
- Migration `supabase/migrations/20261119224000_nutrition_plan_save_rpc_grant.sql`, commit `e53ebcd1c36a7d473c2eefb9a575c71a30fbc95e`: `REVOKE ALL ... FROM PUBLIC, anon`, `GRANT EXECUTE ... TO authenticated` no contrato exato da nova RPC (13 argumentos). Migração aplicada (`success:true`) e conferida: `authenticated_execute=true`, `anon_execute=false`. Não alterada regra de autenticação, perfil, ciclo, escopo nem qualquer registro clínico.
- `src/features/nutrition/NutritionPage.tsx`, commit `09817d8064556db7518edee8739a8cb32cdfe702`: mensagens de bloqueio do salvamento mais explícitas; indicador “Salvando plano…” durante a chamada; exibição do erro real da RPC e tratamento de exceções com `try/catch/finally`; só declara sucesso quando a RPC retorna `success===true` e `plan_id` válido e a recarga do contexto passa; se a gravação retorna falha, não limpa nem descarta os textos digitados e não libera PDF desatualizado. Mantém bloqueio para plano pertencente a outro profissional. Nenhum outro componente, layout ou PDF alterado.
- `tests/unit/nutrition-documental-plan.test.tsx`, commit `280e83a74240600f58fffb685d2c0f8a75518892`: adequados dados de confirmação ao contrato `plan_id`; acrescentados cenários de falha RPC preservando rascunho, ausência de `plan_id` não interpretada como sucesso e bloqueio de edição de plano de terceiro.

**Teste executado de verdade no Supabase:** transação SQL com identidade da conta `manuteste` e paciente selecionado em `homologation_contexts`, invocando a RPC `save_nutrition_plan_detailed_for_interface` com os valores atuais do único plano da homologação e então **`ROLLBACK`**. Resultado devolvido: `accepted=true`, `action='updated'`, `confirmed_plan_id=true`. Nova leitura confirmou que nenhum `document_title` persistiu e nenhum plano real foi alterado. A transação de teste não criou consultas, planos nem PDFs e não contaminou dados de produção.

**Limite importante:** o teste SQL prova que a RPC consegue atualizar o plano sob o contexto de homologação quando chamada, mas **não comprova o clique no navegador, a publicação do frontend ou o funcionamento em sessão UI**. Como não se observou uma chamada HTTP à RPC nova durante as tentativas recentes, o bloqueio inicial pode envolver versão frontend servida/cached ou seleção de paciente; por isso as mensagens foram tornadas explícitas, mas a origem exata da falha de interface ainda depende da homologação autenticada. Testes Vitest incluídos, sem execução confirmada por CI nesta sessão.

**Condições preservadas:** ambiente de homologação isolado, banco de produção e pacientes reais, autoria nutricional, plano e histórico, geração de PDF documental justificado, restrições de consulta e permissões de demais perfis; nenhum ajuste no mecanismo de aviso de versão já homologado.


---

## 19/11/2026 — VERDE: regra estrutural “Uma função, um clique, uma tela” — Planejamento Alimentar

**Solicitação e autorização da Titular:** impedir que o clique no atalho **Planejamento Alimentar** ou a confirmação da consulta estenda a Home da Nutricionista com um formulário documental longo. A Home deve permanecer objetiva, com Acessos Rápidos, Agenda, Aniversariantes e demais avisos homologados. **Um clique no atalho abre uma tela própria** para o Plano Alimentar, nos mesmos moldes de navegação separada já exigidos no Cadastro. Regra de governança da interface: **“Uma função, um clique, uma tela”**. Usar como referência para alterações futuras, sem refatorar indiscriminadamente módulos já homologados. VERDE expresso concedido.

**Causa verificada no código antes da correção:** `src/features/nutrition/NutritionPage.tsx` compartilhava as seções de Home e edição do plano sob o mesmo `isNutritionProfessional`; a expressão `(!homeOnly || patientId)` permitia renderizar o formulário completo na Home após selecionar/confirmar paciente, deixando a página longa. Mesmo no módulo `/nutricao`, atalhos e Agenda eram renderizados junto ao formulário. Confirmação da agenda embutida chamava `selectNutritionPatient` na própria Home, criando expansão, embora o atalho já apontasse para `/nutricao`. Esta era a regressão de navegação a eliminar.

**Correção cirúrgica aplicada, sem banco/SQL:**
- `src/features/nutrition/NutritionPage.tsx`, commit `329a0b3e2cbcdb23d658d1d4028896d11af2bdd8`: `homeOnly` agora exibe **exclusivamente** atalhos, agenda e aniversariantes; condicionais das entregas/consulta gerencial não renderizam na Home. O módulo `/nutricao` exibe **exclusivamente** Planejamento Alimentar e recursos gerenciais já autorizados (por perfil), sem duplicar os cartões de atalhos ou a agenda. O atalho navega para `/nutricao` com `returnTo='/'`. Confirmar presença pela agenda incorporada da Home navega para `/nutricao` com o ID de agendamento e retorno à Home; o componente deixa de abrir diretamente o paciente abaixo da agenda. Já em `/nutricao`, a lógica existente revalida agendamento, especialidade e autoria no Supabase antes de carregar o mesmo paciente. Botão `Voltar` retorna à Home pelo atalho ou à agenda quando esta for a origem.
- `src/app/App.tsx`, commit `a0f93f91b7ddeb40b2e61f64a9f29613e4a263cc`: quando a presença é confirmada na rota `/agenda`, conserva a navegação existente ao módulo Nutrição, acrescentando apenas `returnTo='/agenda'` para preservar retorno ao ponto de origem.
- `tests/unit/nutrition-documental-plan.test.tsx`, commit `1dad534157cd42a4e83352a706fe9e4b79d18fe9`: rota dupla Home/`/nutricao` simulada em `MemoryRouter` com cenário de atalho → tela exclusiva → voltar e confirmação pela Home → validação do atendimento → tela própria. Testes existentes de digitação, salvamento e bloqueio de plano de outro profissional adaptados para a rota correta.

**Invariantes preservadas:** os mesmos componentes e regras valem para perfil real de Nutrição e `manuteste`; dados de teste permanecem isolados dos reais; nenhuma duplicação de banco ou de formulário; preservados RPCs de salvar/atualizar, autorizações, autoria, PDF justificado, revisão, agenda, confirmado/falta, histórico, notificações e funções homologadas dos demais perfis. Nenhuma migração ou alteração de dados nesta manutenção.

**Verificações estruturais de leitura do GitHub `main`:** 11/11 contratos de presença conferidos: condicionais Home e rota própria, gesto de atalho, navegação na confirmação, retorno à origem, revalidação profissional/situação, conservação do salvamento/PDF e atualização de testes. **Não afirmar execução de Vitest/build ou publicação Cloudflare** com base somente na leitura de código. Homologação visual em perfil Nutrição e `manuteste` pendente; confirmar Home não expandida, um clique no atalho, confirmação na agenda, preenchimento, salvamento, PDF e retorno correto.



---

## 23/11/2026 — VERDE — Assistência Social: botão “Iniciar atendimento” sem efeito no `manuteste`

**Relato e governança:** a Titular relatou estar em homologação no perfil de Assistência Social; agendou uma consulta e pressionou o botão **Iniciar atendimento**, sem conseguir abrir o acompanhamento. Autorização expressa **VERDE** concedida após o relato; antes do VERDE ocorreu apenas investigação, sem manutenção.

**Evidências observadas no Supabase:** conta `manuteste` com simulação ativa de `profissional` da especialidade **Assistência Social**. Agendamento novo da mesma especialidade em 23/11/2026 para o profissional simulado; o paciente desse agendamento tem `patients.is_test=true`, mas seu ID não corresponde ao `homologation_contexts.test_patient_id` selecionado anteriormente. Em 23/11 às 12h50 UTC os registros de gateway mostraram chamadas à RPC `update_appointment_attendance_for_interface` com HTTP **403**. A função realiza `capo_assert_patient_write_context`, que permite, para conta de homologação com contexto ativo, escrita somente quando `is_test=true` **e** ID igual ao paciente selecionado. Portanto o agendamento de teste era visualizado no contexto, mas o clique Iniciar sofria bloqueio de isolamento. Não se tratou de ausência de agenda, falta de vínculo profissional ou paciente real. A proteção não deve ser removida.

**Medidas tomadas:**
1. Sincronizado o `homologation_contexts.test_patient_id` de `manuteste` com o **paciente is_test=true da consulta de hoje**, chamando a RPC existente `set_homologation_context_for_interface` sob identidade autenticada da conta de homologação, preservando papel/profissional/especialidade simulados, fornecendo motivo explícito e produzindo auditoria própria. Nenhuma consulta ou registro clínico alterado. Essa seleção de paciente de teste é uma mudança de **contexto técnico**, não mudança de dados reais.
2. **Teste transacional efetivamente executado:** `update_appointment_attendance_for_interface` para a consulta de hoje sob o mesmo contexto retornou `attendance_status='confirmado'`, e a transação foi encerrada com **ROLLBACK**. O agendamento não ficou confirmado por esse teste, para que a Titular possa testar o clique real.
3. Em `src/features/agenda/AgendaPage.tsx`, commit `74180063f657c3d7deb739f33ee86936a4140e94`, incluída pré-validação **somente para `is_homologation_account` com perfil profissional de Assistência Social e ação `confirmado`**. Se o paciente do agendamento selecionado divergir do paciente atual no contexto, verifica primeiro `getHomologationOptions().test_patients` (somente pacientes explicitamente marcados como teste); preserva `professional_id`, `specialty_id` e `role_code`, seleciona o paciente por `setHomologationContext` com justificativa auditável, depois chama a RPC de confirmação original, sem contornar o isolamento. Para paciente não identificado, paciente real, profissional divergente ou contexto inválido, não tenta confirmar e mostra aviso orientativo. A funcionalidade **não altera** ações para perfis reais nem faltas, outros profissionais ou outras especialidades. Não foi alterada qualquer função SQL, tabela, política RLS, estrutura de agenda ou fluxo de atendimento já homologado.

**Limite:** conferência estrutural de integração no GitHub e prova SQL de confirmação sob contexto de teste realizados; não houve execução de Vitest/build de interface, publicação Cloudflare comprovada ou clique real autenticado pós-publicação. O botão na interface ainda necessita homologação operacional da Titular, inclusive para novo paciente de teste, preservando isolamento e auditabilidade.

**Regra preservada:** mesma agenda e comportamento base em `manuteste` e nos perfis reais; a sincronização automática da seleção de paciente é **exceção específica do ambiente de homologação**, para manter a invariante de escrita de paciente teste selecionado. Produção não recebe alteração de comportamento.


---

## 23/11/2026 — VERDE — Assistência Social: transporte de contexto e indicador de vulnerabilidade

**Ocorrência e autorização:** após confirmar a presença e iniciar pela Agenda, a tela de Acompanhamento Social exibiu `Resposta inválida de get_professional_appointment_context_for_interface: RPC não cadastrada na camada CAPO`. A Titular apontou também a necessidade de preservar a marcação de vulnerabilidade operacional e concedeu **VERDE** específico para esta correção.

**Investigação documental e física:** Matriz Funcional §9.2 prevê Agenda → paciente confirmado → contexto do paciente → acompanhamento, sinalizações e providências; Manual da Interface §17.1 prevê níveis verde/amarelo/vermelho, com compartilhamento mínimo e sem Estudo Social no CAPO. Em `src/features/social/SocialPage.tsx`, já existiam a abertura do paciente a partir do contexto validado, leitura e gravação de vulnerabilidade; `src/lib/supabase/rpc.ts` expunha `getProfessionalAppointmentContext` mas não incluía a operação na whitelist do `createSupabaseTransport`. As RPCs `get_social_vulnerability_indicator_for_interface` e `set_social_vulnerability_indicator_for_interface` já estavam autorizadas. A seleção iniciava indevidamente em verde antes da leitura do indicador.

**Correções cirúrgicas realizadas na branch `main`:**
1. `src/lib/supabase/rpc.ts`: acrescentado exclusivamente o caso `get_professional_appointment_context_for_interface` ao grupo existente do transporte validado, sem mudar assinatura ou segurança; commit `fca9c0c7c450b0bf7b16e313e88b3a5676bd0d29`.
2. `src/features/social/SocialPage.tsx`: indicador inicial vazio e reiniciado ao selecionar outro agendamento; leitura de nível existente continua preservada; salvar exige seleção explícita, sem assumir `verde` para paciente sem avaliação; commit `2e80e4f677933bafbdbc4c414a82b5b32c1693cf`.
3. `tests/unit/social-confirmed-appointment.test.tsx`: teste acrescido para paciente sem indicador previamente carregado, botão salvar inicialmente desabilitado e escolha/salvamento explícitos de `amarelo`; commit `f3fa4dda35d3a6a790552f89a531b1bcd319ba48`.

**Preservação:** nenhum SQL/migration/RLS/ACL ou dado de paciente modificado; acompanhamento social, familiares, luto, retorno, fechamento, nutrição e segregação produção/`manuteste` permanecem com os mesmos contratos. Não foi criada nova função ou fluxo paralelo.

**Limites de validação:** os arquivos foram conferidos por leitura estática do GitHub após versionamento. Teste de regressão escrito, mas não declarar Vitest/typecheck/build/CI/deploy Cloudflare ou clique autenticado como executados sem evidência específica. Homologação operacional pendente: confirmar Agenda → Iniciar → paciente correto e nível existente ou vazio; salvar e recarregar a classificação autorizada no `manuteste`, sem vazamento de dados reais; observar sinalização mínima para Nutrição. A atualização da whitelist não garante por si só autorização backend, que permanece independente.

**Status:** CORREÇÃO PONTUAL VERSIONADA NA MAIN; HOMOLOGAÇÃO OPERACIONAL PENDENTE.


---

## 23/11/2026 — VERDE — correção pontual de presença confirmada indevidamente: Luiz Aparecido Martinez

**Ocorrência e autorização:** a Titular informou ter clicado por engano no início/confirmação da consulta da Nutrição do paciente real **Luiz Aparecido Martinez** (profissional **Juliana Teixeira Rios Camargo**), marcada para **23/11/2026 às 13h10 (America/Sao_Paulo)**, e solicitou regularização para posterior remarcação. Autorizou expressamente **VERDE**. A consulta tinha ID `dc002413-f8b6-47af-9123-0721353da9a6`, presença `confirmado` desde 11h22 locais, sem motivo/notas de atendimento. A confirmação indevida estava preservada no histórico `audit_logs`.

**Investigação obrigatória:** a RPC `update_appointment_attendance_for_interface` aceita `confirmado`, `realizado`, `faltou` e `cancelado`, sem ação de reversão para `agendado`. A função `reschedule_appointment_for_interface` permite `confirmado` → `remarcado` apenas quando um novo horário válido é escolhido e executado por Administrativo autorizado; nenhum novo horário foi fornecido. A correção anterior de confirmação manual de pré-visita é outro fluxo e não resolve presença assistencial.

**Execução pontual e auditável no Supabase oficial:** após pré-check da identidade exata do paciente real, profissional, consulta, estado `confirmado` e timestamp da confirmação, operação transacional única restaurou `attendance_status='agendado'`, limpou os metadados de presença indevida `attendance_updated_at` e `attendance_updated_by` e manteve a data, horário, tipo, profissional, ciclo, especialidade e vínculo original. A trigger `trg_audit_patient_appointments` gravou o diff imutável de `confirmado` para `agendado`; também foi inserido evento explícito `CORRECAO_CONFIRMACAO_INDEVIDA` na tabela `audit_logs` com `old_data`, `new_data`, motivo e a autorização VERDE. Como a intervenção SQL foi feita sem sessão autenticada do usuário final, a autoria operacional não foi atribuída artificialmente; a descrição registra a autorização expressa da Titular e a natureza técnica da execução. O histórico anterior `agendado` → `confirmado` permanece intacto.

**Pós-check físico:** `patient_appointments.attendance_status='agendado'`, campos `attendance_updated_at`/`attendance_updated_by` nulos; auditoria contém o evento técnico e atualização automática, além da confirmação original. Nenhum horário novo, falta, atendimento realizado, cancelamento, mudança de agenda ou alteração em outros pacientes foi criado.

**Pendência:** atendimento ainda está **agendado para 23/11 às 13h10**. Gestor/AO deve selecionar horário efetivamente disponível e executar a **remarcação canônica**, que preserva histórico e gera o novo agendamento conforme as regras existentes. Não declarar remarcação efetuada, comunicação ao paciente, publicação, testes automatizados ou homologação de interface como realizados.

**Escopo:** correção excepcional de dado real explicitamente autorizada; sem mudança em contratos RPC, RLS, módulos homologados, frontend ou isolamento de `manuteste`.


---

## 23/11/2026 — VERDE — visualização mensal da Home profissional: sete colunas acessíveis

**Ocorrência:** a Titular enviou captura da Home da Nutrição em visualização **Mês / novembro de 2026**, com grade cortada horizontalmente após quinta-feira e mostrando inicialmente apenas as semanas de 26/10 e 02/11. Solicitou expressamente verificar impacto nos demais profissionais e deu **VERDE** para adequar todos onde o erro fosse compartilhado.

**Causa confirmada no código `main`:** `HomeScheduleGrid` em `src/features/agenda/AgendaPage.tsx` calcula corretamente 42 datas (6 linhas × 7 colunas), preservando filtro por profissional e período. O CSS posterior de `src/features/agenda/agenda-page.css`, seção §28.214, força `grid-template-columns: repeat(7,minmax(128px,1fr))` e `overflow-x:auto` tanto na semana como no mês. O mínimo total de 896 px, incompatível com a largura efetiva da Home com indicadores laterais, causa corte parcial/rolagem lateral da grade, agravado pelos cabeçalhos extensos. O componente `AgendaPage embeddedHome` é reutilizado pela Nutrição, Assistência Social e `AssistentialPage` dos demais profissionais: risco transversal. Isso não é perda de dados de agendamento.

**Alteração cirúrgica aprovada e aplicada no GitHub `main`:**
- `src/features/agenda/AgendaPage.tsx`: apenas para visualização mensal, `Intl.DateTimeFormat` usa `weekday:'short'` em vez de `long`; vistas diária/semanal permanecem inalteradas. Commit `e9efe95a2fcc179c1d34d451610afe66e9fd7576`.
- `src/features/agenda/agenda-page.css`: regras adicionais restritas a `.agenda-home-card .agenda-schedule-grid--month` sobrescrevem `minmax(128px,1fr)` por `repeat(7,minmax(0,1fr))`, `width:100%` e `overflow-x:visible`, com espaçamento compacto, títulos/ações quebrando linhas e lista interna de horários por dia com altura máxima e rolagem vertical. Inclui ajuste de espaçamento para tela até 760px. Sem mexer na vista semanal, Agenda Geral ou grades do backend. Commit `a071e84898d69feddb604ed86ec978d627c6c9f8`.

**Restrições preservadas:** calendário com 42 datas; todos os slots/horários reais continuam carregados e acessíveis, sem ocultar as ações; bloqueios, presença/falta, retorno, cancelamento e permissões permanecem intactos. Nenhuma alteração no Supabase, RLS, pacientes ou agendamentos. O mesmo componente CSS compartilhado atende às Homes profissionais de Nutrição, Assistência Social e demais especialidades.

**Validação:** leitura posterior dos dois arquivos `main` confirma as edições; consulta de status combinado do último commit não retornou verificações de CI. **Não há evidência de build, teste Vitest, publicação no Cloudflare ou inspeção autenticada visual desktop/mobile após a mudança**. Homologação pendente: Nutrição/Home/Mês de novembro exibindo segunda a domingo e 6 semanas, inclusive 23/11; conferir largura, rolagem por dia e acesso aos botões; repetir em Assistência Social, Psicologia/Fisioterapia/Clínico e telas mobile/tablet; verificar Dia/Semana inalterados. Não declarar aprovado antes do teste pela Titular.


---

## 23/11/2026 — VERDE — ampliação pontual da logo do CAPO no menu lateral

**Autorização e escopo:** Titular pediu logo institucional maior e mais visível na mesma posição do início da página após login; autorizou **VERDE**. Não alterar a logo da autenticação, PDFs ou timbres; manter o cabeçalho/sidebar homologados e a proporção do arquivo original.

**Verificação:** `src/components/shell/AppShell.tsx` usa `.app-brand img` e `src/features/gestor/GestorShell.tsx` usa `.gestor-brand img`, ambos com `/assets/capo-logo.jpg`. Os estilos tinham `width:170px;max-height:86px`; sidebars de 248px em desktop, 220px em telas menores e navegação lateral móvel.

**Correção mínima em `main`:** `src/components/shell/app-shell.css` aumentou somente a imagem do menu para `width:205px;max-width:100%;height:auto;max-height:105px`, mantendo centralização e `object-fit:contain` (commit `4dc3eade73e1ed51c2a1fb1007aa2193872e7dce`). `src/features/gestor/gestor.css` aplicou os mesmos valores à logo no menu Gestor/Titular (commit `6bc5044ca46faecaa0d34ccc93023b10582079f3`). Os limites `max-width:100%` evitam exceder o espaço disponível na sidebar responsiva; nenhuma mudança de layout, posição ou ativo de imagem.

**Verificação e limites:** releitura dos dois CSS no `main` confirmou exatamente os novos valores. Não houve alteração no banco, login, rotas, autorização, dados de pacientes, PDFs ou tela de autenticação. **Build, testes visuais autenticados (desktop/mobile) e publicação do Cloudflare não comprovados nesta etapa**; homologação visual ainda necessária.


---

## 23/11/2026 — VERDE — ampliar logo lateral para ocupar toda a largura do espaço reservado

**Solicitação e autorização:** após a ampliação inicial de 170px para 205px, a Titular relatou que a logo ainda parecia pequena e solicitou ocupação quase integral do espaço reservado no topo esquerdo do sistema; concedeu novo **VERDE** específico. Manter o mesmo lugar, não deformar a imagem nem deslocar menus e ações.

**Diagnóstico físico:** imagem `public/assets/capo-logo.jpg` verificada no GitHub: JPEG com dimensões intrínsecas **1536 × 1024 px (proporção 3:2)**. Os estilos de `.app-brand img` e `.gestor-brand img` mantinham `max-height:105px`, reduzindo a largura visual efetiva para aproximadamente 157,5px, apesar de `width:205px`; o espaço lateral ainda tinha 8px de preenchimento de cada lado.

**Correção pontual na branch `main`:** `src/components/shell/app-shell.css` commit `26c9fbbbb9535d7e9ab0c13b23c456441bcb951b` e `src/features/gestor/gestor.css` commit `a5cc1b15a6d06385af0b3b519ce27c4d46427f20`. Nas duas versões do menu, somente a marca visual passou a `width:100%; max-width:100%; min-width:0; height:auto; max-height:none; object-fit:contain`; a faixa superior teve seu padding lateral reduzido a zero e o padding inferior a 12px. A logo ocupa a largura disponível com proporção preservada, flexível também quando o botão de fechar menu estiver visível no mobile. Não foi trocado, recortado nem modificado o arquivo de imagem.

**Preservação:** larguras das sidebars, navegação, botões de fechar, logo do login, PDFs/timbres, dados e acessos no Supabase permanecem inalterados. Releitura dos dois CSS após commit confirmou as declarações. **Ainda não foram executados testes de build ou validações visuais autenticadas em desktop/mobile, nem confirmado deploy Cloudflare.** A Titular deverá homologar a percepção do tamanho da logo na interface publicada.


---

## 23/11/2026 — VERDE — especialidade profissional legível abaixo do nome no cabeçalho

**Solicitação/autorização:** Titular pediu que abaixo do nome do profissional na página inicial apareça sua especialidade em tamanho legível. Deu **VERDE** específico. Escopo restrito ao cabeçalho compartilhado; não alterar perfis administrativos, gestão, dados, agendamentos, telas clínicas, logotipos ou estrutura homologada.

**Implementação `main`:** em `src/components/shell/AppShell.tsx`, o texto `.app-user-caption` abaixo do nome usa a especialidade efetiva somente quando `primary_context.code==='profissional'`. Prioriza `primary_specialty_name`, depois especialidade marcada como principal em `specialties`, depois a especialidade única, e, quando habilitada homologação, o nome da especialidade simulada como último recurso. Se não houver especialidade validada, permanece o rótulo anterior; outros contextos (administrador/AO/coordenador) seguem exibindo o papel original. Commit `2705cfd9da24837f2a93b9a34dda22a1db442035`. Em `src/components/shell/app-shell.css`, legenda passou a fonte `0.9rem`, peso `600`, `line-height:1.35` e quebra de texto responsiva, mantendo a posição imediatamente abaixo do nome. Commit `c54186ba70c5a826357bc0e6202ba660c35a0dca`.

**Cobertura adicionada:** `tests/unit/shell-layout-contract.test.tsx` passou a verificar especialidade de Clínica Geral no contexto profissional, preservação do rótulo Administrador quando a mesma conta está no contexto administrativo, e especialidade simulada Nutrição no ambiente de homologação (commit `6d6ba6988269f324ce075e665eb1bfafeae0661e`).

**Validação/limites:** arquivos versionados no GitHub `main`, sem mudanças no Supabase. **Execução de Vitest/build, publicação Cloudflare e homologação visual autenticada não foram confirmadas nesta etapa**. Após publicação, conferir nos perfis profissionais, na Home/mobile e no contexto de homologação que a especialidade correta é exibida, sem quebra do cabeçalho.


---

## 23/11/2026 — VERDE — corrigir tamanho efetivo da especialidade sob nome profissional

**Solicitação e autorização:** após a manutenção que passou a exibir a especialidade abaixo do nome profissional, a Titular relatou que ainda ficou pequena; aprovou novo **VERDE** para exibição com fonte de 18px no cabeçalho compartilhado, mantendo posição e demais elementos.

**Causa técnica:** `src/components/shell/app-shell.css` continha uma regra antiga de cabeçalho compacto, mais abaixo da primeira definição, `.app-user-caption{margin-top:3px;font-size:10px;font-weight:400}`, que sobrescrevia o `font-size:0.9rem; font-weight:600` introduzido na manutenção anterior. Em `@media(max-width:520px)` havia também `.app-user-caption{display:none}`. Assim, a especialidade aparecia a apenas 10px em desktop e ficava oculta em telas pequenas, embora o novo valor existisse no CSS.

**Correção mínima no GitHub `main`:** `src/components/shell/AppShell.tsx` adicionou a classe condicional `app-user-caption--specialty` somente quando há especialidade validada no contexto profissional (commit `7910ae9a58f59b968f413cb9469a2e943d011e6f`). `src/components/shell/app-shell.css` ganhou, ao final do arquivo, uma regra mais específica `.app-user .app-user-caption--specialty` com `display:block; font-size:18px; font-weight:600; line-height:1.25` e quebra responsiva (commit `c88ad3cb9929db009da56de8f03d7d7a3f0e235c`). Isso prevalece sobre a regra legada de 10px e o ocultamento em mobile sem alterar o rótulo de papel dos perfis administrativos. Nenhuma alteração em dados ou permissões.

**Cobertura:** assertions em `tests/unit/shell-layout-contract.test.tsx` passam a verificar a classe exclusiva da especialidade em Clínica Geral e Nutrição de homologação, e sua ausência no contexto Administrativo (commit `2cfed784ad3d54335d479b40d04bc0fec6311c63`).

**Verificação/pendências:** alterações realizadas em arquivos versionados no `main`. **Execução de testes Vitest/build, deploy Cloudflare e homologação visual autenticada desktop/mobile ainda não confirmados**. Testar o tamanho real da especialidade abaixo do nome em Nutrição e outros profissionais e preservar a hierarquia do cabeçalho.


---

## 23/11/2026 — VERDE — saudações automáticas e forma de tratamento no cadastro profissional

**Autorização e redação final:** Titular aprovou VERDE para substituir o “Olá” fixo da Home por cumprimento automático conforme o horário de Brasília e para permitir ao Gestor/Titular escolher no cadastro a forma de tratamento feminino, masculino ou não informado. Posteriormente esclareceu expressamente a redação final: “Seja bem-vindo ao sistema de agendamento do CAPO” / “Seja bem-vinda ao sistema de agendamento do CAPO”. A saudação completa é “Bom dia!/Boa tarde!/Boa noite! Seja bem-vindo(a) ao sistema de agendamento do CAPO.” Para tratamento não informado: “Bom dia!/Boa tarde!/Boa noite! Boas-vindas ao sistema de agendamento do CAPO.”

**Banco Supabase oficial:** criada a coluna `public.professionals.greeting_treatment` do tipo texto anulável, com CHECK restrito a `feminino`, `masculino` ou NULL. Os 13 cadastros existentes permaneceram com NULL (nenhum gênero atribuído por presunção). Criadas as funções `get_professional_greeting_treatment_for_interface(uuid default null)` e `set_professional_greeting_treatment_for_interface(uuid,text)`, com autenticação, termo vigente, contexto efetivo da homologação para leitura de si mesmo, e alteração de terceiros exclusiva para papel administrador ativo. `anon` sem EXECUTE, `authenticated` com EXECUTE condicionado às verificações internas. SQL versionado em `supabase/migrations/20261123163000_professional_greeting_treatment.sql`, commit `6a8691e4b0280674d854a507ec371711e2e669a9`, e executado no banco oficial. Consultas posteriores confirmaram CHECK e grants.

**Interface:** `src/lib/supabase/rpc.ts` dispõe operações de leitura/gravação da preferência (commit `34e9f8a95113d55b4c951d838ece3782abd3c3f4`). Em `src/features/gestor/GestorTeamPage.tsx`, o formulário de cadastro/edição contém seletor “Forma de tratamento na saudação” (não informado/feminino/masculino), lê a escolha para profissional existente e a salva e verifica em operação específica após concluir o cadastro principal; serviços injetáveis para preservar testes existentes (commits `d4579ebd9e0faa6e5828ec80030c4209fdd81905`, `65d39c113b28fd485b3f18fd17b89166bf171bc5`, `9a3e423494b7da0cce6f35520e9357f8c1106d47`). Se o salvamento da preferência não for confirmado, a interface não declara êxito completo. A confirmação do cadastro e a preferência são duas operações diferentes.

**Saudações:** `src/components/shell/useCapoGreeting.ts` implementa leitura da escolha do profissional efetivo, saudação pela hora local convertida para America/Sao_Paulo (até 11h59 Bom dia, até 17h59 Boa tarde, após 18h Boa noite), atualização periódica a cada 60 segundos, fallback neutro e textos finais aprovados (commits `00de28a04abff2c7c9a15b0142d3e872fd19efd1`, `6ee628bb77fa51806c5bbc35d6410575f039436e`, `48a89aec3b624c1295d22d9226484d4378240c13`). `src/components/shell/AppShell.tsx` e `src/features/gestor/GestorShell.tsx` passaram a exibir cumprimento dinâmico no mesmo local, inclusive perfis de gestão (commits `0c276237e549671c4df35401873ce6a4d699e871`, `1317a5cca074f765131a708e08b92a06e00518e3`). Não foi alterada a mensagem institucional secundária nem os elementos visuais da Home.

**Testes e limites:** adicionados casos unitários para manhã/tarde/noite, masculino/feminino/neutro e atualizada a expectativa textual em `tests/unit/App.test.tsx` (commits `62d4ea7eda1414b75c911476d4e4ef789491a142`, `45f244d011982c15bb8367dccba4bd260b0fb857`). Não há comprovação nesta manutenção de execução de Vitest/build, publicação Cloudflare ou teste autenticado dos fluxos de cadastro e Home. A seleção continua pendente para os cadastros atuais, e isso é intencional. Não declarar homologado antes da validação funcional.


### 23/11/2026 — ajuste de capitalização da saudação institucional

A Titular especificou a denominação **“Sistema de Agendamento do CAPO”** para o texto das boas-vindas. Mantidas as variantes autorizadas “Seja bem-vindo”/“Seja bem-vinda”, a forma neutra para ausência de configuração e o cumprimento automático conforme o horário. Alterado apenas o texto nas strings de `src/components/shell/useCapoGreeting.ts` (commit `b815826aa444b6b850ab590fa0eef5755b9e623b`) e nas expectativas dos testes `tests/unit/capo-greeting.test.ts` (commit `feb68412c42d926dcb30ea7384585c54eee56e18`) e `tests/unit/App.test.tsx` (commit `36dcb4e17090815b85ad234fe2fad286b580366c`). Nenhuma alteração de banco ou comportamento. Publicação e homologação seguem sem confirmação.


---

## 23/11/2026 — VERDE — ajuste visual da saudação com girassol natural

**Escopo autorizado:** após aprovar a representação de um girassol natural no modelo visual, a Titular autorizou **VERDE** para diminuir “Bom dia!/Boa tarde!/Boa noite!” (18px), dispor “Seja bem-vinda/bem-vindo ao Sistema de Agendamento do CAPO.” na linha seguinte com fonte menor (16px), ampliar “Tenha um ótimo dia de trabalho!” para aproximadamente 17px, e incluir o girassol. **Proibição expressa:** não mexer no coração nem na posição, tamanho, estilo ou texto de “Cuidar hoje. Mais possibilidades amanhã.”. Ajuste exclusivamente visual: não resolve, neste VERDE, eventual gravação da forma de tratamento dos profissionais.

**Arquivos versionados na branch `main`:** `public/assets/capo-girassol-natural.svg` contém a miniatura do girassol natural recortado da referência visual aprovada, em imagem incorporada ao SVG, sem dependência de URL externa (commit `e733330d8f5c93a2c9f7db3e1f825117687cc20c`). `src/components/shell/AppShell.tsx` (commit `9d692b550110ba9bdefaaab80b2ed6d7fd491502`) e `src/features/gestor/GestorShell.tsx` (commit `f6a78a9451a3c8d796a6e56a491758a9e7af6ce7`) dividem a saudação automática já existente em duas partes (“Bom dia!” e texto bem-vindo[a]) usando spans dentro do heading original, preservam a mensagem de trabalho com ponto convertido para exclamação e acrescentam imagem de girassol decorativa com texto alternativo vazio. Não houve modificações no JSX do coração nem do lema.

**Estilização:** `src/components/shell/app-shell.css` (commit `929f5fbb16a0b2b65d5a2e7af1f6b1f08023b89d`) e `src/features/gestor/gestor.css` (commit `70c50246868506aff555291606b3fd6cc7680cb1`) acrescentam estilos APENAS ao texto da saudação, com primeira linha 18px, segunda 16px, mensagem de trabalho 17px (16px em mobile), girassol 30×39px, quebra de linha e `min-width:0` para respeitar o espaço disponível. As regras `.app-welcome-heart`, `.gestor-welcome-heart`, `.app-slogan-approved` e `.gestor-slogan-approved` não foram alteradas.

**Verificação:** reconsulta ao GitHub `main` confirmou ambas as Homes apontando para o mesmo recurso do girassol, CSS correspondente, e conteúdo literal do slogan preservado. A hora, as formas de tratamento e suas permissões não foram alteradas. **Build, testes automatizados, deploy Cloudflare e conferência visual com navegador autenticado não foram executados/confirmados nesta etapa.** Testar na Home dos profissionais e Gestor/Titular, em desktop/mobile, antes de homologar. O problema independente relatado anteriormente de tratamento neutro após atualizar cadastro não integra esta autorização visual e permanece por verificar/corrigir mediante autorização específica.


---

## 23/11/2026 — VERDE — desbloqueio do salvamento da forma de tratamento no cadastro

**Ocorrência e autorização:** Titular informou que o novo seletor de forma de tratamento para a saudação no cadastro profissional não estava salvando e, após diagnóstico, autorizou **VERDE** expresso para correção pontual. Já estava demonstrado que os 13 registros profissionais consultados no Supabase ainda apresentavam `greeting_treatment IS NULL` e, por isso, a Home continuava neutra. Não se presume gênero pelo nome nem se atualiza nenhum cadastro real sem seleção efetiva.

**Causa confirmada:** `src/lib/supabase/rpc.ts` já expunha `getProfessionalGreetingTreatment` e `setProfessionalGreetingTreatment`, e as duas funções correspondentes existiam no Supabase, com permissões restritas. Entretanto, `createSupabaseTransport` emprega um switch de RPCs explicitamente liberadas e **não continha** `get_professional_greeting_treatment_for_interface` nem `set_professional_greeting_treatment_for_interface`. A chamada era recusada como `RPC não cadastrada na camada CAPO` antes de chegar ao banco. O formulário `GestorTeamPage.tsx` já tratava o sucesso/erro e tinha leitura e gravação implementadas; a falta de transporte impedia o fluxo.

**Correção no GitHub `main`:** incluídas exclusivamente essas duas operações no grupo de RPCs confirmadas de `createSupabaseTransport`, imediatamente antes da consulta de endereço profissional; a função de transporte foi exportada para permitir seu teste direto. Nenhuma mudança nas regras do Supabase, nas funções de banco, nos dados de profissionais, nas demais permissões ou no layout visual da saudação. Commit `247707e607ad4b0736d69ae398cf0bfe716d08ba`.

**Regressão:** `tests/unit/supabase-rpc.test.ts` ganhou casos com transporte real da camada CAPO e cliente Supabase simulado verificando encaminhamento de leitura, gravação `feminino` e opção neutra `null`, com retorno `success`. Commit `06d9bcb96753b9c0f4d531ca01f08ba7f3cc9a45`. Releitura dos arquivos `main` confirmou a presença dos dois `case`s, testes e fluxos já existentes no formulário.

**Limites de validação:** **não foi realizado teste autenticado real de salvar/reabrir o cadastro no navegador nem execução de Vitest/build; publicação no Cloudflare também não foi comprovada nesta etapa.** A ausência de alteração de dados nesta manutenção é intencional. Após publicar, selecionar Feminino ou Masculino em um profissional real pelo Gestor/Titular, salvar, fechar/reabrir o cadastro e conferir a Home do próprio profissional, inclusive após recarregar a página. A lógica do banner, girassol, coração, lema “Cuidar hoje. Mais possibilidades amanhã.” e agendas permaneceu inalterada.


---

## 23/11/2026 — VERDE — gravação independente da forma de tratamento do profissional

**Relato e autorização:** mesmo após liberação das RPCs da forma de tratamento, a Titular informou que selecionar Feminino/Masculino no cadastro de profissional ainda não persistia. Após investigação, concedeu **VERDE** para corrigir o fluxo isolado, sem alterar dados profissionais de produção, rotinas assistenciais, agendas, permissões, ícone de girassol, coração ou lema institucional.

**Evidências anteriores à correção:** consulta somente leitura à tabela `public.professionals` retornou 13 registros com `greeting_treatment IS NULL`. Consultas agregadas aos logs recentes do Supabase mostraram RPCs de leitura `get_professional_greeting_treatment_for_interface` com HTTP 200, mas nenhuma chamada POST identificada para `set_professional_greeting_treatment_for_interface` no período examinado. Leitura do formulário confirmou que a gravação da preferência estava na cauda do `saveProfile`, depois de validação geral, atualização cadastral, credenciais e endereço: operações independentes podiam interromper a operação antes de chegar à preferência.

**Correção pontual em `src/features/gestor/GestorTeamPage.tsx`:** foi introduzido o comando `Salvar forma de tratamento` (somente para profissional selecionado existente) com `type=button`, desvinculado do envio do formulário cadastral completo. Realiza `setGreetingTreatment(professionalId, escolhido)` e depois `getGreetingTreatment(professionalId)`, só informa sucesso quando a leitura do banco coincide com a escolha; erros explicitamente apresentados e operação protegida contra duplo clique. Se o usuário alterar unicamente o seletor e acionar o botão geral `Salvar alterações`, a operação é encaminhada ao mesmo fluxo isolado antes das demais validações. A leitura é renovada ao selecionar/reabrir o mesmo profissional, e o estado da escolha persistida é distinguido do valor ainda não salvo. Commit principal `181838e73e7087129cee00c9a3bacdfc00de285d`; ajuste de releitura `eb1bb3a4b2b980043848d858149efc5dca1f29fc`.

**Testes de regressão:** `tests/unit/gestor-team-page.test.tsx` possui casos de persistência isolada com leitura posterior e confirmação, ausência de chamada à atualização geral do perfil, reapresentação da escolha e falha de gravação sem falso positivo (commits `a17f775669880517b7719b9653fa3018fc0e64aa` e `81ea33110d421b1d37c5aa12a1edf1d8bde838ea`).

**Restrições e homologação:** nenhuma escrita em registro de profissional real foi feita durante a manutenção; o formato do campo e as funções do banco permanecem os mesmos. **Ainda não foi confirmado build/Vitest, publicação no Cloudflare, execução autenticada de clique/salvamento no navegador, nem uso final na Home de profissional.** Homologar pelo Gestor/Titular: selecionar profissional → alterar forma de tratamento → `Salvar forma de tratamento` → mensagem de sucesso após releitura → selecionar novamente profissional → observar escolha persistida → entrar na Home desse profissional e conferir a concordância. Não marcar como homologado antes do teste funcional.


---

## 23/11/2026 — VERDE — restauração do tamanho original do lema institucional

**Autorização:** Titular solicitou que “Cuidar hoje. Mais possibilidades amanhã.” voltasse ao tamanho e à proximidade originais do coração, sem modificar a saudação, girassol ou demais componentes; concedeu VERDE.

**Diagnóstico:** nos arquivos `src/components/shell/app-shell.css` e `src/features/gestor/gestor.css` havia uma regra original `.app-slogan-approved` / `.gestor-slogan-approved` com fonte **23px**, `min-width:310px`, `padding-right:28px` e responsividade de **20px** abaixo de 820px, mas um bloco posterior sobrepunha a fonte com **18px**, `min-width:255px` e `padding-right:10px`. Esse sobrescrito diminuía o lema e alterava sua ocupação de espaço junto ao coração.

**Correção pontual:** removidos somente os blocos CSS posteriores de sobrescrita do lema, fazendo prevalecer os estilos originais de 23px (20px em tela intermediária). O coração, seu posicionamento `right:31%`, `top:-10px`, formato e cor não foram alterados. Também não houve modificação no JSX da saudação, no girassol ou nas funções de cadastro. Commits `879e776ede2f9cc8568ce4cf34d0972940affd7d` e `2b6db240e75278dafda694d9556e118e3f292eeb`, na branch `main`.

**Validação:** comparação e alteração dos arquivos do GitHub concluída. Não há confirmação, nesta etapa, de publicação do Cloudflare ou verificação visual autenticada; conferir Home profissional e Gestor/Titular em desktop e mobile antes da homologação.


---

## 23/11/2026 — VERDE — remarcação e cancelamento direcionados da Home para a Agenda

**Ocorrência:** após correção de confirmação manual registrada por engano, a Titular relatou que não conseguia remarcar nem cancelar a consulta do paciente Luiz Aparecido Martinez na agenda de Nutrição. Investigação read-only em 23/11 identificou consulta original do dia 23/11/2026, 13h10–14h10, situação `agendado`, profissional Juliana Teixeira Rios Camargo, com ciclo assistencial `ativo`, especialidade vinculada ao ciclo, e confirmação anterior `confirmou` seguida da correção `correcao_pendente`. A consulta específica não foi alterada nesta manutenção.

**Diagnóstico funcional:** na Home administrativa, `DailyTeamAgendaRows.tsx` ocultava/desabilitava a remarcação quando a confirmação prévia era positiva ou a consulta auxiliar dos avisos apresentava erro. Isso não deve impedir uma ação administrativa sobre um agendamento ainda ativo, pois a validação canônica é feita pela Agenda/banco. A navegação `home_reschedule_appointment` em `AgendaPage.tsx` identificava paciente, profissional e agendamento, mas deixava `movementKind` vazio, exigindo escolha manual adicional; `home_cancel_appointment` preparava o formulário mais abaixo na página, sem trazê-lo à visualização. Os comandos exigem ação humana, e não executam mutações automáticas ao navegar.

**VERDE autorizado:** corrigir pontualmente ambos os comandos para todos os pacientes preservando histórico, isolamentos e proteções, sem cancelar/remarcar Luiz automaticamente.

**Alterações na branch `main`:**
- `src/features/home/DailyTeamAgendaRows.tsx`: habilita encaminhamento “Remarcar” para slots ativos `agendado` com agendamento e paciente/familiar, independentemente do resultado de aviso/confirmação prévia e de falha de consulta auxiliar. A Agenda segue aplicando controles administrativos, elegibilidade e vagas; preservar “Confirmar” como ação separada. Commits `4f544db737fca8a9c20643b9a0d31db24ead5d00` e `529c41eb3aad061ee75cc5f8bc4988c84db69519`.
- `src/features/agenda/AgendaPage.tsx`: origem `home_reschedule_appointment` seleciona por padrão a movimentação `remarcacao` e mantém a consulta original selecionada; ao abrir remarcação ou cancelamento o formulário correspondente recebe referência e é trazido à área visível via `scrollIntoView` (compatível com ausência da API em teste); cancelamento continua exigindo motivo com mínimo de 5 caracteres e confirmação explícita. Fluxos existentes, histórico, escolha de novo horário e WhatsApp não foram alterados. Commits `367751310469addf8196c212905ba8b19fad649d` e `de055a27f72da6999c261fd5772f13a1d62d9fff`.
- Testes de regressão escritos em `tests/unit/daily-team-agenda.test.tsx`: confirmação prévia via link deixa a remarcação disponível; `correcao_pendente` não impede remarcação nem cancelamento; familiar mantém sua rota canônica. Commit `8725e95f74d565b0a179acb9ef2b116e0ab364d5`.
- Testes de integração da página escritos em `tests/unit/AgendaPage.test.tsx`: entrada com navegação da Home abre a remarcação pré-selecionada sem efetuá-la e cancelamento abre com confirmação desabilitada até informar motivo. Commit `dd909c87a4250b8c378769e233867e1187cc68a6`.

**Verificação:** arquivos do GitHub reconsultados em `main` confirmam a presença das alterações e dos casos de teste. **Execução do Vitest, build, publicação Cloudflare e operação autenticada de ponta a ponta não foram confirmadas**. O banco não recebeu escrita, e a situação da consulta do Luiz não foi alterada. Homologação requer navegar pela Home Gestor/Titular (e AO), acionar Remarcar e Cancelar em consulta ativa real sem confirmar ação final, conferir paciente, profissional, data e tipo de movimentação; realizar gravações somente se forem ações reais autorizadas. Conferir responsividade mobile e que nenhuma confirmação prévia indevidamente desabilita a remarcação.


---

## 23/11/2026 — VERDE — identificação visual dos intervalos da sexta-feira na Psicologia

**Solicitação e VERDE:** a Titular não conseguia criar/visualizar o bloqueio de almoço às sextas-feiras na agenda mista da psicóloga Scheilla Maria Beraldo Nadalini e exigiu preservação integral dos itens já corrigidos, testados e homologados. Foi autorizada somente correção cirúrgica da apresentação/seleção dos intervalos, sem reconstrução de agendas, grupos, bloqueios ou remanejamentos. Antes da mudança, foram conferidos o Manual Técnico Integrado v5, Documento Mestre, código atual e banco Supabase.

**Prova física read-only:** configuração ativa da sexta-feira `1f320285-2d2a-403b-ac99-c7cb75837549`, vigência desde 12/11/2026, 08h10–17h10, `weekday=5`; bloqueio recorrente `f38a95fb-ab08-4711-bd1b-4ce4925cbe8d`, tipo `alimentacao`, 12h00–13h30, ativo; grupo `arte terapia`, 13h30–17h00, ativo e 8 vagas. Terça-feira utiliza configuração separada `7174bc50-7ccc-4efe-8044-bcfa6c63622f`. Uma imagem anteriormente enviada correspondia à terça-feira 24/11/2026. A RPC `get_agenda_configuration_for_interface` já inclui blocos por configuração, e `save_agenda_recurring_interval_for_interface` rejeita sobreposição: não era adequado criar um segundo almoço, alterar a função homologada ou gravar algo no banco. A grade e a RPC de disponibilidade já escolhem a configuração pelo dia da semana.

**Diagnóstico na interface:** `OwnAgendaManager.tsx` selecionava por padrão a primeira configuração ativa (terça), de modo que os intervalos da sexta não apareciam na lista até trocar manualmente o padrão. Um novo almoço sobreposto era rejeitado corretamente pelo banco, mas a interface não orientava a escolher o dia e identificar a existência do bloqueio.

**Mudança mínima na branch main:** `src/features/agenda/OwnAgendaManager.tsx` commit `0e29839f28d7480c64ed0135111f4d406adde3be` acrescentou `Consultar intervalos do dia` (Segunda a Domingo), que seleciona a configuração ativa do dia com início de vigência mais recente; mostra nome resumido do padrão, horários, quantidade de intervalos e aviso `Almoço já cadastrado neste padrão`; a lista de intervalos existentes permanece íntegra. Antes de enviar um novo intervalo semanal, detecta localmente sobreposição com os intervalos já retornados para o padrão/dia escolhido e apresenta horário e tipo já registrados, sem duplicar. Validações/autorizações do banco permanecem autoridade final. A escolha de um ou vários dias de aplicação, as funções de gravação e a composição da agenda mista não foram alteradas.

**Regressão proposta:** `tests/unit/OwnAgendaManager.test.tsx` commit `204e9cafaa00dff674b8cc866cd52b4a11013e78` inclui teste com configurações de terça e sexta, almoço existente e grupo adjacente; confere seleção de sexta, exibição de almoço e não envio de gravação duplicada.

**Limites de verificação:** releitura do GitHub `main` confirmou componentes e teste incluídos. Não houve escrita SQL em registros de produção nem mudança no grupo ou nos participantes. **Ainda não foi comprovada execução de Vitest/build, deploy Cloudflare ou homologação autenticada visual na sexta-feira 27/11/2026.** Para homologar: Gestor/Titular → configuração de agenda da Scheilla → `Consultar intervalos do dia` → `Sexta-feira` → conferir almoço existente 12h–13h30 e grupo de 13h30–17h; não clicar em qualquer operação de remoção ou gravação de pacientes. Conferir também que terça mantém seus intervalos separados.


---

## 23/11/2026 — VERDE — busca e agendamento de Familiar/Cuidador na Agenda

**Solicitação e VERDE:** a Titular informou que familiares/cuidadores anteriormente cadastrados não eram encontrados na busca de pacientes em `Agenda → Novo Agendamento`, apesar de correção anterior, e autorizou correção definitiva sem regressão, seguindo o Manual Base/Técnico v5 e o Documento Mestre. Deve permanecer a identidade própria do familiar, vínculo com o paciente oncológico, porta de entrada Psicologia, proibição de atendimento pelo psicólogo que acompanha o paciente vinculado, agenda oficial compartilhada, notificações e WhatsApp.

**Diagnóstico físico (antes do reparo):** `AgendaPage.tsx` chamava exclusivamente `searchReferralPatients` na busca de novo agendamento; a RPC segura `search_family_caregivers_in_patient_search_for_interface` já existia no Supabase e era usada na busca geral de pacientes, mas não na Agenda. A criação ordinária `createAppointment` requer `patient_id` de `patients`, que **não corresponde** a `family_member_id` do familiar. Agendamento familiar já possui a RPC canônica `create_family_psychology_appointment_for_interface`, fila `family_psychology_waiting_list`, retorno familiar `create_family_psychology_return_for_interface`, profissionais elegíveis e disponibilidade compartilhada. Amostra apenas agregada do banco antes da intervenção: 6 familiares, 5 vínculos ativos, 4 consultas familiares, 4 itens de fila `scheduled` e zero `waiting`; não modificar esses dados reais.

**Correção autorizada e aplicada ao Supabase:** migration `family_agenda_booking_context_scoped_20261123`, espelhada em `supabase/migrations/20261123190000_family_agenda_booking_context_scoped.sql` (commit `07de74e342c758f9389725d0058a273e8e3d0c52`). Nova RPC somente leitura `get_family_agenda_booking_context_for_interface(uuid)`: valida sessão e termo, conta ativa, perfil Gestor ou AO, visibilidade de familiar e paciente no contexto e vínculo ativo; retorna identidade própria, vínculo, situação da fila e última consulta familiar no escopo, sem trocar UUIDs ou expor dados de outro contexto. `EXECUTE` confirmado para `authenticated`, negado para `anon`. Nenhuma tabela nem registro real foram alterados.

**Frontend em `main`:**
- `src/features/agenda/AgendaPage.tsx`, commits `8448a9ad474c64bf747f7a1e281d8c44400af350` e `18ebb261c30bb83ec6c69c32b7022bbb8ba23230`: pesquisa em paralelo pacientes ordinários e familiares pela RPC já existente; mostra os dois tipos separados e com CAPO/CMS e paciente vinculado. Preserva ambiguidade quando nome de paciente e familiar coincide, evitando seleção automática errada. Ao selecionar familiar, não preenche `appointmentPatientId`, direciona a especialidade Psicologia, mantém mesmo seletor de profissional e vagas da Agenda e não permite invocar `createAppointment` convencional; usa painel familiar próprio.
- `src/features/agenda/FamilyAgendaBookingPanel.tsx`, commits `6b1602b7516a4a0380c1c703611e6e5dce9cce2f` e `5c950b71fa4b854aa0b17fdec7a4ba09a5b261f0`: consulta contexto autorizado; quando houver agendamento ativo, informa data sem criar duplicidade; quando consulta anterior permitir retorno, reutiliza `FamilyPsychologyReturnAction` e a RPC de retorno existente; para fila `waiting` valida primeiro candidato elegível/prioridade e vaga na RPC de fila, só então chama `createFamilyPsychologyAppointment`, que grava na agenda oficial, preservando a proibição de psicólogo incompatível; familiar sem fila pode ser incluído mediante clique explícito pelo contrato existente; disponibiliza acesso à fila canônica `/fila`; após gravação, prepara aviso de primeira consulta de Psicologia via mesma aba WhatsApp CAPO, com verificação de telefone/endereço e mensagem sem envio automático. Sem criação de nova agenda, nem novas inserções pela navegação.
- Regressões novas em `tests/unit/family-agenda-booking.test.tsx` (commit `9977cd5cac3c5d39a17b1c7991df67ce87dbc06a`): consulta familiar já ativa não é duplicada; prioridade incorreta bloqueia criação; elegível envia ID da fila à RPC própria; atendimento realizado utiliza o fluxo de retorno.

**Proteções e limites:** não houve INSERT/UPDATE/DELETE sobre pacientes, familiares, consultas, agenda ou fila reais; não foram alteradas as funções de grade, bloqueio, grupo, remanejamento, notificações, histórico ou isolamento de homologação. Banco recebeu somente a nova RPC de leitura. Todos os novos agendamentos exigem ação explícita e são sujeitos aos bloqueios transacionais existentes. Teste de permissões da nova RPC confirmado via `has_function_privilege`. Inspeção dos arquivos GitHub `main` concluída; **execução efetiva do Vitest/build, Cloudflare deploy e teste autenticado de ponta a ponta ainda não comprovados**. Homologar em perfil Gestor/AO: pesquisar familiar pelo primeiro nome (mínimo 3 letras), CAPO/CMS; selecionar resultado tipo familiar; confirmar que histórico `agendado` não permite duplicar, primeira consulta utiliza fila + psicólogo elegível + vaga, retorno utiliza ação própria, consulta aparece na grade oficial e WhatsApp só é preparado após gravação.


**Complemento de prevenção de regressões (23/11/2026):** commits `c96683125d58db92634a56877993b6445e45d8ae`, `fddf4762df7e3883905b4b14bd9a59684d02f1bf` e `4cd0abeaf2c4479505814b2f30ad838f025472ab`: o agendamento familiar mantém a observação administrativa, oferece navegação para consulta já existente na agenda oficial, trata fila pausada sem inserir item duplicado, diferencia erro de aviso de erro de gravação e preserva a seleção por identidade ao trocar familiar. Contrato tipado `src/types/database.ts` atualizado para reconhecer a nova RPC (commit `5b5d953c15d4c54218cfcdaada58468fb1bb9822`). Confirmado por SELECT após as mudanças que permanecem 6 familiares, 5 vínculos ativos, 4 consultas familiares e 4 registros de fila. A correção e os testes foram escritos, mas a execução de build/Vitest e o fluxo autenticado no Cloudflare permanecem pendentes de confirmação; não declarar homologação.


---

## 23/11/2026 — VERDE — retorno do familiar na vaga da Agenda Geral sem alterar primeira consulta

**Regra homologada e protegida:** Titular confirmou que criação de vínculo familiar/cuidador, entrada automática na fila de Psicologia e primeiro agendamento pela fila já foram testados e estão homologados. Proibido alterar esse fluxo, prioridades, elegibilidade, ligação familiar-paciente ou seus dados. O novo VERDE autorizou **somente o agendamento normal de retornos** de familiar/cuidador pela vaga previamente clicada na Agenda Geral, preservando a possibilidade de retorno pelo próprio psicólogo e a existência de históricos com novos vínculos.

**Conferência:** Manual Técnico Integrado v5 e Documento Mestre reabertos; `AgendaPage.tsx` possuía pesquisa específica de familiar, porém o campo Tipo mostrava apenas `Familiar/Cuidador — Psicologia` e a ação de retorno dentro de `FamilyAgendaBookingPanel` chamava um formulário separado de nova data/vaga, ignorando a vaga previamente selecionada. O componente existente `FamilyPsychologyReturnAction` e a RPC já homologada `create_family_psychology_return_for_interface(p_previous_appointment_id, p_slot_start)` permitem retorno administrativo e profissional somente após atendimento familiar `confirmado` ou `realizado`, validam disponibilidade e incompatibilidade de psicólogo, e gravam a consulta na mesma agenda com referência à anterior. No `HomeScheduleGrid`, o psicólogo já tinha a ação `Agendar retorno` ligada à consulta familiar, que foi mantida.

**Ajustes mínimos, sem SQL de escrita ou alterações em funções existentes:**
- `src/features/agenda/FamilyPsychologyReturnAction.tsx` commit `b23f2875194b6781d2b293f9b232cf5f8fb0d8d9`: opção `presetSlot` para usar diretamente a vaga selecionada da Agenda Geral, com botão padrão `Confirmar agendamento`; sem `presetSlot`, permanece a ação profissional original `Agendar retorno`, com busca de data e horário próprios.
- `src/features/agenda/FamilyAgendaBookingPanel.tsx` commit `ad4adee8053a42b6a957924d62efcd30d1622bf3`: comunica ao formulário se é `Retorno`, consulta ativa ou `Primeiro atendimento — fila de Psicologia`; somente para retorno de consulta elegível, profissional da consulta anterior selecionado e vaga válida, oferece `Confirmar agendamento` dentro do mesmo formulário da Agenda. Quando profissional for diferente ou não houver vaga, exibe instrução sem gravar. Fluxo de primeira consulta pela fila **não foi modificado**.
- `src/features/agenda/AgendaPage.tsx` commit `a7f6a6937962c06a93dde4d447c3738d8440c450`: passa a exibir o tipo real proveniente do contexto familiar no campo `Tipo`, preservando os campos e vaga já selecionados.
- `src/types/database.ts` commit `27e6c246bea54761a40952b7b9007140a5ec50c3`: declara a assinatura tipada da RPC familiar de retorno **já existente**, sem alterar função no banco.
- `tests/unit/family-agenda-booking.test.tsx` commit `7ca2896c68f6769edd044fab2efa284066a31bbc`: novos casos de retorno com vaga selecionada e psicólogo incompatível.
- `tests/unit/family-agenda-return-preset-slot.test.tsx` commit `f8c1e5b2d3a0a220c02a930b2f7cb831a966a445`: testa envio exato de consulta familiar anterior + vaga à RPC de retorno, preservação da ação antiga do profissional e bloqueio antes de consulta elegível.

**Sem regressões intencionais:** não foram alteradas `family_psychology_waiting_list`, `patient_family_links`, `family_members`, consultas reais, tabelas de agendamento, agenda recorrente, bloqueios, grupos, notificações, WhatsApp ou isolamento de homologação. Não foi criada agenda paralela; a RPC de retorno existente continua a única autoridade para salvar. **Não há execução de Vitest, TypeScript/build, Cloudflare deploy, nem homologação autenticada comprovados nesta interação**; não declarar testado/aprovado em produção sem confirmação da Titular. Homologar com Gestor/AO: clicar vaga livre na agenda oficial, pesquisar familiar com atendimento `realizado` ou `confirmado`, escolher psicólogo anterior, conferir `Tipo = Retorno` e `Confirmar agendamento`, verificar registro e mensagem; com psicólogo: na consulta familiar, `Agendar retorno`, conferir data/vaga e funcionamento inalterado. Não realizar agendamentos reais por testes automáticos.

---

## 23/11/2026 — VERDE — consolidação cirúrgica do retorno Familiar/Cuidador com preservação da primeira consulta

**Definição funcional da Titular:** familiar/cuidador cadastrado pelo Gestor/Titular ou Assistência Social, sempre vinculado ao paciente oncológico, com CAPO próprio, especialidade Psicologia exclusiva, vedação ao psicólogo que acompanha o paciente de origem; primeiro agendamento permanece na fila de Psicologia (homologado); os agendamentos seguintes, retornos, remarcações e avisos devem seguir o padrão do paciente oncológico, respeitada a identidade familiar própria. Psicólogos não têm celular institucional: retorno é agendado pelo profissional e aviso fica com Administrativo.

**Diagnóstico confirmado, somente leitura:** no Supabase, os quatro agendamentos familiares existentes estavam com `attendance_status='agendado'`, sem retornos. `create_family_psychology_return_for_interface` exige `confirmado` ou `realizado`; `FamilyAgendaBookingPanel` classificava também consultas passadas ainda `agendado` como consulta ativa, impedindo continuação. Esses dados não provam que consultas ocorreram e NÃO devem ser confirmados automaticamente.

**Correções autorizadas na branch `main`:**
- `src/features/agenda/FamilyAgendaBookingPanel.tsx` commit `11acd795eba9a09b6fbc23f318b03425fec5b4e2`: distingue consulta agendada futura de consulta passada ainda não confirmada; para esta última apresenta **Confirmar presença da consulta anterior**, ação EXPLÍCITA do usuário autorizado que chama a RPC existente `update_family_psychology_attendance_for_interface`; após confirmação validada, consulta o contexto atualizado e disponibiliza retorno na vaga escolhida. Se não houve comparecimento, instrui falta/remarcação, sem falsa presença; impede reinserção indevida na fila, preservando primeira consulta homologada.
- `src/features/agenda/FamilyPsychologyReturnAction.tsx` commit `66b83fe6d2f0584201164ee5137c6bf7e0fe0e7d`: propriedade aditiva `notifyAdministrativeOnly`; quando ativada, após criar retorno, a ação profissional não abre WhatsApp e informa encaminhamento ao Administrativo. Administração mantém ação existente de preparar comunicação.
- `src/features/agenda/AgendaPage.tsx` commit `1385a56458bfdf1e5f6c68c5e018f8281896368e`: passa `notifyAdministrativeOnly={isProfessional}` somente ao retorno familiar da agenda profissional.
- Supabase: migração `notify_administrative_on_professional_family_psychology_returns_20261123` aplicada com retorno `success=true`, espelhada em `supabase/migrations/20261123210000_notify_admin_on_professional_family_return.sql` (commit `afa3a5fea13f7c34df34a62b9ed1ebd5e18969ed`). Gatilho aditivo `trg_capo_notify_admin_professional_family_return` cria notificação ao perfil `administrativo_operacional` somente ao INSERT de `appointment_kind='retorno'` pelo profissional; usa tipo `family_psychology_return_notice`, entidade `family_psychology_appointment` vinculada ao paciente de origem pelas regras de isolamento existentes. Não muda primeira consulta nem fila.
- `tests/unit/family-agenda-booking.test.tsx` commit `aec4915253a3b96ad4bb2033b92817cb67978c48`: teste de regressão para presença passada pendente, confirmação explícita e disponibilização do botão de retorno após resposta positiva da RPC; conserva testes da fila e do profissional incompatível.

**Verificação realizada:** leitura do trigger no banco confirmou ativo; EXECUTE direto na função de trigger negado para `anon` e `authenticated`; quatro consultas familiares permaneceram registradas e nenhum retorno foi criado pela manutenção. **Limites:** não foram executados Vitest, build TypeScript, deploy Cloudflare, nem homologação visual com contas reais; não foi enviada notificação de teste, mensagem WhatsApp ou feito agendamento real. A notificação ao Administrativo é criada ao salvar retorno profissional efetivamente, não retroativamente. A fila de avisos específica, a resolução pelo marcador `Paciente avisado`, o fluxo de luto (mínimo dois meses e alta da psicóloga) e todas as variantes de remarcação devem ser submetidos à homologação operacional antes de afirmar paridade completa com o fluxo oncológico. Não alterar vinculados/óbito/luto por implicação nesta etapa.

**Homologação a realizar:** na Agenda Geral, localizar familiar cuja consulta de data anterior permaneça `agendado`; somente se a presença efetivamente ocorreu clicar em Confirmar presença da consulta anterior, selecionar vaga futura do mesmo psicólogo elegível e verificar Tipo Retorno e Confirmar agendamento; no perfil da psicóloga confirmar consulta e criar retorno, checar notificação no Administrativo sem WhatsApp profissional; conferir aviso administrativo e histórico, preservação da fila, grupo, isolamento teste/produção e bloqueio de profissional incompatível.


---

## 24/11/2026 — VERDE — Nutrição real Juliana: salvamento e geração do Plano Alimentar

**Relato e autorização:** Nutricionista Juliana Teixeira Rios Camargo tentou preencher e gerar Plano Alimentar real; conteúdo não foi salvo e não houve geração do documento. Titular concedeu VERDE para correção cirúrgica, preservando formulário documental, PDF e demais funções homologadas.

**Investigação somente leitura:** Juliana ativa, uma conta ativa com perfil `profissional`; três agendamentos `confirmado` da especialidade Nutrição, todos com `nutrition_professional_has_patient_scope(...)=true`, pacientes ativos e ciclos abertos. Zero `nutrition_plans` e zero `nutrition_plan_documents` atribuídos à Juliana antes da manutenção. Contratos `get_nutrition_context_for_interface`, `save_nutrition_plan_detailed_for_interface`, `create_nutrition_document_for_interface` existem com permissão EXECUTE para `authenticated`. Nos logs recentes do Supabase havia chamadas HTTP 200 de leitura `get_nutrition_context_for_interface` e nenhuma evidência de chamadas correspondentes de salvamento ou de geração no intervalo consultado. Essa ausência **não prova** por si só a causa do bloqueio de clique, implantação ou navegador. O histórico de 19/11/2026 já documentava RPC de salvamento testada com ROLLBACK em homologação, mas sem comprovação E2E no navegador real.

**Problema de interface confirmado no código:** o botão `Gerar documento nutricional oficial` era habilitado somente com `planLoaded`, mesmo sem `nutrition_plans` persistido (`current_plan=null`), permitindo tentativa de criação sem plano. O fluxo de salvar validava sucesso da RPC e releitura do contexto, mas não conferia se a releitura trazia efetivamente o plano e o conteúdo digitado: podia limpar o rascunho após recarga antiga/inconsistente. A geração do PDF não possuía `try/catch/finally` global, podendo deixar o estado de carregamento travado diante de erro lançado pelo gerador, armazenamento ou transporte.

**Alterações autorizadas exclusivamente no GitHub `main`:**
- `src/features/nutrition/NutritionPage.tsx` commit `24616eaaf49b8deac5d1e663d380ce5d93d67dc3`: valida `plan_id` da releitura e correspondência dos 12 campos do plano com o digitado antes de declarar sucesso/limpar `planDirty`; em divergência mantém o rascunho e impede PDF desatualizado. Recuperação por `try/catch/finally` no fluxo PDF para erro inesperado não deixar `busy` preso.
- Mesmo arquivo commit `de06fae2128835e116dc1936111fcee4c6470844`: estado `savedPlanId` derivado do plano atual confirmado no banco, limpo ao trocar paciente e definido somente após validação de salvamento; **Gerar documento nutricional oficial** fica indisponível quando não existe plano salvo. Instrução clara para preencher e salvar antes de emitir PDF. Mantém o fluxo prévio de salvar separado do de gerar, sem criação automática de documentos.
- `tests/unit/nutrition-documental-plan.test.tsx` commits `75988ea695e5372ed2c5ab14270ecc237038233e` e `ff782c2aa25b2ed0cc95124a21e20828e0c9df48`: cenários de releitura fiel e liberação de PDF; plano ausente bloqueia PDF; releitura divergente preserva rascunho; erro assíncrono de documento restitui botão e informa erro. Testes escritos; execução CI/Vitest não comprovada.

**Proteções:** sem alterações no Supabase, SQL, registros reais, pacientes, vínculos, escopo de profissionais, agendamentos, termos, armazenamento ou PDF/layout. Os planos/documentos de Juliana continuam ausentes após investigação; **nenhum plano foi inventado ou salvo em nome dela**.

**Homologação operacional pendente:** conferir publicação do novo frontend no Cloudflare; acessar login real da Juliana, selecionar paciente da Nutrição confirmado, preencher ao menos uma orientação, clicar `Salvar / atualizar plano`, verificar mensagem `Plano alimentar salvo e conferido no banco` e registro em `nutrition_plans`; em seguida emitir PDF oficial, validar `nutrition_plan_documents`, caminho Storage e PDF legível. Se botão Salvar ainda não executar chamada, coletar texto exato mostrado e comportamento da seleção/contexto para identificar impedimento não observado em logs. Não afirmar resolução E2E apenas com commits.


---

## 24/11/2026 — VERDE — mensagens de agendamento, retorno, remarcação e remanejamento com nome e especialidade

**Relato da Titular:** mensagens reais de remarcação estavam chegando sem a identificação do profissional. Regra funcional já cobrada nas manutenções: mostrar sempre **nome real do profissional e especialidade**, tanto para retorno quanto remarcação; estender a todos os avisos operacionais pertinentes, incluindo remanejamento, agendamento inicial, Psicologia em grupo e Familiar/Cuidador. Autorização expressa VERDE.

**Causa confirmada no GitHub `main`:** `movementWhatsAppMessage` em `src/features/agenda/appointment-communication.ts` incluía nome profissional apenas opcionalmente no retorno e nenhum nome/especialidade em remarcação ou remanejamento. Agendamento inicial (`appointmentNoticeMessage`) tinha especialidade, mas não o nome do profissional. Vários chamadores de Agenda, grupos, vínculo e bloqueio nem transmitiam ambos os campos.

**Alterações autorizadas, somente frontend:**
- `src/features/agenda/appointment-communication.ts` commit `367286ad39977d1fe9935c056deaefb4d5791d5c`: `CommunicationContact` passa a exigir `professionalName` e `specialtyName`; as três mensagens exibem linhas `Profissional` e `Especialidade`. Dados ausentes provocam erro claro na preparação, nunca identificação inventada.
- `src/features/agenda/AgendaPage.tsx` commits `763499086c93cf8e02ff5622325c7ba511a7f8cd`, `60eefd5e8d469f6418126b754d8bbd16f29f1ec0`, `1f99f41af7323fbd5a12e3cb6763e9ef26db4f80`, `3300f523d6cdcb9b63934b679cb12602e4cd0957`, `ee4c910113bcd11ce15e59eade71bab5beff5cbc`: acrescenta profissional/especialidade do catálogo real em novo agendamento, retorno administrativo, remarcação/remanejamento, Psicologia grupo e familiar/cuidador; mensagens pendentes em vez de cartões com identificador não confirmado; não modifica agendamento após gravação nem gera nova consulta para tentar o aviso.
- `src/features/agenda/FamilyPsychologyReturnAction.tsx` commit `d1c82e619666a001b9bd04aa8bb58e679ac4c5f9`: identifica especialidade Psicologia no retorno familiar, preservando regra de comunicação pelo Administrativo.
- `src/features/agenda/FamilyLinkRebookingAction.tsx` commit `f381c6840bcf784b42181fdd03c7a7070b6ea47a`: identifica Psicologia na remarcação do familiar cancelada pelo link, nome obtido do contexto autorizado.
- `src/features/agenda/OwnAgendaManager.tsx` commits `4c02cee2f5feb80446f021aecf58214dd7dd3e19`, `4a2b933e3a6743e9c8264b45e8a273dc1499dc54`: no remanejamento do bloqueio estrutural, inclui nome/especialidade do registro atingido, com alternativa do perfil profissional somente quando identidade coincide; sem identidade completa, deixa aviso pendente e não renderiza mensagem inválida.
- `tests/unit/appointment-communication.test.ts` commit `472e73df84502fd3d52a59f9707a9b2b81eb58ce`: atualiza os cenários de todos os tipos de movimentação para exigir ambas as identificações e adiciona bloqueio quando qualquer campo estiver vazio.

**Restrições preservadas:** nenhum SQL, migração, alteração de dado real, prontuário, status, agenda, fila, permissões, bloqueio, cancelamento ou mecanismo de WhatsApp executado. O texto acolhedor, a data anterior e nova, a saudação e assinatura mantêm o padrão anterior. WhatsApp continua aberto para envio manual e sem declaração falsa de entrega. **Testes unitários foram escritos/atualizados, mas não há prova de execução Vitest, TypeScript/build, Cloudflare deploy ou homologação autenticada nas diferentes agendas.**

**Homologação requerida:** publicar/confirmar nova versão frontend; no Gestor/AO preparar em conta autorizada mensagens de retorno, remarcação e remanejamento com profissional/especialidade reais e horário atualizado; verificar grupo Psicologia, familiar/cuidador e aviso inicial; em cadastro faltante confirmar aviso pendente sem texto genérico. Não executar remarcações reais meramente para teste.
