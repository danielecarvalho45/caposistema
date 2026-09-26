# CAPO — AUDITORIA FINAL DE IMPLANTAÇÃO
## Documento Mestre de Continuidade
**Início:** 25/09/2026

Este documento passa a ser o **registro oficial e único da auditoria final de implantação** do Sistema CAPO.

Relatórios antigos de auditoria permanecem apenas como histórico e **não devem ser usados como guia de manutenção**. Os manuais normativos continuam válidos conforme o tipo de problema, sempre em suas versões mais recentes.

---

## 1. REGRA FUNDAMENTAL — FONTE CORRETA CONFORME O TIPO DE ERRO

### Estrutura / integração interface ↔ banco
Usar obrigatoriamente o **Manual Estrutural vigente**. Ele define o organograma funcional, fluxos, comandos, automações e como a interface se liga ao banco.

### Interface
Usar a documentação vigente da **Interface**, respeitando layout, botões, cores, disposição, navegação e padrões já aprovados.

### Banco
Confrontar a estrutura física atual do banco com o **Manual Estrutural** e a documentação vigente correspondente. O banco deve obedecer ao projeto estrutural.

### Conflitos
Sempre prevalecem as atualizações mais recentes.

Se houver divergência real entre Manual Estrutural, Interface e Banco que não possa ser resolvida objetivamente:
- não decidir por interpretação própria;
- registrar como **🟡 PENDÊNCIA DE DECISÃO**;
- apresentar à responsável pelo projeto;
- continuar a auditoria sem interromper as demais correções.

Relatórios antigos de auditoria não são fonte normativa desta auditoria final.

---

## 2. REGRA FUNDAMENTAL — CORRIGIR DURANTE A AUDITORIA

Quando uma divergência estiver objetivamente comprovada:
- corrigir imediatamente;
- não aguardar aprovação intermediária;
- registrar neste documento o problema, regra correta, correção, caminhos alterados e teste posterior.

Toda correção deve ser:
- cirúrgica;
- restrita ao problema comprovado;
- compatível com as demais partes já corretas;
- sem regressão;
- sem desconstruir funcionalidade aprovada;
- sem gambiarra;
- sem alterar manual para justificar código incorreto.

**O código deve obedecer ao projeto. O projeto não deve ser reescrito para acomodar implementação inadequada.**

---

## 3. REGRA FUNDAMENTAL — SOBERANIA DO MANUAL ESTRUTURAL

O banco, a integração e as automações devem obedecer ao Manual Estrutural vigente.

As adaptações autorizadas até o momento referem-se apenas a **redundâncias de interface**, como:
- botões duplicados;
- atalhos repetidos;
- botões desnecessários;
- duplicação visual de funções já acessíveis em outro ponto correto.

Essas adaptações não autorizam alteração da lógica estrutural.

Quando for encontrado algo fisicamente existente no banco ou no projeto que não esteja previsto daquela forma no Manual Estrutural:
- se estiver comprovadamente errado: corrigir;
- se puder representar decisão posterior, extensão funcional ou estrutura não documentada:
  - não remover;
  - não alterar por conta própria;
  - registrar como **🟡 PENDÊNCIA DE DECISÃO**;
  - continuar a auditoria.

A existência física de uma estrutura no banco não significa, por si só, que ela esteja correta.

---

## 4. REGRA FUNDAMENTAL — CORREÇÃO, TESTE INTERNO E VALIDAÇÃO OPERACIONAL SÃO ETAPAS DIFERENTES

As correções não devem parar esperando publicação do Cloudflare ou validação visual da usuária.

Fluxo:
1. auditar;
2. corrigir;
3. testar internamente tudo que for tecnicamente possível;
4. registrar a correção neste documento;
5. continuar para o próximo ponto;
6. realizar posteriormente os testes físicos/operacionais;
7. corrigir somente o que ainda falhar nesses testes.

A fila de publicação não deve causar repetição de correção já aplicada no código.

Estados permitidos:
- **CORRIGIDO NO CÓDIGO**
- **TESTE INTERNO CONCLUÍDO**
- **AGUARDANDO TESTE OPERACIONAL**
- **PENDÊNCIA DE DECISÃO**
- **CONCLUÍDO E CONGELADO**

Regra de ouro: ao término do processo, não deve permanecer manutenção técnica conhecida sem tratamento. Somente itens que dependam de decisão da responsável podem permanecer como pendência.

---

## 5. REGRA FUNDAMENTAL — DOCUMENTO ÚNICO DE CONTINUIDADE

Este arquivo é o **registro mestre desta auditoria final**.

