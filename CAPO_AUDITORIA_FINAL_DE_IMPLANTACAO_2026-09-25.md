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

## 7.14 Notificações — contrato físico e abertura do contexto correto
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A camada de Notificações estava incompatível com o contrato físico do Supabase: priority era tratado como número embora o banco devolva texto, e a resposta de update_my_notification_for_interface era tratada como se tivesse campo success, que não existe no retorno físico.

### Correções realizadas
- priority alinhado para string/null;
- parser da atualização considera sucesso somente após retorno válido da RPC, sem exigir campo inexistente;
- tipos do banco atualizados;
- teste unitário atualizado para o contrato real, inclusive retorno JSON sem success;
- abertura de contexto ampliada para Solicitações, Encaminhamentos, Faltosos, Fila, Encerramentos, Transporte, Renovação de Receita, Nutrição e Suporte Técnico;
- notificações odontológicas são direcionadas para Odontologia quando o tipo/mensagem identifica o fluxo;
- toda navegação permanece submetida a canAccessAppRoute.

### Caminhos alterados
- src/features/notifications/notifications-integration.ts
- src/types/database.ts
- src/app/App.tsx
- tests/unit/notifications-page.test.tsx

**Estado atual:** CORRIGIDO NO CÓDIGO — TESTE ATUALIZADO, MAS A SUÍTE AINDA NÃO FOI EXECUTADA.

---

## 7.15 Nutrição — PDF profissional, entrega administrativa e consulta gerencial
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A auditoria encontrou três responsabilidades diferentes misturadas na mesma condição de interface: atuação profissional da Nutrição, entrega administrativa e consulta gerencial. Também foi confirmado que a tela integrada criava o registro do documento nutricional, mas não gerava/armazenava o PDF oficial previsto no Index aprovado.

### Correções realizadas
- papel profissional continua sendo o único que cria/edita Plano Alimentar e gera o PDF Nutricional Oficial;
- o PDF passou a ser construído a partir do snapshot oficial retornado pelo banco, salvo em capo-documents/nutrition/<document_id>/...pdf e registrado por register_nutrition_pdf_for_interface;
- profissional pode visualizar/baixar o PDF e enviá-lo ao fluxo administrativo por register_nutrition_delivery_for_interface;
- Administrativo Operacional e Administrador recebem a lista de entregas e podem visualizar/baixar o PDF;
- reabertura de entrega encerrada aparece somente ao Administrador/Controlador, em conformidade com o backend;
- Coordenador deixou de chamar a RPC administrativa que não o autoriza;
- criada RPC somente leitura get_nutrition_documents_for_management para Administrador e Coordenador consultarem metadados/PDFs sem editar conteúdo profissional;
- rota /nutricao permanece acessível ao profissional de Nutrição, Administrador, Administrativo Operacional e Coordenador, mas cada contexto recebe somente as ações compatíveis.

### Caminhos alterados
- Supabase: get_nutrition_documents_for_management
- supabase/migrations/20260926223000_add_nutrition_management_document_read.sql
- src/lib/supabase/rpc.ts
- src/types/database.ts
- src/features/nutrition/NutritionPage.tsx
- src/app/route-access.ts

### Conferência interna
Foram relidas as RPCs get_nutrition_context_for_interface, create_nutrition_document_for_interface, register_nutrition_pdf_for_interface, get_nutrition_document_for_interface, get_nutrition_admin_deliveries_for_interface e manage_nutrition_admin_delivery_for_interface, além das policies de leitura/gravação do bucket privado capo-documents. A nova RPC gerencial foi relida após a migração. A suíte automatizada ainda não foi executada.

**Estado atual:** CORRIGIDO NO CÓDIGO/BANCO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.16 Relatórios — filtros gerenciais e leitura das métricas estruturadas
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

O dashboard gerencial retornado pelo Supabase é estruturado em blocos aninhados (pacientes, agenda, filas, faltosos, solicitações, encaminhamentos, Odontologia, Transporte, encerramentos, Social, Receita, Nutrição e familiares). A interface, porém, lia somente valores escalares no primeiro nível e por isso podia exibir o dashboard como vazio mesmo com métricas reais.

### Correções realizadas
- relatórios de Administrador/Coordenador passaram a exibir os blocos reais retornados pelo backend;
- período inicial/final ficou selecionável na própria visão gerencial;
- filtro de especialidade passou a usar specialty_options retornado pelo backend;
- agenda por especialidade passou a ser exibida com válidos, realizados, faltas, retornos e absenteísmo;
- quando uma conta acumula função gerencial e profissional, o acesso gerencial aos Relatórios não é ocultado pelo vínculo profissional.

### Caminho alterado
- src/features/reports/ReportsPage.tsx

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.17 TI / Manutenção — processamento dos chamados
**Data:** 25/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

O Painel Técnico já consultava dashboard, Estado do Sistema, integrações, logs, chamados e histórico, mas a interface não estava ligada ao contrato físico que processa chamados. Assim, o módulo Chamados Recebidos funcionava apenas como leitura.

### Correções realizadas
- process_technical_support_request_for_interface foi registrado na camada CAPO;
- integração técnica passou a expor iniciar, solicitar teste, resolver e cancelar chamados;
- tela de Chamados recebeu resposta/justificativa técnica e ações condicionadas ao status real;
- após cada ação confirmada pelo banco, o snapshot e o histórico do chamado são recarregados;
- nenhuma ferramenta fictícia de manutenção, URL de IA ou estado de sistema foi inventado.

### Caminhos alterados
- src/lib/supabase/rpc.ts
- src/types/database.ts
- src/features/technical/technical-integration.ts
- src/features/technical/TechnicalPage.tsx

### Contratos físicos confrontados
- get_technical_dashboard_for_interface
- get_technical_system_status_for_interface
- get_technical_integrations_for_interface
- get_technical_runtime_logs_for_interface
- get_technical_support_requests_for_interface
- get_technical_support_history_for_interface
- process_technical_support_request_for_interface

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.18 Solicitações Administrativas — papel profissional canônico e contingência da Coordenação
**Data:** 26/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A interface ainda reconhecia papéis legados ligados a especialidades para permitir criação de solicitações. O contrato físico utiliza vínculo profissional real e o papel canônico profissional. Além disso, o backend autoriza a Coordenação por has_full_access() a assumir a rotina administrativa quando necessário, mas a interface não expunha as ações correspondentes.

### Correções realizadas
- removida dependência de papéis legados de especialidade na criação/consulta de Solicitações;
- criação profissional passou a depender somente de vínculo profissional + papel profissional;
- Coordenação passou a poder executar as mesmas ações de contingência que o backend já autoriza: iniciar, registrar providência, devolver, concluir, recusar e cancelar quando cabível;
- histórico e contrarreferência permanecem preservados pelo contrato físico.

### Caminho alterado
- src/features/requests/RequestsPage.tsx

### Evidência física confrontada
- create_administrative_request_for_interface exige vínculo profissional;
- get_administrative_requests_for_interface considera Administrador, Administrativo Operacional e Coordenador na visão ampliada;
- update_administrative_request_for_interface usa has_full_access() ou Administrativo Operacional para ações administrativas;
- administrative_requests possui trigger de auditoria e trigger de notificação.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---

## 7.19 Encaminhamento Interprofissional — emissão por capacidade e recebimento pelo destinatário
**Data:** 26/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A regra estrutural determina que Encaminhamento Interprofissional não é automático por profissão: a emissão depende da capacidade delegável encaminhamento_interprofissional. Porém, depois que o Administrativo atribui um encaminhamento, o profissional destinatário precisa conseguir abrir o módulo e atuar mesmo que não possua capacidade de emissão.

### Correções realizadas
- rota /encaminhamentos passou a aceitar profissional real como destinatário potencial;
- o botão/módulo de Encaminhamentos continua oculto na navegação do profissional comum quando ele não possui a capacidade delegada de emissão;
- notificações ou contexto direto podem abrir o encaminhamento recebido, submetidos ao canAccessAppRoute;
- criação continua condicionada à capability encaminhamento_interprofissional dentro da própria tela;
- Coordenação passou a receber as ações de contingência que o backend já autoriza por has_full_access();
- testes de rota foram atualizados para cobrir destinatário profissional sem capacidade de emissão.

### Caminhos alterados
- src/app/route-access.ts
- src/components/navigation/navigation-config.ts
- src/features/referrals/ReferralsPage.tsx
- tests/unit/route-access.test.ts

### Evidência física confrontada
- create_interprofessional_referral_for_interface exige a capability encaminhamento_interprofissional;
- get_interprofessional_referrals_for_interface permite ao profissional ver o que enviou ou o que foi atribuído a ele;
- get_interprofessional_referral_targets_for_interface seleciona profissional ativo da especialidade de destino;
- update_interprofessional_referral_for_interface separa ações do Administrativo, destinatário e solicitante.

**Estado atual:** CORRIGIDO NO CÓDIGO — TESTES ATUALIZADOS, MAS A SUÍTE AINDA NÃO FOI EXECUTADA.

---

## 7.20 Faltosos — automação da Falta e contingência da Coordenação
**Data:** 26/09/2026  
**Estado:** 🟡 DIVERGENTE E CORRIGIDO

A auditoria confirmou fisicamente que Faltosos é um fluxo próprio, separado de Busca Ativa. O gatilho trg_patient_no_show cria/aciona o acompanhamento quando a agenda recebe attendance_status='faltou'. A rotina administrativa principal é do Auxiliar Administrativo; a Coordenação possui contingência operacional e o backend já a autoriza por has_full_access(), mas a tela permitia apenas consulta ao Coordenador.

### Correções realizadas
- Coordenação passou a poder registrar contato/providência e solicitar remarcação quando assumir contingência;
- Assistência Social continua fora do fluxo de Faltosos;
- Busca Ativa permanece separada e não recebe automaticamente uma Falta;
- remarcação de Faltoso continua gerando solicitação administrativa própria e o gatilho close_no_show_followup_after_reschedule encerra o acompanhamento quando a remarcação efetiva é registrada.

### Caminho alterado
- src/features/no-shows/NoShowsPage.tsx

### Evidência física confrontada
- trg_patient_no_show em patient_appointments;
- handle_patient_no_show;
- get_no_show_followups_for_interface;
- register_no_show_contact_for_interface;
- request_no_show_rescheduling_for_interface;
- trg_close_no_show_followup_after_reschedule.

**Estado atual:** CORRIGIDO NO CÓDIGO — AGUARDANDO TESTE INTERNO E OPERACIONAL.

---