Objetivos:
- reduzir a quantidade de documentos usados na manutenção;
- impedir interpretações conflitantes entre auditorias antigas;
- impedir retorno a correções já realizadas;
- registrar a evolução real do projeto implantado;
- permitir testes futuros diretamente pelos caminhos já documentados.

**Manuais normativos** definem como o sistema deve funcionar.

**Este documento** registra:
- o que foi verificado;
- o que estava diferente;
- o que foi corrigido;
- onde foi corrigido;
- como testar depois;
- o que ficou pendente.

Toda nova correção desta auditoria deve ser acrescentada aqui.

---

# 6. REGRA FUNDAMENTAL — CLASSIFICAÇÃO E APRESENTAÇÃO DA AUDITORIA

Classificação oficial:

- 🟢 **VERDE** — item correto, aprovado ou já corrigido e conferido.
- 🔴 **VERMELHO** — erro encontrado durante a auditoria. Após correção e conferência, passa para 🟢 VERDE.
- 🟡 **AMARELO** — pendência real que depende de decisão da responsável, de teste operacional posterior ou de situação sem comprovação suficiente para correção automática.

Durante a auditoria:
- não é necessário apresentar tabelas intermediárias à responsável;
- as correções devem continuar normalmente;
- o documento mestre pode usar tabelas ou estrutura técnica para facilitar rastreabilidade.

Ao término da auditoria, apresentar apenas uma lista simples com:
1. o que já estava correto;
2. o que estava errado;
3. o que foi corrigido;
4. o que restou como pendência amarela.

Objetivo final:
- nenhum item vermelho;
- itens corretos/corrigidos em verde;
- somente pendências amarelas justificadas, se existirem.

---

# 7. REGRA FUNDAMENTAL — SEMPRE OBEDECER À DOCUMENTAÇÃO MAIS ATUAL

A documentação mais recente válida deve sempre prevalecer.

Regras:
- não voltar a documentos antigos para tentar justificar divergências;
- não usar histórico antigo para reinterpretar regra já definida no documento atual;
- não criar justificativas com base em documentação obsoleta;
- não alterar o projeto para acomodar implementação incompatível com a documentação atual.

Se uma regra NÃO estiver comprovada na documentação mais atual:
- não inventar;
- não interpretar por conta própria;
- não remover estrutura potencialmente válida;
- registrar como 🟡 **PENDÊNCIA DE DECISÃO** somente quando não houver comprovação suficiente ou quando a correção puder danificar outro processo já implantado.

Pendências devem ser exceção, não regra.

Se o Manual Estrutural atual definir claramente o comportamento:
- considerar a regra comprovada;
- corrigir de forma cirúrgica;
- não criar pendência desnecessária.

---

# 8. REGRA FUNDAMENTAL — CONGELAMENTO CONTROLADO

Quando um bloco for corrigido, conferido internamente e classificado como 🟢 VERDE:

- o bloco deve ser considerado **CONGELADO**;
- correções futuras de outros módulos não podem alterar esse bloco automaticamente;
- o objetivo do congelamento é impedir que uma correção desconstrua outra já concluída.

Se uma nova correção depender tecnicamente da reabertura de um bloco congelado:

1. verificar primeiro se existe outra solução segura que preserve o bloco congelado;
2. se não existir alternativa comprovadamente segura, apresentar imediatamente à responsável:
   - qual bloco precisaria ser reaberto;
   - qual nova correção depende disso;
   - por que a reabertura seria necessária;
   - quais processos podem ser afetados;
3. se houver resposta imediata da responsável, seguir a decisão recebida;
4. se não houver resposta imediata:
   - NÃO reabrir o bloco;
   - registrar o caso como 🟡 **PENDÊNCIA DE DECISÃO**;
   - continuar normalmente a auditoria e as demais correções.

A pendência deve registrar claramente que:
- o processo anterior está correto e congelado;
- o novo processo precisa potencialmente tocar naquele bloco;
- a reabertura depende de decisão consciente para evitar regressão.

Um bloco congelado só pode ser reaberto:
- por decisão expressa da responsável pelo projeto; ou
- quando houver regressão comprovada e a correção tiver sido previamente apresentada conforme esta regra.

---

# 9. REGRA FUNDAMENTAL — CORREÇÕES GLOBAIS X PARTICULARIDADES DE PERFIL

Quando uma divergência for comum a vários perfis:

- corrigir automaticamente no ponto compartilhado;
- aplicar a correção de forma consistente a todos os perfis afetados;
- evitar repetir a mesma correção em vários arquivos específicos;
- verificar previamente os consumidores conhecidos do componente, fluxo, regra ou integração compartilhada;
- preservar particularidades de cada perfil.

Quando a divergência for específica de um perfil:

- corrigir somente dentro daquele perfil;
- não alterar outros perfis;
- não transformar particularidade local em regra global.

Regra prática:
- comportamento comum = correção global;
- particularidade funcional = correção local do perfil.

Se um botão, ação, componente ou fluxo for comum a vários perfis:
- ele deve ter o mesmo comportamento funcional em todos;
- qualquer comportamento diferente entre perfis, sem previsão expressa no Manual Estrutural, é considerado divergência e deve ser corrigido;
- essa divergência NÃO deve virar pendência quando o Manual Estrutural já trouxer regra suficiente para a correção.

Particularidade de perfil existe somente quando a própria função exclusiva daquele perfil estiver prevista na estrutura funcional do CAPO.

O Manual Estrutural é suficiente para distinguir comportamento comum de particularidade funcional.

Não duplicar lógica global em telas específicas quando existir ponto compartilhado adequado para a correção.

---

# 10. REGRA DE OURO — LEITURA MINUCIOSA DO PROJETO ESTRUTURAL

O Projeto/Manual Estrutural é a referência principal da auditoria funcional e deve ser analisado minuciosamente para cada perfil.

É proibido:
- ler apenas o primeiro organograma e presumir que os demais perfis seguem a mesma estrutura;
- transferir automaticamente funções de um perfil para outro;
- concluir por analogia sem conferir o desenho específico do perfil;
- realizar correções em sequência por interpretação própria.

Para cada perfil auditado, deve ser feito pente fino de:
- organograma completo;
- responsabilidades;
- módulos;
- ações;
- botões;
- fluxos;
- automações;
- integrações com o banco;
- particularidades exclusivas;
- comportamentos comuns compartilhados.

Exemplo de aplicação:
- ao auditar Gestor/Titular, analisar toda a estrutura prevista para Gestor/Titular;
- ao auditar Nutrição, analisar toda a estrutura prevista para Nutrição;
- aplicar a mesma metodologia individual aos demais perfis.

## Regra contra correções em avalanche

Cada correção deve ser tratada como unidade independente.

Fluxo obrigatório:
1. identificar a divergência;
2. interromper qualquer inferência em cascata;
3. consultar o Projeto/Manual Estrutural especificamente no ponto correspondente;
4. analisar o impacto da correção;
5. verificar relação com componentes globais, particularidades de perfil e blocos congelados;
6. corrigir somente o que estiver comprovado;
7. conferir o resultado antes de avançar para a próxima correção.

Uma correção não autoriza automaticamente outra correção derivada.

Somente o Projeto/Manual Estrutural vigente pode fundamentar a próxima alteração funcional.

---

# 11. REGRA DE OURO — ANTI-LOOP

A auditoria e as correções não podem andar em círculos.

## Princípio central

Um item que já foi:
- analisado fisicamente;
- confrontado com a documentação vigente;
- corrigido quando necessário;
- conferido;
- classificado como 🟢 VERDE;
- e congelado;

NÃO deve ser reaberto por dúvida genérica, repetição de problema semelhante em outro módulo ou retorno a documentação antiga.

## Antes de iniciar qualquer nova correção

Verificar primeiro no Documento Mestre da Auditoria Final:
- se o ponto já foi auditado;
- qual foi a conclusão;
- qual correção foi aplicada;
- qual evidência sustentou a decisão;
- se o bloco está congelado;
- se existe pendência relacionada.

Se já estiver resolvido e não houver evidência nova, NÃO repetir a auditoria.

## Um item verde/congelado só pode ser reaberto quando houver

1. evidência física nova de regressão;
2. conflito comprovado com o Manual Estrutural vigente;
3. dependência técnica real de outro processo que exija reabertura, seguindo a regra de congelamento controlado;
4. ordem expressa da responsável pelo projeto.

Fora dessas hipóteses, o item permanece fechado.

## Proibição de loop documental

É proibido:
- voltar a documentação antiga para tentar contradizer decisão baseada na documentação atual;
- reabrir item resolvido por interpretação histórica;
- repetir diagnóstico já concluído sem evidência nova;
- refazer correção apenas porque o navegador ainda mostra versão antiga em fila de publicação;
- alterar novamente um ponto só porque outro módulo apresentou erro semelhante;
- usar relatório antigo para substituir inspeção física atual.

## Tratamento de erro semelhante em outro módulo

Se surgir problema semelhante:
- analisar o novo ponto no contexto próprio;
- verificar se é regra global ou particularidade;
- não presumir que o bloco anterior estava errado;
- só reabrir o bloco anterior se houver prova concreta de regressão nele.