## 16.1 CONSOLIDAÇÃO DE CONTINUIDADE APÓS TRAVAMENTOS DE CHAT
**Data da consolidação:** 26/09/2026  
**Finalidade:** eliminar duplicações de retomada e fixar um único ponto de continuidade.

Esta consolidação foi feita comparando:
1. o conteúdo físico atual deste Documento Mestre;
2. o índice do Manual Estrutural vigente;
3. o estado físico atual do código/banco nos pontos alterados após o último registro.

### Regra anti-loop aplicada nesta consolidação

A partir deste ponto, os itens listados como **JÁ AUDITADOS/CORRIGIDOS** não devem voltar para a fila de auditoria inicial. Eles só podem ser reabertos se houver:
- evidência física nova de regressão;
- falha em teste;
- divergência comprovada com documento normativo vigente;
- dependência técnica inevitável formalmente identificada.

A existência de **teste interno ou operacional ainda pendente** não significa que o item precisa ser auditado novamente desde o início.

### JÁ AUDITADOS/CORRIGIDOS E REGISTRADOS NESTE DOCUMENTO

1. Renovação de Receita — integração base.
2. Contexto principal e funções acumuladas.
3. Painel e navegação do Gestor/Titular.
4. Agenda — catálogo real e ações de presença.
5. Busca Ativa separada da Oferta Inicial.
6. Fila profissional e pendências administrativas.
7. Especialidades efetivas no contexto de acesso.
8. Retorno próprio e remarcação do profissional.
9. Acompanhamento Social a partir do agendamento confirmado.
10. Familiar/Cuidador e Luto.
11. Transporte, inclusive documento/PDF e etapa administrativa.
12. Odontologia, inclusive autoria, PDF e etapa administrativa.
13. Encerramentos por especialidade e ciclos de retorno.
14. Notificações e abertura do contexto correspondente.
15. Nutrição — PDF profissional, entrega administrativa e consulta gerencial.
16. Relatórios gerenciais.
17. TI / Manutenção — processamento de chamados.
18. Solicitações Administrativas.
19. Encaminhamento Interprofissional.
20. Faltosos e separação da Busca Ativa.

### CORREÇÕES POSTERIORES ÀS SEÇÕES 7.1–7.20, JÁ PRESENTES NO ESTADO FÍSICO ATUAL

Os pontos abaixo foram executados após o último registro sequencial do Documento Mestre e passam a integrar formalmente a continuidade desta auditoria. Eles **não devem ser reiniciados do zero**:

- catálogo dinâmico de capacidades profissionais integrado à Gestão de Equipe;
- concessão automática de `encaminhamento_interprofissional` por especialidade desativada, preservando concessão individual;
- gerenciamento temporário da própria agenda restaurado;
- parâmetros nulos corretos em remarcação e bloqueios de agenda;
- painel comum de Aniversariantes restaurado nos contextos profissionais auditados;
- WhatsApp contextual do paciente centralizado em consulta autorizada ao banco;
- WhatsApp próprio do familiar restaurado;
- indicador de vulnerabilidade da Assistência Social integrado ao alerta mínimo autorizado da Nutrição;
- Fila de Pacientes restaurada como fila visual única, com especialidade na linha e abertura contextual da Agenda;
- Fila de Familiares / Psicologia integrada ao cruzamento de vaga, prioridade e incompatibilidade profissional;
- solicitação administrativa de interesse psicológico do familiar conectada à Fila de Familiares;
- cadastro administrativo do paciente com consulta e edição pelo contrato físico existente;
- baixa da Fila de Pacientes vinculada ao agendamento confirmado;
- Renovação de Receita refinada para decisões estruturadas **Receita renovada** e **Necessita consulta**;
- consulta necessária da Renovação de Receita vinculada ao agendamento real do Clínico antes da conclusão administrativa;
- remarcação de Faltosos aberta de forma contextual na Agenda;
- data do agendamento original separada da data da nova vaga na remarcação;
- fluxo acumulado do Gestor voltou a expor Filas.

**Estado deste conjunto:** CORRIGIDO NO CÓDIGO/BANCO CONFORME A AUDITORIA CORRETIVA — ainda sujeito à suíte de testes, build, validação visual e teste operacional final.

---

## 16.2 O QUE REALMENTE AINDA NÃO ESTÁ FECHADO

A comparação entre este Documento Mestre e o índice do Manual Estrutural mostra que o restante não é repetir módulos já tratados. O que falta é **fechar a cobertura estrutural integral por perfil e a validação final do conjunto**.

### TAREFA RESTANTE A — Fechamento estrutural por perfil

Ainda precisam de um fechamento explícito, ponta a ponta, contra todo o organograma de seu perfil no Manual Estrutural:

- **Coordenador** — tela principal, equipe/disponibilidade/agenda, contingências e relatórios como conjunto único;
- **Auxiliar Administrativo** — estrutura completa do fluxo operacional, inclusive o bloco atualizado do Manual Estrutural sobre Cadastro + Oferta CAPO + Agendamento;
- **Assistência Social** — fechar a estrutura integral do perfil em uma única conclusão, incorporando Acompanhamento Social, Familiar/Cuidador, Luto, Vulnerabilidade, Transporte e demais funções já corrigidas sem reauditá-las do zero;
- **Clínico Geral** — fechar o perfil completo além da Renovação de Receita já tratada;
- **Profissional Assistencial Padrão** — Psicologia, Fisioterapia e futuras especialidades, incluindo agenda, atendimento, retorno, busca de paciente e permissões;
- **Gestor/Titular** — fechar Administração do Sistema e Gestão de Equipe como conjunto integral, preservando o que já está corrigido/congelado.

### TAREFA RESTANTE B — Fechamento transversal do Manual Estrutural

Ainda falta uma verificação matricial única, sem refazer os módulos, cobrindo os capítulos transversais do Manual:

- Modelo Geral da Interface;
- Padrão Transversal das Agendas Profissionais;
- Modelo Geral dos Profissionais Assistenciais;
- matriz de Contas, Funções, Especialidades e Permissões;
- matriz de Agenda e Comparecimento;
- matriz Paciente × Especialidades;
- matriz de Automações de Fluxo;
- matriz de Notificações;
- matriz de Funções Próprias das Especialidades;
- matriz de Relatórios;
- matriz de Permissões Acumuladas e Contexto Principal.

Esta etapa deve somente identificar lacunas ainda não cobertas pelas correções já registradas. Não deve reabrir item verde/corrigido sem evidência nova.

### TAREFA RESTANTE C — Fechamento técnico, visual e operacional

Após A e B:

- executar typecheck;
- executar suíte automatizada;
- corrigir somente falhas comprovadas;
- executar build;
- fazer auditoria visual final contra o Manual da Interface e os layouts vigentes;
- validar publicação atual;
- executar testes operacionais dos fluxos que estão marcados como aguardando teste;
- transformar os blocos aprovados em **🟢 CONGELADOS**;
- registrar somente eventuais 🟡 pendências reais;
- fechar o relatório final e gerar o PDF de continuidade.

### Conclusão da consolidação

O estado correto da auditoria passa a ser:

- **não** há necessidade de reiniciar Nutrição, Transporte, Odontologia, Encerramentos, Relatórios, TI, Familiar/Cuidador, Luto, Solicitações, Encaminhamentos ou Faltosos;
- esses blocos permanecem no estágio de correção já registrada + validação final correspondente;
- o trabalho restante concentra-se no **fechamento integral dos perfis**, na **matriz transversal final** e nos **testes/validação/congelamento**.

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

---

# 20. TAREFA 1 — FECHAMENTO ESTRUTURAL POR PERFIL (26/09/2026)

**Fontes normativas consultadas:** Especificação Estrutural da Interface, seções 3–7 e atualização sobre competência documental (12/09/2026); regras de continuidade e anti-loop das seções 16 e 19 deste documento. **Fontes físicas:** GitHub `danielecarvalho45/caposistema`, base `063bc82`, e assinaturas/definições das RPCs existentes no projeto Supabase `CAPO SISTEMA`. Este registro não substitui as seções 7.1–7.20 e as correções posteriores já congeladas. As alterações abaixo são pontuais, fundadas em divergências físicas novas.

## 20.1 Coordenador — percorrido

- **Correto:** contexto principal e módulo adicional conforme papel; painel de Coordenação, agendas da equipe, pacientes administrativos, filas, faltosos gerenciais, Busca Ativa gerencial, solicitações, decisões estruturais de agenda, relatórios, timeline, auditoria, contingência e suporte possuem caminhos físicos; a RPC de equipe restringe administrador/coordenador e a de Busca Ativa deixa decisões operacionais para administrador/auxiliar.
- **Divergente:** painel não exibia especialidades, produtividade nem disponibilidade, embora a RPC já as devolvesse; justificativa de alteração de agenda era lida de `reason`, enquanto a RPC devolve `justification`.
- **Corrigido:** painel exibe nomes de especialidades, atendimentos realizados e dias com disponibilidade (nome fiel à contagem da RPC), situação e atividades; justificativa lê o campo real.
- **Arquivos/RPCs:** `src/features/coordination/CoordinationDashboard.tsx`; somente leitura das RPCs `get_coordinator_team_overview_for_interface` e `get_agenda_change_requests_for_interface`; nenhuma RPC alterada.
- **Teste final:** conferir renderização com conta real de Coordenador, métricas e decisões em agenda real; manter homologação operacional anteriormente pendente.

## 20.2 Auxiliar Administrativo — percorrido