## Controle de continuidade

Cada correção concluída deve deixar registro suficiente para permitir que a auditoria avance sem retornar ao mesmo ponto:
- data;
- perfil/módulo;
- arquivo ou estrutura afetada;
- divergência encontrada;
- fundamento documental;
- correção aplicada;
- conferência realizada;
- status final;
- indicação de congelamento;
- caminho de teste operacional posterior, quando aplicável.

Objetivo: a auditoria deve avançar sempre para frente. O histórico serve para impedir repetição de trabalho, não para substituir a documentação normativa.

---

# 12. REGRA OPERACIONAL — ECONOMIA DE CHAT E CONTINUIDADE

Esta auditoria deve, sempre que possível, ser concluída no mesmo chat.

Objetivo:
- reduzir risco de perda de contexto;
- evitar fragmentação entre chats;
- impedir que uma continuidade posterior refaça decisões já tomadas;
- preservar capacidade do chat para o trabalho essencial.

Durante a execução:
- trabalhar o máximo possível internamente;
- evitar mensagens intermediárias sem necessidade;
- não apresentar cada microcorreção isoladamente;
- registrar tecnicamente as correções no Documento Mestre;
- trazer ao chat apenas blocos concluídos, conclusões relevantes ou decisões realmente necessárias.

Só interromper a responsável quando:
- houver decisão funcional que não possa ser comprovada pelos manuais vigentes;
- houver risco real de reabrir bloco congelado;
- existir possibilidade concreta de danificar outro processo implantado;
- houver impedimento técnico que exija escolha humana.

Se não houver necessidade de decisão, a auditoria deve continuar sem interrupção até fechar o bloco em análise.

---

# 13. REGRA OPERACIONAL — RELATÓRIO ÚNICO AO FINAL

Durante a auditoria:
- não apresentar relatórios intermediários;
- não apresentar resumos de cada microcorreção;
- não exigir conferência da responsável após cada bloco;
- trabalhar internamente com autonomia conforme os manuais vigentes e as regras desta auditoria;
- registrar tecnicamente todas as verificações, correções, evidências, congelamentos e pendências no Documento Mestre.

A responsável só deve ser interrompida quando existir uma pendência real que dependa de decisão humana conforme as regras já definidas.

Ao término de toda a auditoria:
- gerar um único relatório final consolidado;
- entregar esse relatório em PDF;
- incluir no PDF o que estava correto, o que estava errado, o que foi corrigido, o que foi congelado e eventuais pendências restantes;
- o PDF final deve servir como documento de continuidade caso seja necessário prosseguir em outro chat.

---

# 14. REGRA OPERACIONAL — EXECUÇÃO CENTRALIZADA NESTE CHAT

A auditoria, as correções e a continuidade principal do projeto devem permanecer centralizadas neste único chat.

Motivo:
- evitar fragmentação de contexto;
- evitar transferência incompleta entre Chat, Codex e Work;
- impedir que uma execução iniciada em outro ambiente precise ser retomada parcialmente aqui;
- reduzir risco de divergência, retrabalho e perda de decisões já consolidadas.

Portanto:
- NÃO encaminhar automaticamente partes da auditoria ou construção para Codex ou Work;
- NÃO dividir a execução entre ambientes por conveniência;
- manter neste chat a leitura, auditoria, correção, conferência, registro e congelamento;
- utilizar outro ambiente somente por ordem expressa da responsável pelo projeto.

A limitação de créditos do Codex reforça a necessidade de evitar dependência operacional desse ambiente durante esta auditoria.

---

# 15. METODOLOGIA DA AUDITORIA FINAL

Para cada módulo/bloco:

### 6.1 Fonte normativa
Identificar qual documentação vigente rege o ponto auditado.

### 6.2 Estado físico atual
Verificar:
- código atual no GitHub;
- integração atual;
- banco físico quando aplicável;
- Index físico vigente quando aplicável.

### 6.3 Classificação
- 🟢 **CONFORME**
- 🟡 **DIVERGENTE E CORRIGIDO**
- 🟡 **PENDÊNCIA DE DECISÃO**
- 🔴 **BLOQUEADOR**
- ⚪ **NÃO APLICÁVEL**

### 6.4 Correção
Aplicar somente a mudança necessária.

### 6.5 Proteção contra regressão
Antes de alterar estrutura compartilhada, verificar consumidores conhecidos daquele componente, RPC, regra, navegação ou autorização.

### 6.6 Registro obrigatório
Registrar:
- data;
- módulo;
- problema;
- regra correta;
- arquivos/caminhos;
- correção;
- teste interno;
- teste operacional futuro;
- estado final.

---

# 16. REGISTRO DE CORREÇÕES

## 7.1 Renovação de Receita
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

### Problemas encontrados
1. `get_prescription_renewal_doctors_for_interface` existia no Supabase, mas não estava cadastrada na camada de transporte RPC do frontend.
2. Outras funções do mesmo módulo também não estavam registradas nessa camada.
3. A interface usava nomes antigos de parâmetros e retornos.
4. A tela exigia vínculo profissional para criar solicitação, embora o backend atual autorize Administrador e Administrativo Operacional.
5. O fluxo médico e administrativo usava ações/campos antigos.

### Estrutura física confirmada no banco
- `get_prescription_renewal_doctors_for_interface()`
- `create_prescription_renewal_for_interface(p_patient_id, p_target_doctor_id, p_administrative_note)`
- `get_prescription_renewals_for_interface(p_status, p_limit, p_offset)`
- `manage_prescription_renewal_medical_for_interface(p_request_id, p_action, p_operational_return)`
- `manage_prescription_renewal_admin_for_interface(...)`

### Arquivos corrigidos
- `src/types/database.ts`
- `src/lib/supabase/rpc.ts`
- `src/features/renewals/RenewalPrescriptionPage.tsx`
- `tests/unit/supabase-rpc.test.ts`

### Correções realizadas
- contratos TypeScript alinhados ao banco atual;
- RPCs de Renovação registradas na camada de transporte;
- parâmetros antigos removidos;
- parser de médicos alinhado ao retorno atual;
- criação alinhada a `p_target_doctor_id` e `p_administrative_note`;
- listagem alinhada ao retorno atual;
- etapa médica alinhada às ações `start` e `complete`;
- etapa administrativa alinhada ao fluxo atual;
- criação liberada aos papéis autorizados pelo backend;
- testes de contrato atualizados.

### Commits relacionados
- `c3b4fd05be6a4d1143a9876b5e6fa8243ab3de64`
- `a42aa793b7e2f7d3434b56a9e2f52f160cd8f193`
- `acf180ea592bf407018ad03ae2c09d90b784a138`
- `c889c3bfdf70f15001652a21e90b82aac0b1d8ef`
- `b6658b38febb605f1e9cc209268b498b517c296f`

### Teste interno
O contrato físico do banco foi confrontado com o código após a correção. Não permaneceram no módulo corrigido os parâmetros antigos:
- `p_doctor_id`
- `p_prescription_note`
- `p_renewal_id`
- `p_feedback`

### Teste operacional posterior
1. entrar em Renovação de Receita com Administrador/Administrativo Operacional;
2. confirmar carregamento da lista de médicos;
3. buscar paciente autorizado;
4. criar solicitação;
5. confirmar estado `awaiting_medical`;
6. entrar como médico destinatário;
7. iniciar etapa médica;
8. concluir retorno operacional;
9. retornar ao Administrativo;
10. confirmar contato/orientação ao paciente;
11. concluir solicitação;
12. confirmar histórico/estado final.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE OPERACIONAL APÓS PUBLICAÇÃO.

---

## 7.2 Contexto principal e funções acumuladas
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

Foi corrigida a resolução do contexto principal para respeitar o papel configurado como principal sem apagar funções acumuladas. Contas com múltiplos papéis continuam com módulos adicionais autorizados, sem troca manual de login/perfil.

**Caminhos:** Supabase resolve_user_primary_context e set_team_member_primary_context_for_interface; supabase/migrations/20260926180000_align_primary_context_with_configured_role.sql; src/app/route-access.ts; src/app/App.tsx; src/components/shell/AppShell.tsx; tests/unit/route-access.test.ts.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.3 Painel e navegação do Gestor/Titular
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

Foram restaurados no painel integrado do Gestor os acessos de Familiar, Relatórios, Atividades Recentes/Linha do Tempo, Status do Sistema e Transporte de acordo com a estrutura aprovada, sem reabrir o cabeçalho congelado.

**Caminhos:** src/features/gestor/GestorDashboard.tsx; src/features/gestor/GestorShell.tsx.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO CONFERÊNCIA VISUAL APÓS PUBLICAÇÃO.

---

## 7.4 Agenda — catálogo real e ações de presença
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

O novo agendamento deixou de usar especialidade textual e profissionais derivados de agendamentos existentes. A tela passou a usar get_scheduling_catalog, filtrar profissionais pela especialidade e enviar ao backend as ações confirmado e faltou. O botão de Retorno foi removido do bloco de presença por não corresponder ao contrato de comparecimento.