- **Correto:** contexto operacional; cadastro do paciente com Oferta CAPO integrada e número gerado pelo banco; Agenda Geral; fila, faltosos, solicitações, transporte apenas na fase administrativa, receita, odontologia, familiar/cuidador, encerramentos e notificações permanecem cobertos pelos fluxos anteriormente corrigidos. Não há gerenciador de agenda própria nem emissão profissional de PDF.
- **Divergente:** não havia rota/navegação da Busca Ativa apesar da permissão expressa na RPC; link no resultado do paciente levava ao módulo reservado ao Gestor; óbito administrativo era autorizado pela RPC mas a única interface para registrá-lo estava em rota exclusiva do Gestor; rota de relatórios vedava o Auxiliar.
- **Corrigido:** rota `/busca-ativa` e navegação para administrador/auxiliar; link de familiar autorizado no resultado do paciente; ação de óbito com confirmação do banco dentro da consulta de paciente; relatórios operacionais limitados e explicitamente identificados como até 50 registros reais de pendências e faltosos, sem expor o dashboard gerencial. Alinhada à assinatura da RPC a chamada de agendamento de familiar na fila e conectadas duas RPCs existentes à tela de Solicitações.
- **Arquivos/RPCs:** `src/app/App.tsx`, `src/app/route-access.ts`, `src/components/navigation/navigation-config.ts`, `src/features/patients/PatientsPage.tsx`, `src/components/patients/RegisterPatientDeath.tsx`, `src/features/queues/QueuePage.tsx`, `src/features/reports/ReportsPage.tsx`, `src/features/reports/AdministrativeOperationalReport.tsx`, `src/lib/supabase/rpc.ts`; contratos existentes `register_patient_death_for_interface`, `get_active_searches_for_interface`, `register_active_search_attempt_for_interface`, `get_family_psychology_request_context_for_interface`, `add_family_to_waiting_list_for_interface`, `create_family_psychology_appointment_for_interface`, `get_pending_items_for_interface`, `get_no_show_followups_for_interface`; nenhuma RPC alterada.
- **Teste final:** validar os estados e ações com conta real de Auxiliar; confirmar se as duas relações operacionais bastam para os indicadores exigidos na rotina; conferir cadastro → Oferta CAPO → primeiro agendamento em operação real.

## 20.3 Assistência Social — percorrida

- **Correto:** Minha Agenda; acompanhamento social ativo/encerrado; vulnerabilidade mínima; familiar/cuidador, luto, transporte com capacidade, solicitações e encaminhamento condicionado, encerramento próprio e relatórios da área; Faltosos continua fora do perfil. O backend restringe óbito a Gestor/Auxiliar/Assistência Social vinculada.
- **Divergente:** a interface social não oferecia o registro autorizado de óbito, nem a lista somente dos nomes das especialidades que acompanham o paciente, apesar das RPCs específicas.
- **Corrigido:** ações de óbito e consulta apenas de nomes das especialidades no paciente confirmado da agenda, sem datas, horários ou conteúdo alheio.
- **Arquivos/RPCs:** `src/features/social/SocialPage.tsx`, `src/components/patients/RegisterPatientDeath.tsx`, `src/components/patients/PatientCareSpecialties.tsx`; RPCs existentes `register_patient_death_for_interface` e `get_patient_care_specialties_for_professional_interface` não modificadas.
- **Teste final:** validar seleção de paciente real autorizado, consulta de especialidades e bloqueios da RPC; óbito somente com caso legítimo, nunca com dados fictícios.

## 20.4 Clínico Geral — percorrido

- **Correto:** contexto próprio de agenda; ações de presença/falta e retorno; pacientes vinculados e fila própria; solicitação; receita apenas como devolutiva operacional, sem prescrição no CAPO; encaminhamento condicionado à capacidade individual; encerramento da própria especialidade e relatório da área. O nome físico da especialidade no banco é `Clínica Geral` e coincide com a detecção normalizada no código.
- **Divergente:** a atuação comum não mostrava quais outras especialidades acompanham o paciente.
- **Corrigido:** lista mínima de nomes no resultado de paciente autorizado, consultada na RPC que valida o vínculo profissional.
- **Arquivos/RPCs:** `src/features/professional/AssistentialPage.tsx`, `src/components/patients/PatientCareSpecialties.tsx`; leitura de `get_patient_care_specialties_for_professional_interface`; nenhuma RPC alterada.
- **Teste final:** autenticação real de Clínico, devolutiva de receita e retorno próprio com vaga real; consulta de nomes restrita a paciente vinculado.

## 20.5 Profissional Assistencial Padrão — percorrido

- **Correto:** estrutura comum para Psicologia, Fisioterapia e especialidades futuras depende do cadastro de especialidade no banco; agenda própria, pacientes vinculados, fila, solicitações, relatórios, encerramento próprio e suporte têm rotas; Encaminhamento Interprofissional no menu depende da capacidade individual, sem concessão automática por especialidade.
- **Divergente:** não se exibiam as especialidades que acompanham o paciente; a navegação ocultava Minha Atuação de quem acumulasse Assistência Social/Nutrição com outra especialidade comum.
- **Corrigido:** lista de nomes restrita ao paciente vinculado e Minha Atuação preservada quando também houver especialidade assistencial comum efetiva.
- **Arquivos/RPCs:** `src/features/professional/AssistentialPage.tsx`, `src/components/patients/PatientCareSpecialties.tsx`, `src/components/navigation/navigation-config.ts`; leitura de `get_patient_care_specialties_for_professional_interface`; nenhuma RPC alterada.
- **Teste final:** conta real de cada especialidade, função acumulada e futura especialidade cadastrada no sistema; retorno, fila e autorização de encaminhamento.

## 20.6 Gestor/Titular — percorrido

- **Correto:** preservar o painel, cabeçalho, rodapé, status, famílias e fluxos já corrigidos nas seções anteriores; rotas de equipe/administração, Agenda Geral, auditoria, timeline, relatórios, TI, suporte e visão administrativa dos documentos; o Gestor não assume autoria de PDF odontológico/nutricional. Cadastro da equipe já contém papéis, especialidades dinâmicas, situação ativa/inativa e contexto principal.
- **Divergente:** catálogo de capacidades era usado sem estado nem método de serviço declarados e os botões de atribuir capacidade referiam funções inexistentes; a alteração de situação podia deixar a ficha selecionada com estado antigo; não existia atalho à IA de desenvolvimento. A mesma tela atende aos acessos de Equipe e Administração, o que, por si só, não constitui divergência funcional comprovada. O Bloco 10 — Parâmetros e Configurações está **VERDE / CONGELADO** no Manual Técnico Integrado, seção de estado dos blocos; sua ausência de um editor genérico na interface não constitui prova de regressão e não autoriza reabrir o bloco.
- **Corrigido:** consulta real ao catálogo, ações individuais/especialidade com atualização pelo banco, limpeza da seleção após mutação, atalho externo à IA. Mantida a vedação à concessão automática de encaminhamento por especialidade.
- **Arquivos/RPCs:** `src/features/gestor/GestorTeamPage.tsx`, `src/features/gestor/GestorShell.tsx`; RPCs existentes `get_capability_catalog_for_interface`, `set_professional_capability_for_interface`, `set_specialty_capability_status_for_interface`; nenhuma RPC alterada.
- **Teste final:** cadastro, inativação/reativação e capacidades com conta real do Gestor; homologação do acesso aos módulos administrativos autorizados, preservando o Bloco 10 congelado.

**Estado da TAREFA 1:** **CONCLUÍDA E CONGELADA — FECHAMENTO ESTRUTURAL POR PERFIL**: os seis perfis foram percorridos e os pontos estruturais identificados estão classificados. A conclusão não equivale a homologação operacional: testes com contas reais permanecem indicados acima para a etapa final apropriada. Build de produção executado com sucesso; verificação tipada e lint apontaram falhas em testes e módulos fora das correções desta tarefa, registradas como pendências técnicas, sem iniciar Tarefa 2 ou Tarefa 3. Nenhuma conta real ou dado clínico fictício foi criado. **Retificação em 26/09/2026:** a suposta pendência de parâmetros gerais foi retirada por falta de regressão física comprovada; Bloco 10 permanece verde/congelado.

## 20.7 Testes internos direcionados — execução posterior autorizada em 26/09/2026

**Escopo acordado:** testar somente as correções da Tarefa 1; Supabase oficial apenas em leitura, sem criar ou modificar dados; testes operacionais de implantação ficam para depois.

- **PASSOU:** build de produção e `git diff --check`; 13 testes internos direcionados de autorização de rotas e solicitação de alteração de agenda passaram. Duas expectativas antigas de rota foram atualizadas para refletir as etapas administrativas já autorizadas de Odontologia e Nutrição ao Auxiliar; não houve ampliação de autorização no aplicativo para satisfazer teste.
- **CONTRATOS FÍSICOS CONFIRMADOS, SOMENTE LEITURA:** no Supabase oficial foram conferidas assinaturas/retornos de 12 RPCs usadas pelas correções de Coordenação, Busca Ativa, especialidades do paciente, óbito, capacidades, fila de Psicologia e alterações de agenda. Não houve execução de mutações, cadastro de dados, migration nem alteração de políticas.
- **AINDA NÃO PASSOU:** a seleção inicial de seis arquivos de testes totalizou 32 casos: 17 passaram e 15 falharam. As falhas são concentradas em testes legados que montam Gestor/Equipe sem o novo método de consulta ao catálogo de capacidades, montam Solicitações fora do roteador e verificam rótulos/links antigos; também houve falha na navegação para Luto no teste social. A execução sem configuração de ambiente falhou adicionalmente por falta da URL do Supabase nesta cópia isolada; com chave publicável e URL reais, sem sessão profissional e sem mutação, restaram as 15 falhas acima.
- **CLASSIFICAÇÃO:** os testes de roteamento e os contratos das RPCs confirmam parte das correções; os 15 testes antigos não fornecem aprovação para a interface Gestor/Social/Solicitações. Manter a validação interna desse conjunto **PENDENTE**, sem declarar a suíte aprovada e sem antecipar teste com conta real. Corrigir apenas os testes relevantes e confrontar eventuais falhas reais com a regra funcional antes de tocar código aprovado.

## 20.8 Confronto individual das 15 falhas com os documentos obrigatórios — sem editar testes

**Fontes funcionais de precedência:** `CAPO_MATRIZ_FUNCIONAL_DE_PERFIS_E_AUTOMACOES_2026-09-12.md`, seções 2, 6, 8, 9, 14, 15 e 18; `CAPO_ESPECIFICACAO_FUNCIONAL_ESTRUTURAL_DA_INTERFACE_2026-09-12.md`, seções 3–7. A especificação `CAPO_ESPECIFICACAO_ESTRUTURAL_DA_INTERFACE_2026-09-12.md` foi somente complementar. **Fonte técnica:** Manual Técnico Integrado v5 de 15/09/2026 (papéis, `primary_context`, RPCs, relatórios e proibição de sucesso simulado). Foram confrontados ainda os testes, o código GitHub atual e o erro exato da execução. **Nenhum dos 15 testes foi alterado nesta classificação.**

| Nº | Teste que falhou | Classificação do erro observado | Confronto e limite da conclusão |
|---:|---|---|---|
| 1 | `gestor-dashboard`: expõe painel geral e acessos do titular | **TESTE DESATUALIZADO** | Exige links Equipe/Auditoria/TI dentro do componente `GestorDashboard`; o organograma funcional da Matriz 6.1 prevê no painel os acessos rápidos, Cadastro de Profissional, Indicadores e Status; os demais módulos ficam na navegação `GestorShell`. O teste monta só o dashboard, sem o shell. |
| 2 | `gestor-dashboard`: edita profissional e recarrega equipe | **TESTE DESATUALIZADO** | O serviço injetado no teste não declara `getCapabilityCatalog`, requerido pelo cadastro dinâmico/capacidades da Matriz 6.3 e 14.1; falha antes de exercer a edição. Não comprova que a edição funcione. |
| 3 | `gestor-dashboard`: cadastra identidade e perfil | **TESTE DESATUALIZADO** | Mesmo serviço incompleto; após adequar o cenário, verificar também senha provisória vigente (o teste contém senha de seis dígitos) antes de interpretar eventual falha como regressão. |
| 4 | `gestor-dashboard`: nova especialidade principal | **TESTE DESATUALIZADO** | Mesmo serviço incompleto; a regra de especialidades dinâmicas permanece na Matriz 14.1 e na Especificação Funcional 5/7, portanto não fixar especialidades no código para satisfazer o teste. |
| 5 | `gestor-team-page`: inativar cadastro sem conta | **TESTE DESATUALIZADO** | A injeção de serviço omite `getCapabilityCatalog`; exceção ocorre na montagem, antes de chamar `setActive`. |
| 6 | `gestor-team-page`: salvar profissional sem conta | **TESTE DESATUALIZADO** | Mesmo contrato incompleto na montagem; o fluxo de edição ainda precisa ser testado após adequação do cenário. |
| 7 | `gestor-team-page`: novo profissional com conta | **TESTE DESATUALIZADO** | Mesmo contrato incompleto; cadastro com conta, papel e especialidade é exigido pela Matriz 6.5/14.1. |
| 8 | `gestor-team-page`: vincular conta sem duplicar perfil | **TESTE DESATUALIZADO** | Mesmo contrato incompleto, antes da ação; a regra é conta única/vínculo, sem segundo profissional. |
| 9 | `gestor-team-page`: ativos e inativação de conta vinculada | **TESTE DESATUALIZADO** | Mesmo contrato incompleto; não há evidência de falha real da filtragem/inativação com esses resultados. |
| 10 | `requests-page`: rótulos e visões administrativos | **TESTE DESATUALIZADO** | Monta `RequestsPage` sem `Router`; `useLocation()` falha antes da tela. Após ajustar o contexto de execução, conferir rótulos para o papel real: a Matriz 8.3/14.6 prevê ações administrativas, mas o teste injeta contexto profissional. |
| 11 | `requests-page`: estado vazio do contrato | **TESTE DESATUALIZADO** | Mesmo erro de montagem sem `Router`; o estado vazio não foi exercido. |
| 12 | `requests-page`: erro de leitura sanitizado | **TESTE DESATUALIZADO** | Mesmo erro de montagem; o tratamento de erro não foi exercido. |
| 13 | `requests-page`: criação e recarga | **TESTE DESATUALIZADO** | Mesmo erro de montagem; Matriz 14.6 exige criação/aviso/estados reais, cujo fluxo não foi exercido. |
| 14 | `requests-page`: sem confirmação sem recarga | **TESTE DESATUALIZADO** | Mesmo erro de montagem; o requisito de não simular sucesso continua vigente, mas não foi efetivamente testado. |
| 15 | `social-page`: link real de Luto | **TESTE DESATUALIZADO** | O cenário injeta `function_title` social e um carregador de especialidades, mas omite `accessContext.specialties` que a rota consulta; a Matriz 9 e Especificação Funcional 4.4 exigem Luto para profissional social autorizado, e o Manual Técnico v5 estabelece que especialidade/capacidade vem do contexto real, não do título da função. A página inteira não equivale ao contexto retornado pelo backend. |

**Veredito destes 15 erros observados:** 15 × **TESTE DESATUALIZADO** na causa imediata; 0 × **REGRESSÃO REAL comprovada por essas falhas**; 0 × **DEPENDÊNCIA DE TESTE OPERACIONAL como causa imediata**. Esta é classificação do *primeiro erro que interrompeu cada teste*, não declaração de que os requisitos passaram. Depois de adequar os cenários de teste aos contratos vigentes, eventuais novas falhas deverão ser classificadas de novo; os fluxos que exigem conta/permissão/dados reais permanecem para homologação operacional após implantação. Nenhuma função correta foi alterada para fazer teste antigo passar.

**Achado independente que não integra os 15 erros:** o relatório operacional novo do Auxiliar exibe contagens `state.data.length` de até 50 itens. O Manual Técnico v5 proíbe tratar tamanhos de listas de sessão como relatório oficial, e a Matriz 14.12/18.2 exige métricas com fonte física confiável. **REGRESSÃO REAL identificada na apresentação dessas contagens; não foi corrigida nesta etapa de classificação, não alterar Supabase sem ordem.** Não usar essa tela como relatório oficial até corrigir a apresentação/contrato.


## 20.9 Resultado dos oito testes da suíte ampliada — registro consolidado de 26/09/2026

**Resultado comunicado pela responsável:** 65 testes executados, 57 aprovados e 8 falhas. O registro local citado na comunicação não estava disponível nesta cópia de trabalho; os erros abaixo foram transcritos da comunicação. Nenhuma dessas oito falhas demonstra isoladamente uma regressão, e os fluxos interrompidos antes da ação ainda não foram validados.

| Teste | Erro observado comunicado | Próxima verificação necessária |
|---|---|---|
| Shell com contexto real | Não encontrou `Olá, Nome real`. | Confrontar título e contexto montado com a Matriz e a Especificação Funcional vigentes. |
| Fila no contexto administrativo | Não encontrou `Fila operacional`. | Confrontar título e rota com a regra administrativa vigente. |
| Pendências da fila | Não encontrou `Fila de espera — Nutrição`; `Link` sem roteador. | Montar o cenário com roteador e verificar dado/visibilidade reais. |
| Fila fora do contexto administrativo | O teste esperava ausência de `Fila`, mas o link apareceu. | Confrontar permissão por papel e contexto com a Matriz antes de decidir se há regressão. |
| Criar solicitação | `useLocation()` sem roteador. | Corrigir a montagem do teste e então exercitar o envio. |
| Bloquear solicitação sem autorização | `useLocation()` sem roteador. | Corrigir a montagem do teste e então exercitar o bloqueio. |
| Criar pedido de renovação de receita | Não encontrou `Buscar paciente`. | Verificar campo e fluxo previstos na Especificação Funcional antes de ajustar teste/código. |
| Decisão médica na renovação | Não encontrou `Observação da ação`. | Verificar etapa, papel e campo previstos antes de ajustar teste/código. |

**Estado:** **PENDÊNCIA — 8 FALHAS DA SUÍTE AMPLIADA.** As oito falhas permanecem abertas apenas para confronto e reexecução futura. Nenhuma delas está classificada, neste momento, como regressão real. Não alterar função correta do sistema nem reabrir módulo congelado apenas por causa dessas falhas. A retomada deve ocorrer a partir desta pendência, usando somente a documentação vigente fisicamente disponível no `main`.

## 20.10 Continuidade controlada — regressão do relatório do Auxiliar (26/09/2026)

- **Problema comprovado:** `AdministrativeOperationalReport.tsx` consultava páginas de até 50 pendências/faltosos e apresentava `data.length` como quantidade em “Relatórios Operacionais”. O Manual Técnico Integrado v5 proíbe usar tamanho de arrays da sessão como relatório oficial.
- **Correção cirúrgica:** a tela agora oferece acesso às relações atuais de `/fila` e `/faltosos`, sem consultar páginas limitadas para produzir contagens e sem apresentar essas contagens como métricas. Não foi criada outra métrica, não houve alteração no Supabase e nenhum bloco congelado foi reaberto.
- **Arquivos:** `src/features/reports/AdministrativeOperationalReport.tsx`; `tests/unit/administrative-operational-report.test.tsx` (verificação dos destinos reais e ausência da contagem limitada); este Documento Mestre.
- **Verificações:** 13/13 testes direcionados passaram (`administrative-operational-report` e `route-access`); `npm run build` passou. `npm run typecheck` falhou em **23 erros preexistentes de contratos de testes** em sete arquivos de `tests/unit/` (App, gestor-dashboard, gestor-team-page, renewal-prescription-page, requests-page, social-page e supabase-rpc), sem erros apontados nos arquivos alterados. Typecheck global permanece pendente; não se declarou aprovação geral.
- **Etapa dos oito testes:** os dois documentos funcionais exigidos não existem na árvore física do `main` consultado nesta execução. Por ordem expressa de usar **somente documentação vigente existente no próprio GitHub** e **não usar Library**, a classificação definitiva é bloqueada; nenhum dos oito foi reclassificado, alterado ou reexecutado nesta etapa. Necessário incorporar os documentos vigentes ao repositório antes de avançar às etapas 2–4, sem presumir seu teor nem substituir por documentação histórica.


## 20.10 Disposição mobile da interface — correção controlada de 26/09/2026

**Escopo:** somente disposição visual/responsiva em tela de celular. Nenhuma regra funcional, permissão, contrato Supabase, RPC, RLS, migration ou dado operacional foi alterado.

**Fonte de interface aplicada:** regra vigente do próprio Documento Mestre para problemas de Interface — preservar layout, disposição, navegação e padrões já aprovados — confrontada com a implementação física atual e com as referências responsivas aprovadas ainda presentes no GitHub. O arquivo independente denominado “Manual da Interface” não foi localizado fisicamente na árvore `main`; por isso nenhuma regra ausente foi inventada e nenhuma documentação histórica foi usada para criar comportamento novo.

### Divergências físicas encontradas e corrigidas

1. **Home em tela estreita**
   - A grade principal de acessos podia permanecer em múltiplas colunas no celular.
   - Correção: em viewport até 620 px, acessos rápidos, aniversariantes, resumo operacional e resumo de acesso passam a uma única coluna.
   - Os cards da Home foram compactados para evitar blocos excessivamente altos.
   - Nos contextos profissionais cuja primeira entrada é a agenda, a ordem física da Home permanece com a entrada de agenda acima do bloco de aniversariantes.

2. **Shell específico do Gestor/Titular**
   - O shell geral já utilizava sidebar recolhível no celular, mas o shell do Gestor convertia a sidebar em bloco estático, ocupando a tela antes do conteúdo.
   - Correção: o Gestor passa a usar menu lateral em gaveta, com botão de abrir, botão de fechar e backdrop.
   - Em até 600 px, atalhos, campos de busca, formulários e layouts de equipe do Gestor passam para uma coluna quando necessário.
   - Cabeçalho, boas-vindas, identidade CAPO, navegação, conteúdo funcional e permissões foram preservados.