**Caminhos:** src/features/agenda/AgendaPage.tsx; src/lib/supabase/rpc.ts; src/types/access.ts; src/types/database.ts.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.5 Busca Ativa separada da Oferta Inicial
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

Foi separado o onboarding/Oferta Inicial do fluxo de Busca Ativa. Busca Ativa agora usa search_type follow_up e exige paciente ativo, não falecido e com histórico CAPO. Cadastro/Oferta Inicial registra desfecho no contrato initial.

**Caminhos:** Supabase get_active_searches_for_interface, register_active_search_attempt_for_interface e close_active_search_for_interface; supabase/migrations/20260926190000_separate_followup_active_search_from_initial_offer.sql; src/features/gestor/ActiveSearchPage.tsx; src/features/patients/PatientsPage.tsx; src/features/gestor/GestorManagementPage.tsx; src/lib/supabase/rpc.ts; src/types/database.ts.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.6 Fila profissional e pendências administrativas
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A fila foi separada em visão profissional da própria especialidade e visão administrativa de pendências. Os contratos de waiting list foram registrados na camada RPC.

**Caminhos:** src/features/queues/QueuePage.tsx; src/app/route-access.ts; src/lib/supabase/rpc.ts; src/types/database.ts.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.7 Especialidades efetivas no contexto de acesso
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

get_my_access_context passou a devolver a lista de especialidades efetivas do profissional. A interface deixou de depender de papéis específicos de especialidade e passou a compor Nutrição, Assistência Social e atuação padrão pelo vínculo profissional real.

**Caminhos:** Supabase get_my_access_context; supabase/migrations/20260926200000_expose_effective_specialties_in_access_context.sql; src/types/access.ts; src/lib/supabase/rpc.ts; src/app/route-access.ts; src/app/App.tsx; src/components/navigation/navigation-config.ts; src/features/professional/AssistentialPage.tsx.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.8 Retorno próprio e remarcação do profissional
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

O backend foi alinhado à regra de que o primeiro atendimento é administrativo, mas o profissional pode consultar e remarcar apenas o próprio retorno na própria agenda, mantendo especialidade e vagas autorizadas.

**Caminhos:** Supabase get_reschedulable_appointments e reschedule_appointment_for_interface; supabase/migrations/20260926210000_allow_professional_own_return_rescheduling.sql.

**Estado atual:** CORRIGIDO NO BANCO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.9 Acompanhamento Social a partir do agendamento confirmado
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A interface chamava start_social_followup_for_interface com parâmetros antigos. O contrato foi alinhado para patient_id + appointment_id e o início do acompanhamento passou a partir do paciente confirmado na agenda, sem digitação manual de ID de ciclo.

**Caminhos:** src/features/closures/closures-integration.ts; src/features/social/SocialPage.tsx.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE OPERACIONAL.

---

## 7.10 Familiar/Cuidador e Luto
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

Foram corrigidas divergências entre interface e contratos físicos: a tela não afirma mais que o Luto está sem RPC; o Administrativo Operacional voltou a ter acesso ao fluxo de Familiar/Cuidador; ações administrativas ficaram restritas ao contexto administrativo; o Luto ganhou pesquisa segura própria para familiares vinculados a paciente falecido dentro do escopo social; o encerramento passou a enviar o motivo operacional exigido pelo backend; e papel de Administrador acumulado passou a ser reconhecido independentemente do contexto principal.

**Caminhos:** Supabase search_bereavement_family_members_for_interface; supabase/migrations/20260926213000_add_scoped_bereavement_family_search.sql; src/lib/supabase/rpc.ts; src/types/database.ts; src/features/social/BereavementPage.tsx; src/features/social/FamilyCaregiverPage.tsx; src/app/route-access.ts.

**Conferência interna:** assinaturas de get_family_bereavement_for_interface, start_family_bereavement_for_interface, close_family_bereavement_for_interface, get_family_context_for_interface e contratos de familiar foram relidas no Supabase. A suíte automatizada ainda não foi executada depois destas alterações.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.11 Transporte — competência, necessidade, solicitação e PDF oficial
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A auditoria física confirmou que o fluxo de Transporte possui contratos separados para necessidade ativa, solicitação vinculada a atendimento, PDF armazenado, assinatura e providência administrativa. A interface integrada ainda chamava create_transport_request_for_interface com parâmetros antigos, não permitia selecionar o atendimento exigido, bloqueava o Auxiliar Administrativo da etapa administrativa e tentava assinar PDF antes de existir arquivo oficial.