### Arquivos alterados

- `src/features/home/home-page.css`
- `src/features/gestor/GestorShell.tsx`
- `src/features/gestor/gestor.css`

### Estado

**CONCLUÍDO E CONGELADO.** A disposição mobile foi corrigida no código e aceita como concluída pela responsável; eventual teste físico final permanece apenas como validação de encerramento, sem reabrir esta frente por dúvida genérica.

Por determinação da responsável, a homologação visual/operacional em aparelho ou viewport móvel será executada ao final dos trabalhos, e não nesta etapa.

### Regra anti-loop desta frente

Não reabrir a disposição mobile já corrigida por dúvida genérica ou por teste antigo. Reabrir somente se o teste operacional final apresentar divergência física reproduzível, ou se uma documentação normativa vigente do GitHub trouxer regra diferente e comprovável.


## 20.11 Ambiente público vigente do CAPO — referência oficial de 26/09/2026

**URL pública vigente:** `https://caposistema.pages.dev/`

Esta URL passa a ser a referência oficial do sistema CAPO publicado para verificações de interface, disposição, navegação e homologação operacional.

**Regra de continuidade:**
- usar `https://caposistema.pages.dev/` como ambiente público vigente;
- não usar URLs antigas de Workers/Pages já substituídas ou deletadas como referência de validação;
- sempre distinguir alterações feitas no repositório `main` da versão efetivamente publicada;
- antes de declarar uma correção como validada no ar, confirmar que o deploy correspondente está disponível neste endereço.

**Estado:** **CONCLUÍDO E CONGELADO.** Referência de ambiente registrada para impedir uso futuro de URL obsoleta.


### Decisão final da responsável — Tarefa 1 (26/09/2026)

**TAREFA 1: CONCLUÍDA E CONGELADA.**

A Tarefa 1 não deve ser reaberta por teste antigo, dúvida genérica, reinterpretação documental ou achado fora de seu escopo.

Qualquer necessidade futura que possa afetar item pertencente à Tarefa 1 deve:
1. ser confrontada primeiro com o Manual Estrutural vigente e com a evidência física atual;
2. ser apresentada à responsável;
3. somente reabrir a Tarefa 1 mediante autorização explícita da responsável.

Pendências já registradas que pertençam a etapas posteriores permanecem separadas e não alteram o estado de conclusão da Tarefa 1.


# 21. TAREFA 2 — FILA OPERACIONAL DO ADMINISTRATIVO (26/09/2026)

## 21.1 Início controlado e confronto físico

**Estado:** **INICIADA — IMPLEMENTAÇÃO TÉCNICA CONFORME — AGUARDANDO HOMOLOGAÇÃO OPERACIONAL FINAL.**

A Tarefa 2 foi retomada somente após o fechamento da Tarefa 1, sem reabrir qualquer bloco congelado.

### Base documental e física confrontada

- `TAREFA_02_FILA_OPERACIONAL_ADMINISTRATIVO.md`;
- `CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md`;
- código atual do `main`;
- contrato físico atual da RPC `public.get_pending_items_for_interface(p_limit integer, p_offset integer)` no projeto oficial Supabase `fftebavlhbfcrvrtnrld`.

### Resultado da verificação

1. A RPC `get_pending_items_for_interface` existe fisicamente com o contrato tipado esperado.
2. A função exige sessão autenticada, aceite do termo vigente e conta ativa.
3. O papel `administrativo_operacional` é reconhecido fisicamente pela função.
4. O ramo `waiting_list` contém autorização explícita para AO (`v_is_ao`), preservando a correção registrada para o Bloco 1D-B.
5. A função permanece `SECURITY DEFINER`, com `search_path` explícito, execução permitida a `authenticated` e negada a `anon`; a autorização funcional é repetida no corpo.
6. O frontend atual possui contrato tipado, transporte RPC e renderização da fila real.
7. A rota `/fila` mantém o fluxo do Administrativo Operacional e também contempla evoluções posteriores já presentes no projeto para Administração, Coordenação e profissionais em contexto autorizado. Essa ampliação não invalida o fluxo AO da Tarefa 2 e não foi revertida.
8. Não foi encontrada divergência objetiva que exija correção nesta etapa.
9. Nenhum dado fictício foi criado, nenhuma migration foi aplicada e nenhum bloco congelado foi reaberto.

### Teste operacional

Por decisão da responsável, a homologação física/operacional será realizada ao final dos trabalhos. Portanto, não criar pendência artificial apenas pela ausência desse teste neste momento.

Roteiro final já previsto:
- conta AO real/autorizada;
- retorno com itens;
- retorno sem itens;
- negação para contexto não autorizado quando aplicável;
- sessão inválida/expirada;
- conferência do ambiente publicado `https://caposistema.pages.dev/`.

### Estado desta etapa

**IMPLEMENTAÇÃO TÉCNICA CONFORME — AGUARDANDO TESTE OPERACIONAL FINAL.**

Não reabrir Tarefa 1 nem blocos congelados por causa da Tarefa 2 sem autorização expressa da responsável.


## 21.2 Fechamento técnico automático da Tarefa 2 — 26/09/2026

**Resultado:** **TAREFA 2 CONCLUÍDA NA IMPLEMENTAÇÃO TÉCNICA — AGUARDANDO SOMENTE HOMOLOGAÇÃO OPERACIONAL FINAL.**

Confronto realizado com:
- Manual Técnico Integrado v5 vigente no `main`;
- `TAREFA_02_FILA_OPERACIONAL_ADMINISTRATIVO.md`;
- código físico atual da SPA;
- contrato físico atual do Supabase oficial.

### Conclusões

- O Manual v5 registra o Bloco 1D-B como corrigido e integrado à SPA.
- A RPC `get_pending_items_for_interface(p_limit integer, p_offset integer)` permanece implantada, autenticada e com autorização AO explícita no ramo `waiting_list`.
- O frontend possui contrato tipado, wrapper RPC e renderização de estados reais.
- A fila atual encaminha pendências somente para destinos conhecidos/autorizados; não inventa resolução local.
- Contratos específicos de lista de espera já existem fisicamente para leitura, inclusão, atualização de status e conclusão de agendamento.
- O documento `PENDENCIA_FILA_20260921.md` foi reclassificado como histórico/não bloqueante para esta tarefa; não existe base no Manual v5 para criar RPCs genéricas de “assumir” ou “resolver” pendência apenas por causa daquele registro.
- Nenhuma correção de código ou banco foi necessária neste fechamento.
- Nenhum bloco congelado foi reaberto.
- Nenhuma nova pendência foi criada.

### Única validação restante

A homologação real 1E permanece reservada para o encerramento geral dos trabalhos, por decisão da responsável, cobrindo conta AO real, retorno com/sem itens, autorização e sessão.

**Importante:** essa homologação final não impede considerar a implementação técnica da Tarefa 2 encerrada. O **Bloco 1**, porém, só poderá ser declarado congelado depois da 1E, conforme o Manual v5.

**Estado:** **TAREFA 2 — CONCLUÍDA TECNICAMENTE.**


# 22. TAREFA 3 — FALTOSOS (26/09/2026)

## 22.1 Confronto físico e fechamento técnico automático

**Resultado:** **TAREFA 3 CONCLUÍDA NA IMPLEMENTAÇÃO TÉCNICA — AGUARDANDO SOMENTE HOMOLOGAÇÃO OPERACIONAL FINAL.**

### Base confrontada

- `TAREFA_03_AUDITORIA_FALTOSOS.md`;
- Manual Técnico Integrado v5 vigente no `main`;
- código físico atual da SPA;
- contratos, triggers e estado físico atual do Supabase oficial `fftebavlhbfcrvrtnrld`.

### Conclusões

- A separação funcional entre **Faltosos** e **Busca Ativa** permanece implementada.
- O histórico de contatos usa `patient_no_show_contacts`, sem reaproveitar `patient_active_searches`.
- As RPCs canônicas de Faltosos continuam implantadas.
- A autorização da rota e da operação permanece restrita aos papéis administrativos definidos no fluxo; profissional não recebe operação de acompanhamento.
- A falta registrada na agenda continua alimentando automaticamente o acompanhamento.
- Notificação, auditoria e timeline do fluxo permanecem implantadas.
- A remarcação de origem `faltoso` possui fechamento/vínculo automático do acompanhamento.
- A SPA consome os contratos reais e não fabrica dados ou sucesso local.
- O banco possui atualmente 0 acompanhamentos de faltosos, 0 contatos de faltosos e 0 registros legados `no_show` em Busca Ativa; por isso não foi criado dado artificial para teste.
- Nenhuma divergência objetiva exigiu correção nesta retomada.
- Nenhuma nova pendência foi criada.
- Nenhum bloco congelado foi reaberto.

### Validação restante

A homologação operacional real será executada ao final dos trabalhos, conforme decisão da responsável, cobrindo o ciclo completo falta → acompanhamento → contato → remarcação/encerramento → histórico/notificação/auditoria, além de autorização e sessão.

A ausência atual de dados reais não é tratada como nova pendência técnica.

**Estado:** **TAREFA 3 — CONCLUÍDA TECNICAMENTE.**


# 23. TAREFA 2 OFICIAL — FECHAMENTO TRANSVERSAL DO SISTEMA
## BLOCO 2A — Estrutura transversal e contexto (26/09/2026)

**Escopo deste bloco:**
- Modelo Geral da Interface;
- padrão transversal das agendas;
- modelo geral dos profissionais assistenciais;
- contas, funções, especialidades e permissões;
- contexto principal;
- funções acumuladas;
- roteamento por contexto.

**Regra de continuidade:** as seções antigas denominadas Tarefa 2/Fila e Tarefa 3/Faltosos pertencem à numeração histórica dos documentos técnicos do repositório. A sequência oficial desta auditoria final é Tarefa 1 → Tarefa 2 transversal → Tarefa 3 final.

### 23.1 Levantamento prévio

Antes de qualquer correção, foram preservados os pontos já auditados na Tarefa 1 e nas seções 7.x deste Documento Mestre. Não foram reabertos perfis congelados nem repetidas correções já registradas.

O arquivo separado denominado Manual Estrutural não está presente como documento textual independente na árvore atual do `main`. As regras estruturais fisicamente acessíveis e já consolidadas neste Documento Mestre e no Manual Técnico Integrado v5 foram usadas para o confronto. A ausência do arquivo separado não foi transformada em pendência artificial.

### 23.2 Estado físico confirmado

- `get_my_access_context()` continua devolvendo papéis, capacidades, especialidades efetivas e `primary_context`.
- `resolve_user_primary_context()` continua priorizando papel marcado como principal; conta com múltiplos papéis sem principal exige configuração em vez de escolher prioridade em JavaScript.
- `set_team_member_primary_context_for_interface()` continua restrita ao Administrador/Controlador e aceita somente papel ativo já atribuído à conta.
- capacidades efetivas continuam sendo compostas por especialidade + exceção individual, somente para profissional ativo.
- não foram encontradas contas ativas com mais de um papel principal ou múltiplos papéis sem principal configurado.
- não foram encontradas especialidades principais ambíguas entre profissionais ativos.
- não existem contas ativas vinculadas a profissional inexistente ou inativo.
- as especialidades físicas ativas permanecem dinâmicas no banco; não foi introduzida lista fixa de especialidades no frontend.

### 23.3 Lacuna transversal nova comprovada — rotas compartilhadas e contexto principal

Foi comprovado que três rotas compartilhadas podiam escolher a visão pela mera existência de papel acumulado, ignorando o `primary_context`:

1. **Agenda**
   - conta com papel `profissional` acumulado era tratada como agenda própria mesmo quando o contexto principal era Administração/Coordenação/AO;
   - correção: a visão profissional da Agenda exige agora `primary_context.code = 'profissional'`;
   - papéis acumulados continuam autorizados e não foram removidos.

2. **Fila**
   - qualquer papel administrativo acumulado forçava a visão administrativa da fila, mesmo quando o contexto principal era profissional;
   - correção: a visão administrativa passa a seguir contexto principal Administrador/AO/Coordenador; a fila da própria especialidade segue contexto principal Profissional.

3. **Relatórios**
   - uma conta AO com papel profissional acumulado podia cair no relatório assistencial, porque a tela só reconhecia AO quando ele fosse o único papel;
   - correção: o relatório operacional do AO passa a ser escolhido por `primary_context.code = 'administrativo_operacional'`.

**Fundamento:** a correção já registrada em 7.2 estabelece que o contexto principal deve ser respeitado sem apagar funções acumuladas. Funções acumuladas dão acesso adicional, mas não devem substituir silenciosamente a visão principal em uma rota compartilhada.

### 23.4 Arquivos alterados

- `src/features/agenda/AgendaPage.tsx`
- `src/features/queues/QueuePage.tsx`
- `src/features/reports/ReportsPage.tsx`
- `tests/unit/AgendaPage.test.tsx`
- `tests/unit/App.test.tsx`
- `tests/unit/administrative-operational-report.test.tsx`

### 23.5 Alinhamentos de testes diretamente ligados ao Bloco 2A

- adicionado cenário de Agenda com papel profissional acumulado e contexto principal Administrador, exigindo visão geral;
- fila administrativa atualizada para o título vigente;
- montagem do cenário de pendência da fila passou a incluir roteador;
- expectativa antiga de que profissional não tivesse Fila foi substituída pelo comportamento vigente: profissional possui fila da própria especialidade;
- adicionado cenário em que profissional mantém sua fila mesmo acumulando papel administrativo fora do contexto principal;
- adicionado cenário em que AO mantém Relatórios Operacionais mesmo acumulando papel profissional;
- teste antigo de Nutrição deixou de tratar `nutricao` como código de papel e passou a usar o modelo vigente `profissional + especialidade Nutrição`.

Esses ajustes não ampliam autorização e não alteram contratos do Supabase.

### 23.6 Consistência do Modelo Geral da Interface e roteamento

Confronto automático da malha atual:
- 38 rotas registradas em `KNOWN_APP_ROUTES`;
- 21 itens da navegação transversal;
- 0 itens de navegação apontando para rota desconhecida;
- 0 duplicidades no registro transversal de navegação;
- 0 destinos usados pelo `App` fora do registro de rotas;
- 0 rotas conhecidas sem tratamento no `App`.

Repetições de destinos nos mapas de atalhos de `ProfileDashboard` pertencem a painéis de perfis distintos e não constituem duplicação de navegação.

### 23.7 Blocos preservados

Nenhuma mudança foi feita em:
- Tarefa 1 concluída/congelada;
- Bloco 10 verde/congelado;
- regras específicas já aprovadas de Nutrição, Assistência Social, Clínico, Coordenador, Auxiliar, Gestor ou Profissional Assistencial;
- schema, RLS, policies, triggers ou migrations do Supabase.

### 23.8 Relação com as oito falhas anteriormente registradas

Dentro do escopo deste bloco, três falhas de Fila receberam confronto documental suficiente e tiveram seus cenários de teste alinhados:
- Fila no contexto administrativo;
- Pendências da fila;
- Fila fora do contexto administrativo.

Elas permanecem **aguardando reexecução na Tarefa 3** antes de serem declaradas PASS. As demais falhas da suíte ampliada não foram alteradas por este bloco.

### 23.9 Estado do Bloco 2A

**BLOCO 2A — CONCLUÍDO TECNICAMENTE.**

Resultado:
- estrutura transversal e contexto confrontados;
- 3 lacunas reais de seleção de visão por contexto corrigidas;
- modelo de papéis/especialidades confirmado;
- integridade dos vínculos estruturais confirmada;
- roteamento transversal consistente;
- nenhuma nova pendência criada;
- nenhum bloco congelado reaberto.

A suíte completa, typecheck, build global e homologação operacional permanecem para a **Tarefa 3**, conforme divisão oficial do trabalho.

**Não iniciar o Bloco 2B sem nova ordem da responsável.**


## BLOCO 2B — Fluxos, capacidades e automações (26/09/2026)

**Escopo:**
- agenda e comparecimento;
- paciente × especialidades;
- capacidades;
- automações de fluxo;
- notificações;
- funções próprias das especialidades.

### 24.1 Levantamento prévio

Foram preservadas todas as correções já registradas nas seções 7.x, na Tarefa 1 concluída e nos blocos técnicos históricos. Não foram reabertos perfis congelados nem repetidas auditorias já concluídas.

O confronto mostrou que já estavam implantados e documentados, entre outros:
- catálogo real e ações de presença da Agenda;
- especialidades efetivas no contexto;
- retorno próprio/remarcação profissional;
- Faltosos separado de Busca Ativa;
- Transporte por competência/capability;
- Encaminhamento Interprofissional por capability individual;
- automação de Faltosos;
- notificações de Solicitações, Encaminhamentos, Faltosos, Encerramentos e impacto social→Nutrição.

### 24.2 Agenda e comparecimento

A RPC física `update_appointment_attendance_for_interface` foi reconferida.

Permanece comprovado:
- sessão e termo obrigatórios;
- conta ativa obrigatória;
- Administrativo/Coordenação/Administração podem atuar dentro de sua autorização;
- profissional somente altera agendamento próprio;
- ações válidas: `confirmado`, `realizado`, `faltou`, `cancelado`;
- não permite presença/falta futura;
- cancelamento exige justificativa;
- mudança de comparecimento permanece persistida no backend e aciona os gatilhos derivados aplicáveis.

Nenhuma divergência nova foi encontrada.

### 24.3 Paciente × especialidades

A RPC `get_patient_care_specialties_for_professional_interface` permanece:
- restrita a profissional ativo e autenticado;
- limitada a paciente dentro da atuação real do profissional;
- vinculada ao ciclo CAPO aberto;
- retornando apenas especialidades ativas do ciclo;
- sem ampliar acesso global ao prontuário/paciente.

Nenhuma divergência nova foi encontrada.

### 24.4 Capacidades

Foram reconferidos:
- `get_capability_catalog_for_interface`;
- `get_effective_professional_capabilities`;
- `set_professional_capability_for_interface`;
- `set_specialty_capability_status_for_interface`.

O modelo continua coerente:
- capacidades por especialidade vêm de `specialty_capabilities`;
- exceções individuais vêm de `professional_capabilities`;
- somente profissional ativo recebe capacidades efetivas;
- capacidade individual delegável permanece restrita a `encaminhamento_interprofissional`;
- capacidades estruturais por especialidade permanecem vinculadas ao catálogo canônico:
  - `renovacao_receita` → Clínica Geral;
  - `emitir_encaminhamento_odontologico_externo` → Clínica Geral;
  - `preencher_solicitacao_transporte` → Assistência Social;
- Administração continua sendo o único contexto autorizado a alterar o catálogo.

Nenhuma divergência nova foi encontrada.

### 24.5 Notificações e automações — cobertura física

Foram confirmados gatilhos/funções ativos para:
- nova solicitação e transições administrativas → AO/solicitante;
- encaminhamento operacional/interprofissional e odontológico → destinatários correspondentes;
- falta registrada → criação do acompanhamento + notificação AO;
- encerramento assistencial → acompanhamento administrativo;
- vulnerabilidade social com impacto alimentar → profissional de Nutrição dentro do escopo;
- cancelamento/remarcação de agenda com paciente aguardando → notificação de vaga para AO;
- fechamento do acompanhamento de faltoso após remarcação efetiva.

Não foi encontrada duplicidade ativa de trigger para a antiga automação da fila.

### 24.6 Correção nova comprovada — `notify_waiting_list()`

O Manual Técnico v5 já classificava `notify_waiting_list()` como **OBSOLETO/INCOMPATÍVEL**, pois esperava estados `vaga_disponivel`/`disponivel`, inexistentes no domínio atual de `waiting_list`.

Confronto físico de 26/09/2026 confirmou:
- a função antiga ainda existia no banco;
- nenhum trigger atual a utilizava;
- a automação correta já existe em `capo_notify_waiting_vacancy_from_appointment()`;
- o trigger ativo `trg_capo_notify_waiting_vacancy_from_appointment` está ligado a `patient_appointments`;
- a automação vigente procura paciente `waiting` da especialidade liberada e notifica o papel `administrativo_operacional`.

**Correção aplicada:**
- removida somente a função órfã `public.notify_waiting_list()`;
- preservada integralmente a automação substituta ativa.

**Migration aplicada no Supabase oficial e registrada no GitHub:**
`supabase/migrations/20260926132000_remove_legacy_notify_waiting_list.sql`.

**Verificação pós-correção:**
- função legada ausente: PASS;
- função substituta presente: PASS;
- trigger substituto ativo: PASS.

### 24.7 Verificação de segurança após DDL

O advisor de segurança foi executado após a migration.