**Correções realizadas:**
- competência profissional de criação restringida à Assistência Social com a capacidade preencher_solicitacao_transporte; Gestor continua autorizado diretamente;
- Auxiliar Administrativo permanece sem preencher/gerar/assinar, mas pode confirmar, visualizar/baixar o documento, registrar encaminhamento, concluir ou cancelar conforme o backend;
- reconhecimento da necessidade de transporte integrado antes da solicitação;
- solicitação passa a enviar patient_id + appointment_id + transport_notes;
- PDF oficial é gerado a partir do modelo aprovado, gravado no bucket privado capo-documents no caminho transport/<request_id>/..., registrado pela RPC oficial e assinado somente pelo Gestor;
- visualização e download usam URL temporária do armazenamento privado;
- encaminhamento externo exige canal institucional e só aparece depois do PDF preparado/assinado;
- cancelamento da necessidade e cancelamento da solicitação permanecem separados e auditáveis.

**Caminhos:** src/features/transport/TransportPage.tsx; src/app/route-access.ts; src/lib/supabase/rpc.ts; src/types/database.ts. Contratos físicos conferidos: recognize_transport_need_for_interface, get_transport_need_queue_for_interface, manage_transport_need_for_interface, get_transport_context_for_interface, create_transport_request_for_interface, manage_transport_request_for_interface, register_transport_pdf_for_interface, sign_transport_pdf_for_interface e get_transport_document_for_interface.

**Conferência interna:** as assinaturas físicas das RPCs e as policies do bucket capo-documents foram relidas. A policy de INSERT exige caminho transport/<request_id>/... em PDF e papel Administrador; a policy de leitura autoriza os contextos operacionais previstos. A suíte automatizada ainda não foi executada após esta correção.

**Estado atual:** CORRIGIDO NO CÓDIGO/INTEGRAÇÃO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.12 Odontologia — autoria profissional, PDF e etapa administrativa
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A documentação estrutural confirma que o PDF odontológico é de autoria exclusiva do profissional competente; Gestão e Administrativo apenas recebem, visualizam, baixam e conduzem a providência administrativa. O fluxo aprovado também determina que o PDF acompanhe o encaminhamento recebido pelo Administrativo.

### Divergências encontradas
- a interface integrada não possuía integração com register_dentistry_pdf_for_interface nem get_dentistry_referral_document_for_interface;
- o Administrativo podia tentar iniciar/concluir um encaminhamento ainda sem PDF vinculado;
- a ação de concluir enviava resposta nula, embora o backend exija informação administrativa com pelo menos cinco caracteres para concluir/cancelar;
- os botões administrativos usavam selectedReferral global e podiam atuar sobre registro diferente da linha clicada;
- o emissor profissional tinha emissão do encaminhamento, mas não a etapa de geração/vinculação do PDF oficial existente no Index aprovado.

### Correções realizadas
- geração do PDF oficial restaurada exclusivamente para o profissional emissor autorizado;
- PDF usa os dados reais do encaminhamento: paciente, CMS, Nº CAPO, destino, conteúdo operacional, Médico Clínico, CRM e data de emissão;
- arquivo é gravado no bucket privado capo-documents em dentistry/<referral_id>/...pdf e registrado pela RPC oficial;
- visualização e download utilizam URL temporária do armazenamento privado;
- Administrativo/Gestão não recebem ação de geração do PDF;
- retorno administrativo obrigatório passou a ser coletado e enviado nas ações complete/cancel;
- ações administrativas passaram a receber explicitamente a linha/referral clicada;
- backend agora bloqueia start/complete enquanto o PDF oficial não estiver vinculado.

### Caminhos alterados
- Supabase: manage_dentistry_referral_for_interface
- supabase/migrations/20260926220000_require_dentistry_pdf_before_admin_processing.sql
- src/lib/supabase/rpc.ts
- src/types/database.ts
- src/features/dentistry/DentistryPage.tsx

### Conferência interna
A função física do Supabase foi relida após a migração e o bloqueio de PDF foi confirmado. Também foi confirmada no código atual a presença das integrações de registro/consulta do documento, geração profissional e informação administrativa obrigatória. A suíte automatizada ainda não foi executada após esta correção.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.13 Encerramentos por especialidade e ciclos de retorno
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A tela integrada misturava Encerramentos com Acompanhamento Social e oferecia ações administrativas que o backend reserva ao profissional responsável. Também exigia digitação manual de UUID de paciente e especialidade para o encerramento profissional.