Ele reportou avisos globais sobre RPCs `SECURITY DEFINER` executáveis por `authenticated` e sobre proteção de senhas vazadas desabilitada. Esses avisos:
- não foram introduzidos por esta migration;
- abrangem a arquitetura global do projeto e funções fora deste bloco;
- não demonstram regressão específica do Bloco 2B;
- não foram convertidos em pendência desta tarefa sem confronto específico posterior com o escopo de segurança global.

A migration deste bloco somente removeu uma função órfã e não criou nova superfície de execução.

### 24.8 Funções próprias das especialidades

O confronto transversal preservou as competências já corrigidas:
- Clínica Geral: Renovação de Receita e emissão odontológica conforme capability;
- Assistência Social: Transporte conforme capability e fluxo social próprio;
- Nutrição: recebe automação de vulnerabilidade alimentar somente quando profissional e paciente estão no escopo;
- Psicologia/Fisioterapia/futuras especialidades: área assistencial compartilhada e capacidades adicionais somente quando delegadas;
- Encaminhamento Interprofissional não é concedido automaticamente por especialidade.

Nenhuma função própria foi ampliada por inferência de cargo ou título textual.

### 24.9 Estado do Bloco 2B

**BLOCO 2B — CONCLUÍDO TECNICAMENTE.**

Resultado:
- agenda/comparecimento confrontados;
- paciente×especialidades confrontado;
- capacidades confrontadas;
- automações e notificações confrontadas;
- 1 legado incompatível comprovado e removido;
- automação substituta confirmada ativa;
- nenhuma nova pendência funcional criada;
- nenhum bloco congelado reaberto.

Suíte completa, typecheck, build global e homologações com contas/dados reais permanecem reservados para a **Tarefa 3**, conforme divisão oficial.

**Não iniciar o Bloco 2C sem nova ordem da responsável.**


## BLOCO 2C — Relatórios e contratos compartilhados interface ↔ Supabase (26/09/2026)

**Escopo:**
- relatórios;
- contratos compartilhados interface ↔ Supabase;
- consistência dos retornos das RPCs;
- integração comum dos módulos;
- revisão transversal final da Tarefa 2.

### 25.1 Levantamento prévio

Foram preservadas as correções já registradas de Relatórios, Notificações, TI, Nutrição, Transporte, Odontologia, Agenda, Coordenação e demais módulos. Não foram reabertos perfis ou blocos congelados.

Relatórios já possuíam correção anterior para:
- leitura do dashboard gerencial estruturado;
- filtros por período e especialidade;
- agenda por especialidade;
- relatório operacional assistencial;
- retirada de contagens parciais do relatório do Auxiliar Administrativo.

### 25.2 Relatórios — contrato atual

Foram reconfirmadas fisicamente as RPCs oficiais:

- `get_reports_dashboard_for_interface(p_start_date date, p_end_date date, p_specialty_id uuid default null)` → `jsonb`;
- `get_my_specialty_operational_report_for_interface(p_specialty_id uuid, p_start_date date, p_end_date date)` → `jsonb`.

A interface atual:
- usa o dashboard oficial para Administração/Coordenação;
- usa o relatório operacional oficial por especialidade para profissional;
- mantém o Auxiliar Administrativo sem contagem derivada de páginas limitadas, encaminhando para as relações reais de Fila e Faltosos;
- não usa `state.data.length`/paginação como indicador institucional.

Nenhuma divergência nova de Relatórios foi encontrada neste bloco.

### 25.3 Matriz física dos contratos compartilhados

Foi extraída a lista das operações efetivamente expostas por `src/lib/supabase/rpc.ts`.

Resultado inicial:
- **127 RPCs utilizadas pela camada de serviço**;
- todas as 127 existem fisicamente no Supabase oficial;
- **23 RPCs usadas não estavam declaradas em `src/types/database.ts`**.

As 23 funções ausentes na tipagem existiam fisicamente no banco, incluindo contratos de:
- Coordenação;
- solicitações de alteração de agenda;
- homologação;
- Nutrição;
- paciente × especialidades;
- registro de óbito;
- criação de especialidade.

### 25.4 Correção — tipagem compartilhada incompleta

`src/types/database.ts` foi alinhado às assinaturas físicas atuais das 23 RPCs, incluindo:
- argumentos obrigatórios;
- argumentos com `DEFAULT` tratados como opcionais;
- retornos `jsonb`;
- retornos tabulares estruturados das RPCs de Coordenação e paciente × especialidades.

A correção não alterou banco, autorização nem comportamento funcional.

### 25.5 Regressão real — operações expostas sem transporte

A auditoria identificou uma segunda divergência objetiva:

10 RPCs estavam:
- expostas pelos métodos de `createRpcService()`;
- existentes fisicamente no Supabase;
- usadas por módulos atuais;
- mas **não possuíam `case` no transporte padrão `createSupabaseTransport()`**.

Sem correção, essas chamadas cairiam no erro:

`RPC não cadastrada na camada CAPO.`

Operações afetadas:
- `get_coordinator_team_overview_for_interface`;
- `get_coordinator_agenda_overview_for_interface`;
- `get_agenda_change_requests_for_interface`;
- `create_agenda_change_request_for_interface`;
- `get_patient_care_specialties_for_professional_interface`;
- `decide_agenda_change_request_for_interface`;
- `apply_agenda_change_request_for_interface`;
- `register_coordination_team_decision_for_interface`;
- `get_coordination_team_decisions_for_interface`;
- `create_specialty_for_interface`.

### 25.6 Correção do transporte compartilhado

As 10 operações foram registradas no grupo de transporte genérico confirmado, preservando:
- os mesmos nomes físicos;
- os mesmos argumentos já construídos pelo serviço;
- as mesmas autorizações do backend;
- os mesmos retornos;
- nenhuma simulação local de sucesso.

Arquivo corrigido:
- `src/lib/supabase/rpc.ts`.

### 25.7 Verificação matricial após correções

A matriz foi repetida após as alterações.

Resultado:
- RPCs usadas pelo serviço: **127**;
- RPCs tipadas em `database.ts`: **127/127**;
- RPCs com caminho de transporte: **127/127**;
- RPCs fisicamente existentes no Supabase: **127/127**;
- RPC usada sem tipagem: **0**;
- RPC usada sem transporte: **0**;
- RPC usada sem função física correspondente: **0**.

### 25.8 Arquivos alterados

- `src/types/database.ts`;
- `src/lib/supabase/rpc.ts`.

Não houve alteração de schema, RLS, policy, trigger ou função do Supabase neste Bloco 2C.

### 25.9 Estado do Bloco 2C

**BLOCO 2C — CONCLUÍDO TECNICAMENTE.**

Resultado:
- Relatórios confrontados e conformes com os contratos oficiais;
- camada compartilhada de RPCs confrontada integralmente;
- 23 lacunas de tipagem corrigidas;
- 10 regressões reais de transporte corrigidas;
- matriz final 127/127/127/127;
- nenhuma nova pendência funcional criada;
- nenhum bloco congelado reaberto.

---

# 26. FECHAMENTO DA TAREFA 2 OFICIAL — TRANSVERSAL DO SISTEMA (26/09/2026)

Com a conclusão dos Blocos 2A, 2B e 2C:

**TAREFA 2 OFICIAL — CONCLUÍDA TECNICAMENTE.**

Foram concluídos:
- estrutura transversal e contexto;
- agenda/contexto compartilhado;
- funções acumuladas;
- roteamento;
- agenda e comparecimento;
- paciente × especialidades;
- capacidades;
- automações;
- notificações;
- funções próprias das especialidades;
- relatórios;
- contratos compartilhados interface ↔ Supabase.

Correções novas desta Tarefa 2:
- seleção de visão de Agenda, Fila e Relatórios pelo `primary_context`;
- alinhamento de testes diretamente relacionados ao contexto transversal;
- remoção da função legada órfã `notify_waiting_list()`, preservando a automação substituta;
- inclusão das 23 RPCs físicas ausentes da tipagem compartilhada;
- registro das 10 RPCs que estavam sem transporte na camada CAPO.

**Validação restante:** typecheck, suíte completa, build global, auditoria visual final, publicação e homologações operacionais com contas/dados reais pertencem à **Tarefa 3 oficial**, conforme divisão estabelecida.

**Não reabrir a Tarefa 2 sem nova evidência física ou autorização expressa da responsável.**


# 27. TAREFA 3 OFICIAL — PARTE TÉCNICA NO CHAT (26/09/2026)

**Início oficial:** 26/09/2026

## Escopo desta execução no Chat

Esta etapa corresponde somente à parte técnica da Tarefa 3 que será executada neste chat:

- typecheck completo do projeto;
- suíte completa de testes;
- classificação das falhas encontradas;
- correção somente de regressões reais comprovadas;
- não alterar funcionalidade correta para satisfazer teste desatualizado;
- reexecução dos testes após correções;
- build completo;
- registro técnico dos resultados neste Documento Mestre.

## Escopo reservado ao Work

Permanecem fora desta execução e serão conduzidos no Work:

- auditoria final de consistência;
- auditoria visual final;
- validação do sistema publicado;
- testes operacionais com contas reais;
- homologações pendentes;
- congelamento final dos blocos aprovados;
- consolidação final das pendências reais;
- fechamento do Documento Mestre;
- geração do PDF final de continuidade.

## Regras desta etapa

- não reabrir Tarefa 1 ou Tarefa 2 sem nova evidência física;
- não reabrir bloco congelado sem autorização expressa;
- corrigir somente falha tecnicamente comprovada;
- teste desatualizado deve ser alinhado ao contrato vigente, sem regressão funcional;
- preservar as correções registradas nos Blocos 2A, 2B e 2C;
- registrar cada regressão real e sua correção antes do fechamento desta parte técnica.

**Estado:** TAREFA 3 — PARTE TÉCNICA NO CHAT INICIADA.


## 27.1 Execução técnica concluída no Chat — 26/09/2026

A parte técnica da Tarefa 3 foi executada sobre uma branch temporária derivada do `main`, exclusivamente para permitir execução automatizada sem adicionar infraestrutura de CI ao branch oficial:

`audit/tarefa-3-tecnica`

O workflow temporário não foi incorporado ao `main`. Somente os alinhamentos de testes que passaram integralmente foram transportados ao branch oficial.

### 27.2 Typecheck

Primeira execução:
- instalação: PASS;
- typecheck: FAIL;
- erros localizados exclusivamente em arquivos de teste;
- nenhum erro TypeScript foi identificado em `src/`.

Classificação:
- mocks de serviços ficaram desatualizados após evolução dos contratos;
- testes de renovação ainda usavam ação médica antiga;
- mocks de Gestor, Solicitações, Luto e TI não continham métodos adicionados aos contratos atuais.