### Correções realizadas
- removida a duplicação de Acompanhamento Social dentro da tela de Encerramentos;
- conclusão do encerramento passou a aparecer somente quando o próprio backend devolve can_close=true para o profissional responsável;
- reabertura passou a aparecer somente para Administrativo/Administrador quando can_reopen=true;
- atribuição de profissional ficou limitada a Administrativo/Administrador e a pendências ainda sem responsável;
- Coordenador permanece com visão de acompanhamento, sem receber ações que o backend não autoriza;
- solicitação de encerramento da própria atuação passou a usar busca real de pacientes vinculados e lista real das especialidades do profissional, eliminando digitação manual de UUID;
- abertura de novo ciclo de retorno passou a usar busca real do paciente e permanece restrita aos papéis administrativos autorizados.

### Caminho alterado
- src/features/closures/ClosuresPage.tsx

### Contratos físicos confrontados
- get_care_closures_for_interface
- request_own_specialty_care_closure_for_interface
- close_care_closure_for_interface
- assign_care_closure_professional_for_interface
- get_eligible_care_closure_professionals_for_interface
- reopen_care_closure_for_interface
- open_return_care_cycle_for_interface

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

# 17. PENDÊNCIAS DE DECISÃO

Nenhuma registrada até o momento.

---

# 18. FLUXO DOCUMENTAL OFICIAL

O projeto passa a trabalhar com três documentos normativos oficiais e fechados:

1. **Manual Estrutural**
   - define o organograma funcional do CAPO;
   - define fluxos, automações, responsabilidades e ligações entre interface e banco;
   - é a referência principal quando o problema for estrutural ou de integração.

2. **Manual Técnico**
   - define implementação técnica, banco, contratos, integrações e infraestrutura;
   - deve ser usado para validar a execução técnica da regra estrutural.

3. **Manual da Interface**
   - define layout, navegação, botões, cores, disposição e comportamento visual;
   - deve ser usado para validar a apresentação e o comportamento da interface.

## Regra de imutabilidade normativa

As manutenções NÃO devem alterar as regras do sistema.

Portanto:
- não reescrever os manuais para justificar código;
- não adaptar regra documental a uma implementação incorreta;
- não criar nova regra funcional durante manutenção;
- não alterar organograma, fluxo ou responsabilidade por conveniência técnica;
- fazer o código, a interface e a integração obedecerem aos manuais vigentes.

### Exceção controlada — somente layout

A única exceção possível é de apresentação visual.

Se, durante a auditoria, surgir uma situação em que uma disposição diferente possa ser necessária ou mais adequada por motivo de:
- usabilidade;
- responsividade;
- organização visual;
- melhor distribuição de elementos;

a mudança NÃO deve ser aplicada automaticamente.

Procedimento:
1. registrar como 🟡 PENDÊNCIA DE LAYOUT;
2. explicar a divergência;
3. justificar por que outra disposição poderia ser melhor;
4. preservar a funcionalidade existente;
5. aguardar decisão da responsável.

Essa exceção NÃO se aplica à estrutura funcional.

Na parte estrutural:
- o que cada botão executa;
- qual função/RPC ele chama;
- qual fluxo deve acontecer;
- quais dados devem ser lidos ou gravados;
- quais automações devem ocorrer;
- como interface e banco se comunicam;

deve obedecer integralmente ao Manual Estrutural vigente.

O banco de dados já contém a estrutura necessária para integralização do sistema. O foco principal desta auditoria é corrigir:
- estrutura da aplicação;
- ligações interface ↔ banco;
- contratos e chamadas entre frontend e backend;
- ligação de botões com funções reais do banco;
- navegação;
- layout;
- divergências de interface;
- falhas de integração.

## Papel do Documento Mestre da Auditoria Final

Este documento está em construção durante a auditoria atual.

Por isso:
- NÃO é fonte normativa para decidir como o sistema deve funcionar durante esta auditoria;
- NÃO substitui Manual Estrutural, Manual Técnico ou Manual da Interface;
- serve somente para registrar o que foi verificado, corrigido e pendenciado nesta auditoria.

Após o encerramento da auditoria e dos testes correspondentes, este documento passará a ser a referência de continuidade para **futuras manutenções**, evitando retorno a auditorias antigas e repetição de correções já concluídas.

---

# 19. REGRA DE CONTINUIDADE

Toda nova auditoria/correção da implantação deve:
1. consultar primeiro este documento para saber o que já foi tratado;
2. consultar o manual normativo correspondente ao tipo de problema;
3. verificar o código/banco físico atual;
4. não repetir correção já registrada sem evidência nova de regressão;
5. registrar a nova correção neste arquivo;
6. manter separadas:
   - regra normativa;
   - correção aplicada;
   - teste interno;
   - teste operacional;
   - pendência de decisão.