Após alinhamento dos testes:

**TYPECHECK — PASS.**

### 27.3 Suíte completa de testes

Na primeira execução completa, após zerar o typecheck, apareceram falhas causadas por três grupos:

1. ambiente de teste sem as variáveis públicas mínimas exigidas pelo cliente Supabase;
2. páginas que passaram a usar `useLocation()` sendo montadas por testes antigos sem `Router`;
3. expectativas de interface e fluxo anteriores às correções já registradas no Documento Mestre.

Nenhuma dessas falhas justificou regressão do código funcional.

Foram alinhados somente os cenários de teste aos contratos vigentes, incluindo:
- Shell atual com saudação institucional aprovada;
- Solicitações com Router e contratos de Psicologia Familiar;
- Agenda com Router;
- Encaminhamentos com Router;
- Encerramentos sem digitação manual de UUID e sem fluxo Social duplicado;
- Familiar/Cuidador com busca administrativa condicionada a `can_admin_correct`;
- Gestor com acessos e validação de senha vigentes;
- catálogo atual de capacidades da equipe;
- Renovação de Receita separando criação administrativa da decisão médica;
- Assistência Social com especialidade efetiva no `AccessContext`;
- Luto com busca segura vigente;
- relatório operacional do AO com título atual;
- ação médica de Renovação alinhada a `renewed`.

Arquivos de teste alinhados:
- `tests/unit/App.test.tsx`;
- `tests/unit/requests-page.test.tsx`;
- `tests/unit/gestor-dashboard.test.tsx`;
- `tests/unit/gestor-team-page.test.tsx`;
- `tests/unit/renewal-prescription-page.test.tsx`;
- `tests/unit/social-page.test.tsx`;
- `tests/unit/supabase-rpc.test.ts`;
- `tests/unit/AgendaPage.test.tsx`;
- `tests/unit/referrals-page.test.tsx`;
- `tests/unit/closures-page.test.tsx`;
- `tests/unit/administrative-operational-report.test.tsx`;
- `tests/unit/family-caregiver-page.test.tsx`.

Resultado final da suíte:

- **24 arquivos de teste PASS / 24**;
- **143 testes PASS / 143**;
- **0 testes FAIL**;
- duração da suíte: aproximadamente **10,15 s**.

**SUÍTE COMPLETA — PASS.**

### 27.4 Regressões reais nesta parte da Tarefa 3

Após confrontar os erros com o código atual e com as correções já registradas:

**nenhuma regressão funcional nova foi comprovada em `src/` durante esta parte da Tarefa 3.**

As alterações transportadas ao `main` nesta etapa foram somente alinhamentos de testes desatualizados.

Nenhuma funcionalidade correta foi modificada para satisfazer teste antigo.

Nenhum bloco congelado foi reaberto.

### 27.5 Build final técnico

Após typecheck e suíte completa PASS, o build foi executado automaticamente.

Resultado:
- 149 módulos transformados;
- `dist/index.html`: 0,45 kB;
- CSS: 84,60 kB (gzip 14,86 kB);
- JavaScript: 950,54 kB (gzip 244,24 kB);
- build concluído em aproximadamente 210 ms.

**BUILD — PASS.**

O bundler emitiu aviso informativo de chunk JavaScript superior a 500 kB. O aviso não interrompeu o build e não foi classificado como regressão funcional desta tarefa.

### 27.6 Resultado da parte técnica no Chat

**TAREFA 3 — PARTE TÉCNICA NO CHAT: CONCLUÍDA.**

Resultado consolidado:
- typecheck: **PASS**;
- suíte completa: **143/143 PASS**;
- build: **PASS**;
- regressões funcionais novas comprovadas: **0**;
- blocos congelados reabertos: **0**;
- código funcional alterado nesta parte: **0 arquivos de produção**;
- testes antigos alinhados aos contratos vigentes: **12 arquivos**.

A continuidade da Tarefa 3 passa agora ao **Work**, conforme divisão definida pela responsável, para:
- auditoria final de consistência;
- auditoria visual final;
- validação do sistema publicado;
- testes operacionais com contas reais;
- homologações pendentes;
- congelamento final dos blocos aprovados;
- consolidação de eventuais pendências reais;
- fechamento final do Documento Mestre;
- PDF final de continuidade.


## 28. TAREFA 3 WORK — auditoria visual publicada, registro incremental (26/09/2026)

**Ambiente observado:** somente `https://caposistema.pages.dev/`, no navegador real, com a conta autorizada já existente da titular (contexto principal Administrador). Este registro não refaz a parte técnica concluída da seção 27 e não conclui a Tarefa 3. Navegação feita pelos links internos do próprio sistema. Recarregar ou abrir uma rota diretamente voltou ao login, coerente com a sessão sem persistência ao fechar/recarregar; por isso, navegações diretas após a autenticação **não** foram consideradas teste das páginas internas. Nenhum dado, conta ou ação operacional foi criado ou alterado.

### 28.1 Telas percorridas sob o contexto Gestor/Titular

| Perfil / telas publicadas | Evidência física e resultado limitado |
|---|---|
| Entrada/login | **PASS visual desktop e autenticação da conta real:** logo, título, campos Usuário/Senha e botão Entrar exibidos; a conta existente abriu o painel do Gestor. |
| Painel Geral (`/`) | **PASS de abertura e estrutura desktop:** boas-vindas, sidebar, cabeçalho, rodapé, Conexão — Disponível, acessos rápidos, agenda do dia, aniversariantes e cartões gerenciais renderizados. |
| Pacientes (`/pacientes`) | **PASS de abertura e campos observáveis:** abas Cadastrar/Consultar; consulta com campo “Nome, Nº CAPO ou CMS”; estados vazios sem pacientes inventados. Cadastro não foi enviado. |
| Agenda Geral (`/agenda`), Filas (`/fila`), Solicitações (`/solicitacoes`), Transporte (`/transporte`) | **PASS de abertura/navegação desktop:** cada rota exibiu o título próprio, sem alerta visível, imagem quebrada ou overflow horizontal de página no viewport inspecionado. Criação, envio e atualização não foram homologados. |
| Fluxos (`/gestor/fluxos`), Faltosos (`/faltosos`), Busca Ativa (`/gestor/busca-ativa`), Encerramentos (`/encerramentos`), Familiares (`/gestor/familiares`), Encaminhamentos (`/encaminhamentos`) | **PASS de abertura/navegação desktop** no contexto real da titular, sem alerta visível, imagem quebrada ou overflow horizontal. Ações transacionais não testadas. |
| Odontologia (`/odontologia`), Renovação de Receita (`/receita`), Pendências (`/gestor/operacional`), Equipe (`/gestor/equipe`) | **PASS de abertura/navegação desktop**; formulários de equipe e especialidades reais apareceram. Cadastro e decisões clínicas não foram executados. |
| Linha do Tempo (`/gestor/timeline`), Auditoria (`/gestor/auditoria`), Notificações (`/notificacoes`), Suporte (`/gestor/suporte`), Usuários e Contas (`/gestor/administracao`), Área Técnica (`/tecnica`) | **PASS de abertura/navegação desktop**, sem alerta visível, imagem quebrada ou overflow horizontal na tela. Dados operacionais e permissões específicas ainda não homologados. |
| Relatórios (`/relatorios`) | **PASS de abertura e carregamento do dashboard oficial; FAIL visual de rótulos**, descrito na pendência P2. |
| Botão Voltar | **PASS observado:** a partir de Área Técnica retornou ao Painel Geral `/`. |

**Limite dos PASS acima:** provam abertura, renderização básica e navegação no contexto autorizado da titular no viewport desktop observado; não equivalem à aprovação visual profunda de cada subestado, responsividade móvel, acessibilidade integral, persistência de ações, autorização de outros perfis nem correção dos números institucionais.

### 28.2 Divergências físicas reproduzíveis — correção aguardando autorização de bloco concluído

- **P1 — Perfil da titular:** no painel publicado, clicar “Perfil: Administrador” navega para `/perfil` e exibe “Em construção / Rota em desenvolvimento / Este módulo ainda não está disponível nesta etapa”. O código atual do `GestorShell.tsx` aponta para `/perfil`; a rota não está em `KNOWN_APP_ROUTES` e cai em `ConstructionPage`. **FAIL de navegação no controle de Perfil**, sem presumir como esse destino deve ser implementado. A regra específica para a função de Perfil não está comprovada no Documento Mestre: pedir decisão da responsável antes de definir destino/ação ou alterar o perfil congelado.
- **P2 — Relatórios Gerenciais:** em `/relatorios`, o dashboard oficial carregou seções visíveis com rótulos como `closures`, `patients`, `no show followup` e métricas como `total period` em inglês. O `DashboardPanel` em `src/features/reports/ReportsPage.tsx` renderiza as chaves das RPCs diretamente em `h4`/`dt`. **FAIL de apresentação/rótulos no ambiente em português**, sem indício de que as contagens venham de listas parciais. Este módulo já consta como conforme na seção 25; preservar o bloco concluído e obter autorização expressa antes de corrigir o componente.

### 28.3 Homologações e encerramento ainda pendentes

- **HOMOLOGAÇÃO REAL PENDENTE:** contas autorizadas dos perfis Coordenador, Auxiliar Administrativo/Operacional, Médico Clínico Geral, Profissional Assistencial Padrão, Nutrição, Assistência Social e TI/Manutenção não estavam autenticadas nesta sessão. Não inferir inexistência global dessas contas; falta acesso individual autorizado a cada contexto para confirmar permissões, telas específicas e funções acumuladas. A conta da titular não substitui esse teste.
- **HOMOLOGAÇÃO OPERACIONAL PENDENTE:** não houve criação/edição de dados clínicos ou administrativos; resultados de agenda, fila, faltosos, solicitações, relatórios, encaminhamentos, encerramentos, notificações e TI foram observados somente por leitura. É preciso ocorrência e autorização real para verificar transições, atualização depois da ação e acesso negado por papel.
- **VISUAL MOBILE PENDENTE:** o navegador desta execução ofereceu somente viewport desktop para inspeção física; não declarar PASS/FAIL do sistema publicado em celular. A frente responsiva já congelada na seção anterior não foi reaberta.
- **CONGELAMENTO FINAL E PDF:** não executados porque a auditoria visual por perfil e a homologação real não terminaram e P1/P2 aguardam decisão. Nenhum bloco congelado foi modificado. Nenhum arquivo de produção, teste ou Supabase foi alterado nesta execução.
