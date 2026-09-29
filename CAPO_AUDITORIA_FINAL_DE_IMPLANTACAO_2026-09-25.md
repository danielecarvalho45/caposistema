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


### 28.4 Confronto do controle Perfil com a Matriz Funcional Estrutural

A responsável esclareceu que **Clínico Geral e Coordenador era somente exemplo**: qualquer profissional pode ter funções acumuladas autorizadas. Para definir o papel do botão, foi consultada a Matriz Funcional de Perfis e Automações de 12/09/2026 (seção 2 e bloco 15 A) e a Especificação Funcional Estrutural da Interface de 12/09/2026 (seções 3.5, 4.1 e 4.2), por solicitação expressa da responsável. Esta consulta documental pontual não transfere automaticamente esses arquivos para a árvore `main` e não autoriza alteração de código baseada apenas na Library.

**Regra física lida na Matriz:** conta e interface únicas; função(ões)/especialidade(s), permissões acumuladas e contexto principal definem o ambiente de trabalho; o contexto principal determina somente o ambiente inicial, e as demais funções ficam acessíveis por módulos autorizados **sem troca manual de perfil**. A Especificação exemplifica que um Coordenador também profissional assistencial pode iniciar em Minha Agenda e receber o módulo Coordenação automaticamente; para Titular com outra função cotidiana, a Administração aparece como módulo adicional mesmo se outro contexto for o inicial. A escolha do contexto principal pertence à configuração autorizada da conta, não a um seletor informal de papéis na interface.

**Posição do botão:** o controle “Perfil: Administrador” está no cabeçalho de `GestorShell.tsx`; `AppShell.tsx` usa o mesmo destino. Ambos apontam para `/perfil`, que não é rota funcional registrada e cai em “Em construção” no sistema publicado. A Matriz e a Especificação consultadas não indicam uma tela `/perfil` nem atribuem a esse botão a troca de contexto. Portanto P1 segue como **FAIL físico de navegação**, mas não se deve implementar troca manual contrariando a regra estrutural. **🟡 PENDÊNCIA DE DECISÃO VISUAL:** decidir com a responsável se o botão terá um destino de conta concreto previsto em regra futura ou se será apenas indicação não clicável do contexto principal atual. Não alterar bloco congelado antes de definição e autorização expressa. P2 (rótulos em inglês dos Relatórios) permanece pendente e independente.

### 28.5 Correção pontual P1 — atalho de funções autorizadas no Perfil

**Decisão expressa da responsável:** usar o controle Perfil no cabeçalho como atalho para trocar de tela entre funções acumuladas. A decisão autoriza a alteração localizada deste controle nos dois cabeçalhos, preservando o restante do layout congelado. Não há troca manual de papel, sessão, permissões ou contexto principal: o atalho apenas navega a rotas já existentes e verificadas contra o contexto de acesso. Quando não existir função secundária com destino autorizado, o perfil aparece como texto, sem link para a rota inexistente `/perfil`.

- **Evidência anterior:** `AppShell.tsx` e `GestorShell.tsx` apontavam a `/perfil`, ausente da lista de rotas; a titular publicada chegava à tela “Em construção” (P1 em 28.2).
- **Alteração:** `src/components/shell/ProfileShortcuts.tsx` e `profile-shortcuts.css` oferecem menu acessível com “Início — contexto principal” e as rotas existentes de funções secundárias autorizadas: Administração do Sistema, Coordenação, Administrativo Operacional, Área Técnica ou área profissional efetivamente presente no contexto. `src/components/shell/AppShell.tsx` e `src/features/gestor/GestorShell.tsx` reutilizam o mesmo controle. Nenhum contrato/RPC Supabase foi modificado. Relatórios/P2 não foi alterado.
- **Verificação interna:** `tests/unit/profile-shortcuts.test.tsx` testa coordenação acumulada, titular com atuação profissional e conta de função única. Suíte ampliada: **25/25 arquivos, 146/146 testes PASS** com configuração pública local isolada; `npm run typecheck` **PASS**; `npm run build` **PASS**; `git diff --check` **PASS**.
- **Estado:** P1 **corrigida e verificada no código**; confirmação visual no sistema publicado e homologação com conta real que acumule funções **PENDENTES** até a publicação e o acesso autorizado. P2 permanece pendente de autorização específica. Nenhum outro bloco congelado foi reaberto; ainda não encerrar a Tarefa 3 nem emitir PDF final.

### 28.6 Verificação publicada da correção P1 — conta real da titular (26/09/2026)

- **Ambiente e conta:** `https://caposistema.pages.dev/`, autenticado novamente pela própria conta existente da titular, somente leitura; página recarregada depois da publicação do commit `c67c12c`.
- **Evidência física:** no cabeçalho publicado, “Perfil: Administrador” agora é um texto (`span`) sem destino `/perfil`, e não abre a antiga rota “Em construção”. A aba inicialmente permaneceu em `/perfil` por histórico da navegação anterior e, ao usar o link Início, voltou a `/` com o painel principal renderizado. **PASS apenas para o controle de conta sem função secundária visível e para o retorno ao Início.** A rota `/perfil`, se acessada diretamente, continua uma rota não implementada; não foi criada uma página de perfil.
- **Limite:** nesta sessão o contexto retornado da titular não ofereceu função secundária no controle. A abertura e os destinos do menu de funções acumuladas passaram nos testes internos, mas **HOMOLOGAÇÃO REAL PENDENTE** com uma conta existente que acumule funções autorizadas. Não se afirma aprovação visual ou operacional desses atalhos para outros perfis. P2 e as demais pendências de 28.3 permanecem como estavam. Nenhuma alteração adicional de funcionalidade ou dado foi realizada.

### 28.7 Verificação interna ampliada — perfis sem contas reais (26/09/2026)

**Condição confirmada pela responsável:** os demais perfis ainda não têm contas reais para acessar a publicação; sua verificação nesta etapa deve ser interna, inclusive a conferência de layout. Isto atualiza a condição de 28.3: a ausência de contas deixa de ser mera suposição. A execução interna **não equivale** a screenshot ou homologação visual da interface publicada com o papel correspondente. A verificação física da titular no ambiente publicado permanece em 28.1 e 28.6; nenhum paciente ou ocorrência artificial foi inserido no sistema.

**Inventário completo das 38 rotas físicas em `KNOWN_APP_ROUTES` e destino em `App.tsx`:** todas foram classificadas abaixo. “Estrutura interna” significa existência da rota, sua seleção pelo aplicativo, autorização por `canAccessAppRoute`, componente e regras CSS do shell, com a suíte já existente e testes direcionados. Não significa aprovação visual de cada subestado e tamanho de tela.

| Grupo/perfis que podem alcançar o módulo conforme papel e capacidade | Rotas percorridas no código | Resultado e limite |
|---|---|---|
| Início por contexto — Gestor, Coordenador, Auxiliar, Profissional comum, Clínico, Nutrição, Social, TI | `/` | **Estrutura interna classificada:** `App.tsx` escolhe dashboard Gestor, Coordenação, Nutrição, Social, Atuação ou Home conforme contexto principal. Cabeçalho/rodapé/Conexão pertencem a `GestorShell` ou `AppShell`. A publicação foi vista apenas como Gestor; demais variantes sem conta real permanecem sem PASS visual publicado. |
| Atendimento e módulos transversais autorizados | `/pacientes`, `/agenda`, `/minha-agenda/solicitar-alteracao`, `/fila`, `/faltosos`, `/solicitacoes`, `/transporte`, `/receita`, `/encaminhamentos`, `/odontologia`, `/notificacoes`, `/suporte`, `/relatorios`, `/encerramentos` | **14 rotas com componentes físicos e checagem de acesso.** Agenda, fila, pacientes, solicitações, transporte, receita, encaminhamentos, odontologia, notificações, relatórios e encerramentos já foram abertos no desktop da titular em 28.1; isso não substitui telas e estados próprios de outros perfis. P2 dos Relatórios mantém FAIL visual documentado. |
| Atuação profissional — Clínico Geral, Psicologia/Fisioterapia/futuras, Nutrição, Assistência Social | `/atuacao`, `/nutricao`, `/assistencia-social`, `/luto`, `/familiar-cuidador` | **5 rotas classificadas internamente:** papéis, vínculo profissional, especialidades/capacidades e telas específicas foram confrontados com `route-access.ts`, `navigation-config.ts`, `App.tsx` e componentes. Agenda antes dos aniversariantes está presente na ordem DOM das telas profissionais de Nutrição e Social; o shell aplica menu móvel compartilhado. Sem inspeção real de viewport por esses papéis, responsividade e subestados continuam **VISUAL PUBLICADO PENDENTE**. |
| TI/Manutenção | `/tecnica` | **Estrutura interna classificada:** rota restrita a Administrador/Administrador Técnico, componente `TechnicalPage`, acesso e CSS com regra móvel. Foi aberta na publicação somente com a titular, sem sessão própria de TI. |
| Coordenação e Busca Ativa | `/coordenacao`, `/busca-ativa`, `/coordenacao/busca-ativa`, `/coordenacao/timeline`, `/coordenacao/auditoria` | **5 rotas classificadas internamente:** dashboard da Coordenação, busca ativa, timeline e auditoria têm componentes e restrições físicas. A navegação do Auxiliar usa Busca Ativa própria e não herda por analogia a Coordenação. Sem conta de Coordenador não há aprovação visual publicada desse perfil. |
| Gestão da titular | `/gestor/social`, `/gestor/luto`, `/gestor/equipe`, `/gestor/administracao`, `/gestor/timeline`, `/gestor/auditoria`, `/gestor/suporte`, `/gestor/fluxos`, `/gestor/busca-ativa`, `/gestor/familiares`, `/gestor/operacional` | **11 rotas classificadas internamente** com restrição por papel Administrador, seleção de componentes no `App.tsx`, navegação `GestorShell` ou acesso contextual. Parte das telas abertas na publicação está listada em 28.1; demais subestados não foram homologados. |
| Rota deliberada | `/em-construcao` | **1 rota intencional**, excluída da contagem de módulos operacionais concluídos. O antigo destino `/perfil` não está nas rotas conhecidas e permanece em construção se acessado diretamente; nenhum controle do cabeçalho aponta para ele. |

**Layout estrutural por perfil:** os dois shells exibem logo, nome, cabeçalho, Voltar, conexão, rodapé e menu lateral; o menu móvel e o fechamento estão presentes nos componentes e nas media queries. `AppShell` atende Coordenador, Auxiliar, Clínico, demais profissionais, Nutrição, Social e TI; `GestorShell` atende titular com contexto principal Administrador. Os componentes de agenda, fila, solicitações, atuação, Social, relatórios, TI e formulários têm estilos próprios e/ou regras responsivas examinadas. Nenhum PASS visual de desktop/mobile das contas inexistentes foi inferido só pela leitura de CSS ou por `jsdom`. Estados com dados reais, overflow/posição em dispositivo e ações operacionais continuam não observáveis nesta etapa; isso explicita **quais verificações faltam**, sem omitir telas do inventário.

**Divergência nova e correção cirúrgica no atalho P1:** para titular com papel Profissional secundário, `canAccessAppRoute` pode permitir Nutrição administrativamente mesmo sem especialidade Nutrição. O atalho inicialmente confundia essa permissão administrativa com a especialidade profissional e poderia exibir “Nutrição” como função acumulada indevida; também era preciso exigir vínculo profissional ativo. `src/components/shell/profile-shortcuts.ts` agora filtra as rotas profissionais secundárias pelas especialidades realmente vinculadas e pelo vínculo ativo, além da autorização da rota; `ProfileShortcuts.tsx` preserva o estado do menu por caminho sem atualização de estado em efeito React. Não houve alteração no backend, nas permissões ou em blocos congelados independentes. `tests/unit/profile-shortcuts.test.tsx` cobre Gestor + profissional, Profissional + Coordenação/Administração/Auxiliar/TI, Clínico, Psicologia, futura Fonoaudiologia, Nutrição, Social, ausência de vínculo, função única e navegação. `tests/unit/shell-layout-contract.test.tsx` verifica a estrutura do cabeçalho/rodapé/conexão, menu móvel e o atalho nos dois shells; estes testes validam DOM e comportamento, **não dimensões visuais reais**.

**Verificação final desta frente:** suíte completa `26/26` arquivos, `159/159` testes PASS; `npm run typecheck` PASS; `npm run build` PASS; ESLint dos arquivos alterados PASS; `git diff --check` PASS. A suíte usa configuração pública local de teste e não autentica os outros perfis nem prova operações reais no Supabase. A auditoria visual publicada das contas inexistentes, os estados dependentes de dados reais, mobile físico e P2 permanecem **classificados e pendentes**, sem declaração indevida de PASS. As 38 rotas estão inventariadas acima, inclusive a deliberada `/em-construcao`.

**Complemento de cobertura interna:** para que nenhuma rota fique só listada, `tests/unit/all-routes-smoke.test.tsx` monta no React **37/37 rotas operacionais declaradas** (excluindo apenas `/em-construcao`, que é deliberada) e as **8 entradas de contexto**: Coordenador, Auxiliar, Clínico, Psicologia, futura Fonoaudiologia, Nutrição, Assistência Social e TI. O serviço é substituído apenas dentro do teste por estados vazios, sem chamada ao banco nem inserção de dados de exemplo no aplicativo. Para cada rota, verificou-se que o corpo abre e não cai em “Em construção” ou “Área não autorizada” no contexto habilitado. Estes **45 testes são montagem interna e roteamento**; não aferem aparência em pixels, dados institucionais nem regras de uma conta real de cada papel. **Verificação final atualizada:** 27/27 arquivos e 204/204 testes PASS, typecheck/build/lint dos arquivos alterados/diff PASS. A classificação de pendências visuais/publicadas acima permanece.

### 28.8 Continuação da inspeção publicada — telas contextuais da titular (26/09/2026)

Sem recarregar páginas nem criar dados, a conta real da titular abriu `/gestor/fluxos` pelo menu existente e seguiu seus links internos:

| Tela publicada | Evidência e classificação |
|---|---|
| `/gestor/fluxos` | **PASS de navegação e abertura:** exibiu o título “Fluxos e Acompanhamentos” e links internos para os módulos autorizados. Não foram executadas ações. |
| `/gestor/luto` | **PASS limitado de abertura/estado vazio:** exibiu “Luto”, busca de familiar/cuidador, observação inicial e “Nenhum acompanhamento de luto real encontrado”, sem alerta visível. Nenhuma ação foi enviada. Isto não homologa criação nem edição de acompanhamento. |
| `/gestor/social` | **FAIL reproduzível na leitura publicada:** o título “Acompanhamento Social” abriu, mas a tela mostrou alerta “Situação inválida.” em vez dos acompanhamentos autorizados ou de um estado vazio. |

**Confronto físico do FAIL social:** `GestorSocialOverview.tsx` chama `createClosuresIntegration().loadSocial(null)`; `SocialPage.tsx` usa a mesma chamada inicial e ao recarregar. `closures-integration.ts` repassa `p_status: null` à RPC `get_social_followups_for_interface`. Consulta **somente leitura** à definição da RPC no Supabase oficial `CAPO SISTEMA` (`fftebavlhbfcrvrtnrld`) confirmou assinatura `(text, integer, integer)`, padrão `p_status = 'ativo'` e verificação `v_status not in ('ativo','encerrado')` que lança precisamente “Situação inválida.”; enviar `null` explicitamente não aciona o valor padrão. **REGRESSÃO REAL COMPROVADA por interface publicada e contrato físico.** A tela profissional Social também está sujeita ao mesmo parâmetro por leitura do código, mas **não foi observada em sessão profissional** e não deve receber um FAIL visual publicado por inferência.

**Bloco congelado e limite de ação:** Acompanhamento Social já foi tratado como concluído nas seções anteriores. Conforme a regra das seções 16/19 e a ordem expressa da Tarefa 3, a evidência foi registrada e **nenhum código Social/Encerramentos nem RPC foi alterado** sem autorização expressa da responsável para reabrir apenas esta divergência. Uma correção terá de preservar a visão de **ativos e encerrados** exigida para a Social, sem substituir silenciosamente `null` por apenas `ativo` e ocultar encerrados. P2 de Relatórios continua separado. Até corrigir e testar com contrato real, estas duas telas de acompanhamento social não devem ser consideradas homologadas; a suíte interna de estados vazios de 28.7 não detectava a incompatibilidade porque não executava a RPC real.

### 28.9 Fila única de pontos que exigiriam reabrir bloco concluído — decisão da responsável

**Regra conferida, sem reauditar blocos:** Manual Técnico Integrado v5, 15/09/2026, seções “Resumo executivo” e “Fila de reparos”: reparo mínimo por microetapa e preservação dos blocos verdes/congelados; o Bloco 10 não deve ser reaberto sem regressão física ou nova decisão funcional. Este Documento Mestre, seção 8, itens 1–4, determina procurar alternativa segura, registrar 🟡 **PENDÊNCIA DE DECISÃO** se a reabertura não for decidida e **continuar normalmente a auditoria e as demais correções**. O Comando Mestre de Auditoria/Manutenção Conjunta v5 no `main`, seção “Paradas obrigatórias”, também classifica regressão de bloco congelado como caso de parada da respectiva mutação. A responsável determinou nesta continuidade **agrupar as pendências de reabertura para tratá-las depois, uma a uma**; não solicitar decisão imediata para cada novo achado.

| Pendência de reabertura conhecida | Evidência atual | Bloco/processo preservado e correção futura restrita | Situação |
|---|---|---|---|
| **P2 — rótulos de Relatórios Gerenciais** | `/relatorios` publicou `closures`, `patients`, `no show followup`, `total period` em inglês; `ReportsPage.tsx` imprime nomes das chaves retornadas, conforme 28.2. | Relatórios já concluídos na seção 25; eventual tradução visual deverá preservar RPC, números e estrutura gerencial. | 🟡 **PENDÊNCIA DE DECISÃO — adiada para manutenção pontual posterior.** Sem alteração agora. |
| **P3 — leitura de Acompanhamento Social** | `/gestor/social` publicou “Situação inválida.”; `loadSocial(null)` repassa `p_status: null` a RPC que aceita `ativo` ou `encerrado`, conforme 28.8. `SocialPage.tsx` compartilha a chamada; repercussão profissional é inferência de código, não PASS/FAIL de tela publicada. | Bloco Social concluído nas seções 7.9 e 20.3; correção futura deverá preservar consulta de ativos e encerrados e acesso por papel, sem alterar a RPC sem necessidade física. | 🟡 **PENDÊNCIA DE DECISÃO — adiada para manutenção pontual posterior.** Regressão real confirmada na tela da titular, sem alteração agora. |

**Itens que não entram nesta fila:** P1 (botão Perfil) já teve decisão específica, correção e verificação publicada nas seções 28.5–28.6; falta de contas reais/mobile e ações operacionais são limites de homologação, não evidência de regressão em bloco congelado; Bloco 10 permanece congelado e sem regressão física nova. Esta fila contém **todas as necessidades de reabertura comprovadas e ainda abertas até este registro**, não suposições sobre telas não inspecionadas. Novas evidências objetivas deverão ser anexadas aqui sem apagar as anteriores. Auditoria independente e trabalho fora desses dois blocos podem continuar; nenhuma mutação de interface, teste ou Supabase foi realizada nesta atualização documental.

### 28.10 Continuação da auditoria interna de composição dos perfis sem conta real (26/09/2026)

Mantida a fila 28.9 sem reabrir os blocos Social e Relatórios. Foram ampliados exclusivamente os testes internos em `tests/unit/all-routes-smoke.test.tsx`, com resposta vazia isolada dos serviços e especialidades do contexto de cada cenário, **sem dados de pacientes/profissionais no sistema, sem Supabase real e sem alterar código de produção**. Os testes agora verificam também:

| Perfil / contexto de teste | Resultado verificável |
|---|---|
| Administrativo Operacional e TI | **PASS interno:** painéis próprios visíveis no início; o painel operacional contém duas seções tituladas “Painel Operacional” no DOM, sem classificação visual publicada para essa repetição. |
| Nutrição | **PASS interno:** especialidade reconhecida pelo contexto e “Minha Agenda” antes de “Aniversariantes de hoje”, com cartões do painel renderizados. |
| Assistência Social | **PASS interno de composição:** “Minha Agenda”, aniversariantes e seção de acompanhamento na ordem do DOM; link Familiar / Cuidador resolve à rota esperada. **Não homologa a leitura real**: a regressão de RPC P3 continua aberta e a resposta vazia do teste não exercita o contrato publicado. |
| Coordenação | **PASS interno:** seções Equipe e Profissionais, Agendas da Equipe e Aniversariantes de hoje na ordem do DOM. |

**Verificação desta microetapa:** arquivo ampliado 50/50 testes PASS; suíte completa 27/27 arquivos e **209/209 testes PASS**; `npm run typecheck` PASS; `npm run build` PASS (aviso preexistente de tamanho do bundle). A análise mede existência e ordem de elementos no DOM sob contextos isolados: **não mede pixels, mobile, respostas reais, autenticação de cada perfil, fluxo transacional, autorização negativa nem funcionamento da RPC**. As homologações pendentes da seção 28.3 e P2/P3 da fila 28.9 permanecem, sem declaração de congelamento final ou PDF conclusivo.


### 28.11 Auditoria estrutural das pendências de correção P2 e P3 — base oficial para continuidade (26/09/2026)

Esta seção consolida, para os agentes seguintes, o confronto das pendências abertas de correção com a documentação estrutural obrigatória localizada fisicamente na Library:

- `CAPO_MATRIZ_FUNCIONAL_DE_PERFIS_E_AUTOMACOES_2026-09-12.md`;
- `CAPO_ESPECIFICACAO_FUNCIONAL_ESTRUTURAL_DA_INTERFACE_2026-09-12.docx`;
- `CAPO_ESPECIFICACAO_ESTRUTURAL_DA_INTERFACE_2026-09-12.docx`.

A fila de reabertura registrada em 28.9 permanece correta: **somente P2 e P3 estão abertas como pendências de correção comprovadas**. P1 — Perfil — já teve decisão, correção, testes e verificação publicada e não pertence mais à fila de correção.

#### P2 — Relatórios Gerenciais — regra estrutural confirmada

**Problema físico registrado:** a rota `/relatorios` exibe chaves técnicas em inglês, como `closures`, `patients`, `no show followup` e `total period`, porque `ReportsPage.tsx` apresenta diretamente nomes de chaves retornadas pelo backend.

**Regra estrutural confrontada:**
- relatórios devem usar exclusivamente dados que o CAPO realmente registra e consegue calcular de forma confiável;
- é proibido inventar indicadores sem fonte real;
- Administrador e Coordenador podem acessar visão geral e recortes por especialidade, profissional quando pertinente, período, produção, fluxos, agendas, faltas e demais recortes sustentados pelos dados existentes;
- relatórios são administrativos/operacionais e devem priorizar apresentação adequada, sem conteúdo profissional/confidencial;
- a identidade visual e a interface final devem seguir os padrões oficiais do CAPO.

**Conclusão normativa:** P2 é **correção de apresentação/interface**, não correção de cálculo ou de backend.

**Comportamento correto para manutenção:**
- manter as RPCs atuais;
- manter números, agrupamentos, filtros, escopo e autorização;
- criar mapeamento de rótulos claros em português para as chaves técnicas exibidas ao usuário;
- não criar métricas novas;
- não recalcular indicadores no frontend a partir de arrays/paginação;
- não alterar o Supabase sem nova evidência física independente.

Exemplos de apresentação esperada:
- `closures` → **Encerramentos**;
- `patients` → **Pacientes**;
- `no show followup` → **Acompanhamento de Faltosos**;
- `total period` → **Total no período**.

Outras chaves técnicas eventualmente expostas devem receber nomenclatura clara em português, preservando integralmente o dado de origem.

**Estado:** 🟡 **PENDÊNCIA DE CORREÇÃO AUTORIZÁVEL — REABERTURA PONTUAL DE RELATÓRIOS.**

---

#### P3 — Acompanhamento Social — regra estrutural confirmada

**Problema físico registrado:** a rota `/gestor/social` publicou a mensagem **“Situação inválida.”**. A causa já comprovada é o envio de `p_status: null` por `loadSocial(null)` para `get_social_followups_for_interface`, cujo contrato trabalha com os estados válidos `ativo` e `encerrado`.

**Regra estrutural confrontada:**
- o módulo **Acompanhamento Social no Serviço CAPO** deve apresentar lista operacional de acompanhamentos **Ativos e Encerrados**;
- deve exibir identificação mínima, situação do acompanhamento e pendências;
- Estudo Social, relato profissional, evolução e conteúdo confidencial permanecem no VIVVER;
- Assistência Social pode acompanhar familiar/cuidador, luto, óbito autorizado, solicitações e encerramento do próprio acompanhamento;
- Faltosos não pertence à Assistência Social.

**Conclusão normativa:** não é correto resolver P3 trocando silenciosamente `null` por `ativo`, porque isso eliminaria a visualização dos acompanhamentos encerrados e contrariaria a estrutura aprovada.

**Comportamento correto para manutenção:**
- a visão geral deve contemplar **ativos e encerrados**;
- nunca enviar estado inválido à RPC;
- preservar identificação mínima, situação e pendências;
- não expor conteúdo confidencial;
- não misturar Faltosos ao fluxo Social;
- preferir correção na camada de integração reutilizando contratos existentes;
- antes de qualquer migration ou alteração de RPC, verificar se a integração pode consultar os estados válidos separadamente e compor a visão geral;
- se consultas separadas forem usadas, preservar autorização, ordenação coerente e ausência de duplicação;
- nenhuma resposta ou sucesso pode ser fabricado localmente.

A correção futura deve abranger a visão Gestor/Titular e o consumo profissional compartilhado por `SocialPage.tsx`, mas PASS/FAIL visual publicado do perfil profissional só pode ser declarado quando houver evidência física correspondente.

**Estado:** 🟡 **PENDÊNCIA DE CORREÇÃO COM REGRESSÃO REAL COMPROVADA — REABERTURA PONTUAL DO BLOCO SOCIAL.**

---

#### Limites desta auditoria

Esta atualização é exclusivamente documental e **não altera código, teste ou Supabase**.

A partir desta seção, os agentes seguintes devem considerar como base oficial:

1. P2 e P3 são as únicas pendências de correção comprovadas ainda abertas até este registro;
2. P1 está resolvida e não deve ser reaberta;
3. pendências de contas reais, mobile e operações transacionais são pendências de homologação/encerramento, não novas correções técnicas comprovadas;
4. qualquer nova pendência de correção deve ser sustentada por evidência física nova e registrada neste mesmo Documento Mestre;
5. a manutenção de P2 e P3 deve ser cirúrgica e não autoriza reabertura de outros blocos concluídos.



### 28.12 Pendência de homologação — Tarefa 2 — login para conferência das telas (28/09/2026)

**Registro da responsável:** a criação/preparação de acesso para conferência das telas dos perfis profissionais no sistema publicado já foi iniciada como **Tarefa 2** desta frente de homologação e permanece pendente de conclusão.

**Objetivo da Tarefa 2:**
- disponibilizar um login exclusivo de homologação no sistema publicado;
- não utilizar nem alterar a conta real da Gestora/Titular para essa finalidade;
- permitir conferir as telas dos demais contextos autorizados;
- contemplar Coordenador, Administrativo Operacional, Clínico Geral, Nutrição, Assistência Social, Psicologia, Fisioterapia e TI/Manutenção;
- utilizar, preferencialmente, a estrutura física já existente de conta de homologação e contexto de homologação do CAPO;
- preservar identidade real separada do contexto simulado;
- registrar as trocas em auditoria;
- não criar dados fictícios de produção.

**Estado físico conhecido até este registro:**
- existe uma única conta em Supabase Auth atualmente vinculada ao uso real;
- a conta exclusiva de homologação ainda não foi criada no Supabase Auth;
- o banco já possui suporte físico para homologação, incluindo `is_homologation_account`, `get_homologation_options_for_interface()`, `set_homologation_context_for_interface()`, `get_homologation_context_for_interface()`, `clear_homologation_context_for_interface()` e integração com `get_my_access_context()`.

**Pendência:** criar o usuário exclusivo de homologação no Supabase Auth e concluir seu vínculo/configuração no CAPO para então executar a conferência visual e funcional das telas no ambiente publicado.

**Classificação:** 🟡 **PENDÊNCIA DE HOMOLOGAÇÃO — TAREFA 2 EM ANDAMENTO.**

**Importante:** esta Tarefa 2 de homologação não substitui nem reabre a Tarefa 2 técnica já concluída no histórico principal da auditoria. Trata-se da numeração operacional desta nova frente de conferência das telas.


### 28.13 Frente de homologação — Tarefa 1 — revisão da tela Gestor/Titular (28/09/2026)

**Definição expressa da responsável:** nesta nova frente de homologação, a **Tarefa 1** consiste na revisão manual da tela do **Gestor/Titular** no sistema publicado pela própria responsável do projeto.

#### Método de execução

1. A responsável acessa o sistema publicado com sua conta real de Gestor/Titular.
2. Percorre as telas e funcionalidades visíveis do ambiente do Gestor/Titular.
3. Sempre que encontrar algo que:
   - não entenda;
   - pareça incorreto;
   - pareça diferente do fluxo esperado;
   - apresente nomenclatura, comportamento, botão, informação ou navegação duvidosa;
   deverá trazer o ponto isoladamente para análise.
4. Cada situação será confrontada com:
   - Projeto/Manual Estrutural vigente;
   - Matriz Funcional vigente;
   - Especificação Funcional Estrutural da Interface vigente;
   - demais documentos normativos atuais aplicáveis ao ponto.
5. Somente após esse confronto será classificado se o comportamento está:
   - correto;
   - apenas não compreendido;
   - divergente e precisa de correção.
6. Quando houver divergência comprovada, a correção será feita **pontualmente e de forma cirúrgica**, restrita àquela situação.
7. Não reabrir automaticamente outros blocos, não refazer auditorias já concluídas e não alterar comportamento correto apenas para atender percepção visual sem base normativa.

#### Objetivo

Concluir a homologação do ambiente Gestor/Titular por inspeção real da responsável, transformando cada dúvida ou divergência em uma verificação documental específica e, quando necessário, em uma correção pontual.

**Classificação:** 🟡 **TAREFA 1 — EM ANDAMENTO.**

#### Relação com as demais tarefas desta frente

- **Tarefa 1:** revisão manual da tela Gestor/Titular pela responsável + confronto documental + correções pontuais.
- **Tarefa 2:** criação/configuração do login de homologação para conferência das telas dos demais perfis.

Esta numeração pertence exclusivamente à **frente atual de homologação das telas** e não altera a numeração histórica das tarefas técnicas já concluídas no Documento Mestre.


### 28.14 Tarefa 1 — Pendência consolidada — Auditoria do Gestor/Titular (28/09/2026)

**Origem:** revisão manual da tela publicada pela responsável do projeto, dentro da Tarefa 1 da frente atual de homologação.

**Tela:** Gestor/Titular → Auditoria e Relatórios → Auditoria.

**Constatação funcional:** a arquitetura está correta ao manter a **Auditoria administrativa/operacional** no ambiente do Gestor/Titular e separar os **logs técnicos** para a área de TI/Manutenção.

**Regra estrutural confirmada:**
- Auditoria do Gestor/Titular = trilha administrativa/operacional protegida das alterações relevantes do CAPO;
- deve permitir compreender quem realizou determinada ação, quando ocorreu, em qual módulo/registro e, quando disponível e autorizado, estado/valor anterior e novo;
- auditoria técnica, logs de infraestrutura, falhas técnicas, conectividade e registros de manutenção pertencem à área **TI / Manutenção**;
- não misturar auditoria operacional com logs técnicos.

**Divergência de interface/usabilidade encontrada:** a tela atual expõe filtros técnicos como **Entidade** e **Ação** em campos livres, exigindo do Gestor conhecimento de nomes internos de tabelas e ações técnicas como `INSERT`, `UPDATE` e `DELETE`.

**Correção futura esperada, sem execução nesta etapa:**
- preservar a RPC e a fonte real da auditoria;
- não alterar a arquitetura nem mover a Auditoria para TI;
- substituir filtros técnicos por filtros compreensíveis em linguagem de negócio, como:
  - Período;
  - Área/Módulo;
  - Tipo de alteração;
  - Usuário/Responsável;
  - Paciente/registro quando aplicável;
- mapear internamente as opções amigáveis para os códigos técnicos do backend;
- apresentar resultados com data/hora, autoria, ação, origem/módulo, registro relacionado e resumo da alteração;
- exibir estado anterior/novo quando já houver dado seguro e autorizado;
- não expor nomes técnicos de tabela ao usuário final;
- não incluir logs técnicos nessa tela;
- logs técnicos permanecem exclusivamente na área de TI/Manutenção.

**Classificação:** 🟡 **PENDÊNCIA DA TAREFA 1 — CORREÇÃO PONTUAL DE INTERFACE/USABILIDADE.**

**Regra de continuidade:** não corrigir isoladamente agora. Manter esta pendência registrada para inclusão posterior no comando consolidado de alterações da Tarefa 1 destinado ao Work.

### 28.15 TAREFA 1 — CORREÇÃO PONTUAL 01 — AUDITORIA DO GESTOR/TITULAR (28/09/2026)

**Autorização posterior expressa:** a responsável determinou corrigir exclusivamente a Auditoria administrativa/operacional do Gestor/Titular nesta microetapa, superando a instrução anterior de apenas registrar em 28.14. Não houve reabertura de TI/Logs Técnicos, Relatórios, Linha do Tempo ou outras telas; Supabase, SQL, RPC, RLS, policies, triggers e migrations permaneceram inalterados.

**Divergência e causa física:** `AuditLogPage.tsx` apresentava “Entidade” e “Ação” como campos livres, exigindo códigos internos; os resultados mostravam a ação técnica e o nome físico da tabela, omitindo os rótulos, autoria, resumo e alterações seguras já retornados por `get_audit_logs_for_interface`. **Regra estrutural:** consulta administrativa deve tornar compreensíveis autoria, ação, data, área/registro e alterações autorizadas; logs de infraestrutura e manutenção permanecem na TI.

**Correção aplicada:** `src/features/gestor/AuditLogPage.tsx` e novo `src/features/gestor/audit-log-page.css` exibem seleções “Área / Módulo” e “Tipo de alteração”, com “Todas as áreas” e “Todas”; os códigos internos são enviados somente como parâmetros da RPC preservada. O catálogo das 34 opções foi confrontado em leitura com `capo_audit_entity_label()` no Supabase oficial. O resultado apresenta data/hora de São Paulo, tipo em português, `entity_label`, `actor_name`, `actor_role_label`, paciente/Nº CAPO apenas se recebidos e `summary`; `changes` seguros com `label`, valores anterior/posterior somente em “Ver detalhes”. Não apresenta o nome físico da tabela nem os códigos técnicos como títulos. O período inválido continua bloqueado; vazio e erro real continuam explícitos. A consulta mantém o limite anterior de 100 registros, sem novo cálculo, alteração de autorização ou dados de exemplo no sistema.

**Arquivos e testes:** somente os dois arquivos de interface acima e `tests/unit/gestor-audit-page.test.tsx`, com oito cenários para filtros, mapeamentos das três ações, valores nulos, área, autoria, resumo, detalhes, omissão de paciente, período inválido, vazio e erro. Direcionados **8/8 PASS**; suíte completa **30/30 arquivos, 225/225 testes PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS** (aviso preexistente de bundle grande); ESLint nos arquivos alterados e `git diff --check` **PASS**. Commit do código publicado no `main`: `b1b4914005f89ad45541d5d1240de82ce0f64e09`.

**Validação no Pages oficial com conta real da titular:** rota `/gestor/auditoria` aberta após login. Filtros De/Até, Área / Módulo com opções em português e Tipo de alteração com Todas/Criação/Alteração/Exclusão visíveis; nenhum campo livre técnico. Consulta do dia mostrou estado vazio. Consulta de 01/09 a 28/09/2026 em Todas as áreas/Todas retornou **37 registros reais**, com resumos, autoria/função, paciente quando aplicável e 32 controles de detalhes; nenhum código de tabela nem ação técnica nos títulos. Consulta pelo mesmo intervalo com Pacientes/Alteração retornou estado vazio, sem erro; não se declarou ocorrência nesse recorte. Não foram criados registros nem executadas ações de escrita.

**Limite físico novo — autoria da RPC, fora desta autorização:** leitura da definição oficial de `get_audit_logs_for_interface` mostrou `left join public.professionals pr on pr.id=public.capo_effective_professional_id()` ao compor `actor_name_raw`, enquanto o ator do log vem de `al.user_id`/`ua.id`. Isso associa o nome profissional do **consultante** às linhas em vez de resolver explicitamente o profissional do **autor**. Os 37 registros consultados apresentaram duas autorias exibidas (sistema e uma autoria autenticada), o que não prova nem exclui atribuição indevida sem cotejo individual autorizado. **Dependência de homologação da autoria, registrada para decisão pontual separada; nenhuma RPC foi modificada nesta ordem.** Não declarar que a identidade de cada autor está comprovada por esta verificação visual.

**Estado final da correção 01:** **PASS de interface e publicação** para nomenclatura, seletores, estado vazio e apresentação dos registros efetivamente retornados; **PENDENTE** a confirmação da fidelidade de `actor_name` na RPC por evidência/ordem específica fora do escopo. A Auditoria Técnica da TI permaneceu intocada. Parar esta correção aqui, sem iniciar a próxima pendência.

### 28.16 TAREFA 1 — CORREÇÕES PONTUAIS CONSOLIDADAS — GESTOR/TITULAR (28/09/2026)

**Escopo e continuidade:** ordem consolidada da frente de homologação do Gestor/Titular. Preservadas Tarefas 1/2 técnicas históricas, Área TI, contratos SQL/RPC/RLS e módulos não diretamente afetados. Código publicado em `main` pelo commit `861b5a842d8bf5979e5bb77ebebf99e43c949a6e`. Não foram criados usuários, pacientes, filas ou dados fictícios no sistema publicado; os dados isolados dos testes são fixtures internas.

| Correção | Tela e perfis | Problema, regra e causa física | Alteração / contratos e reflexos | Testes / resultado publicado | Estado |
|---|---|---|---|---|---|
| 1 — Auditoria administrativa | `/gestor/auditoria`; Gestor | Filtros e nomes técnicos, divergentes da consulta administrativa compreensível. | Já corrigida e publicada em 28.15; `get_audit_logs_for_interface` preservada. Sem alteração adicional nesta ordem. | Publicação anterior conferida em 28.15; autoria individual permanece dependência da RPC ali descrita. | **PASS interface; LIMITAÇÃO autoria** |
| 2 — Histórico Operacional | `/gestor/timeline`; Gestor | `OperationalTimeline.tsx` usava “backend”, “timeline” e título alternativo `event_type`, enquanto o contrato retorna `items`, `title`, `summary`, `event_at`, `event_key`. Histórico deve narrar somente eventos operacionais autorizados. | `OperationalTimeline.tsx`, `GestorShell.tsx`, `GestorManagementPage.tsx`: título, orientação, pesquisa por nome/CMS/Nº CAPO, data legível e `title`/`summary` retornados, sem mostrar código de evento. RPC `get_patient_timeline_for_interface` preservada. | Testes de busca/seleção/evento/vazio PASS. Pages: rota e pesquisa exibidas com a conta titular; evento real não foi selecionado para evitar exposição desnecessária de dados. | **PASS apresentação; LIMITAÇÃO conteúdo real** |
| 3 — Relatórios | `/relatorios`; Gestor e Coordenador | Rótulos técnicos P2 já corrigidos; faltavam impressão e PDF. Regra: mesmos filtros, escopo e indicadores reais. | `ReportsPage.tsx`, `reports-page.css`, novo `report-export.ts`: cabeçalho CAPO, período, especialidade, escopo, emissão e indicadores do dashboard já retornado; botões Imprimir e Gerar / salvar PDF. Sem RPC, cálculo de métrica ou mudança de filtro. | Testes de rótulo, números, escopo Gestor/Coordenador e PDF multipágina PASS. Pages: botões habilitados, 14 seções reais e período/especialidade Todas visíveis. Confirmação automática do arquivo baixado não terminou no navegador; impressão física também não foi executada. | **PASS interface; LIMITAÇÃO impressão/download publicado** |
| 4 — Suporte com TI | `/gestor/suporte`; Gestor com papel TI e Gestor comum | Solicitação para si própria quando a mesma conta exerce TI. Regra: condicionar pelo papel real, mantendo suporte comum para quem não possui TI. | `GestorShell.tsx`, `GestorManagementPage.tsx`: papel `administrador_tecnico` oculta o atalho redundante e, em acesso direto, direciona à Área Técnica; sem tocar TI ou outros usuários. | Testes dos dois cenários PASS. Pages: a conta titular ativa possui apenas papel `administrador` (consulta somente leitura de `user_roles`/`app_roles` identificou uma conta administrativa ativa e zero contas TI ativas); portanto continua vendo “Solicitar suporte”. Alterar atribuição de papel exige decisão e autorização separadas; não foi presumido acúmulo pelo nome. | **LIMITAÇÃO REAL / NÃO HOMOLOGADO NA CONTA TITULAR** |
| 5 — Transporte | `/transporte`; Gestor, Social autorizada, Administrativo Operacional | O fluxo de oito passos aparecia apenas depois da escolha do paciente; gestor podia acionar encaminhamento externo/conclusão. Contrato `manage_transport_request_for_interface` permite preenchimento por Gestor/Social autorizada, PDF somente Gestor, confirmação por Gestor/AO e providência externa posterior do AO segundo regra desta ordem. | `TransportPage.tsx`: etapas visíveis antes da busca; Gestor mantém reconhecimento, preenchimento, confirmação e PDF/assinatura; AO continua confirmação, encaminhamento e conclusão; botões de encaminhar/concluir aparecem somente AO. Social com `preencher_solicitacao_transporte` mantém preenchimento. Backend inalterado. | Testes de competência e etapas PASS. Pages: orientação das oito etapas visível sem paciente escolhido; PDF/assinatura e transação real não exercitados por falta de ocorrência apropriada nesta inspeção. | **PASS apresentação; LIMITAÇÃO fluxo real** |
| 6 — Fila | `/fila` e inclusão contextual em `/agenda`; Gestor e AO | Fila de Pacientes não permitia inclusão apesar de `add_patient_to_waiting_list_for_interface`; regra reserva criação ao Gestor/AO, prioridade 1–5, observação até 500, bloqueio de duplicidade/inatividade no próprio contrato. | `QueuePage.tsx` busca paciente, carrega especialidades ativas pelo contrato `get_interprofessional_referral_specialties_for_interface`, seleciona prioridade e confirma inclusão; atualiza a fila única e mostra situação. `AgendaPage.tsx` oferece Incluir na fila quando paciente/especialidade/profissional já foram escolhidos e a consulta de vagas terminou sem vaga; reaproveita a mesma RPC. Família permanece separada. | Testes de Gestor/AO, impedimento visual a Coordenador/profissional, erro de duplicidade e inclusão contextual PASS. Pages: formulário, especialidades reais e controles exibidos na conta titular; nenhuma inclusão real executada nesta inspeção. | **PASS apresentação/contrato; LIMITAÇÃO escrita real** |
| 7 — Social P3 | `/gestor/social` e Social profissional | Falha anterior `p_status: null`; regra exige ativos e encerrados. | Correção anterior preservada em `closures-integration.ts`: consulta `ativo` e `encerrado` separadamente e compõe sem duplicidade, sem alteração adicional. | Testes pertinentes incluídos na suíte completa. Pages: tela titular carregou “Nenhum acompanhamento retornado”, sem “Situação inválida.”; perfil Social sem conta real nesta etapa. | **PASS Gestor vazio; LIMITAÇÃO Social real** |
| 8 — termos técnicos | Telas diretamente tocadas | Mensagens “backend”, “timeline” e códigos técnicos em apresentação final. | Textos tocados de Histórico, Relatórios e Suporte foram convertidos para linguagem funcional; nenhuma varredura geral ou alteração em TI. | Inspeção visual das rotas acima e testes direcionados. | **PASS no escopo tocado** |

**Arquivos físicos desta publicação:** `src/features/agenda/AgendaPage.tsx`, `src/features/gestor/{GestorManagementPage,GestorShell,OperationalTimeline}.tsx`, `src/features/queues/QueuePage.tsx`, `src/features/reports/{ReportsPage.tsx,reports-page.css,report-export.ts}`, `src/features/transport/TransportPage.tsx`, `tests/unit/{agenda-queue-context,gestor-support-routing,gestor-timeline,queue-inclusion,report-export,reports-labels,transport-competence}.test.*`. A correção 1 permanece nos arquivos já descritos em 28.15; Social P3 não foi reaberto.

**Verificação técnica final:** `npm test` **36/36 arquivos e 239/239 testes PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS** (aviso de tamanho do bundle); `git diff --check` **PASS**. `npm run lint` **FAIL com 14 erros e 2 avisos já presentes em trechos não modificados e em outros arquivos** (regras React de estado em effects e pureza, além de importação não usada). ESLint dos arquivos desta frente com essas duas regras preexistentes desativadas para a leitura localizada: **PASS**. Não foi expandido o escopo para limpar dívida geral de lint.

**Limites e decisão:** nenhum fluxo transacional com paciente real foi executado apenas para obter PASS; não houve contas reais de Coordenador, AO e Social disponíveis nesta homologação. A titular continua sem o papel TI efetivo e vê suporte comum; requer classificação/decisão específica sobre atribuição de função, sem inserir papel por inferência. O botão PDF gerencial foi publicado e o gerador de arquivo passou no teste interno, mas a captura automática do download publicado esgotou o tempo do navegador; não declarar PDF aberto ou impressão física validada. A fidelidade da autoria da Auditoria continua nos limites de 28.15. As limitações acima não são sucessos simulados nem autorização para reabrir a Área TI.

**Estado da frente atual:** correções de código publicadas, suíte funcional verde, pendências reais de homologação explicitadas. Parar aqui conforme ordem; não iniciar reorganização de TI nem Tarefa 2 da Conta Mestre.

### 28.17 Retificação pontual — TI é função do Gestor/Titular (28/09/2026)

**Regra estrutural:** a seção 4.1 do `CAPO_ESPECIFICACAO_FUNCIONAL_ESTRUTURAL_DA_INTERFACE_2026-09-12.md` atribui ao Administrador do Sistema/Titular a governança técnica e inclui expressamente **TI / Manutenção** entre seus módulos. A rota `/tecnica` já admite o papel `administrador` em `src/app/route-access.ts`. Logo, a conta Gestor/Titular não depende de receber também o papel `administrador_tecnico` para acessar a Área Técnica.

**Divergência e causa física:** a correção 4 da seção 28.16 condicionou o atalho e o encaminhamento de `/gestor/suporte` ao papel adicional `administrador_tecnico`. Por isso a titular, que tem papel `administrador`, continuou vendo um formulário de solicitação de suporte para si mesma. Ficam **retificadas e substituídas** a regra, a limitação de homologação e a necessidade de atribuir papel TI descritas naquela linha e no parágrafo de limites de 28.16; não se deve adicionar um segundo papel para resolver esse caso.

**Correção restrita:** `src/features/gestor/GestorShell.tsx` deixa apenas o atalho existente **Área Técnica** na navegação do Gestor; `src/features/gestor/GestorManagementPage.tsx` encaminha à Área Técnica o acesso direto à antiga rota de Suporte, sem formulário de solicitação. Não houve mudança em permissões, Supabase ou na área TI. `tests/unit/gestor-support-routing.test.tsx` cobre Gestor/Titular com e sem papel TI adicional.

**Verificação:** `npm test` **36/36 arquivos, 239/239 testes PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS** (aviso de bundle grande); `git diff --check` **PASS**. Código e retificação publicados no `main` pelo commit `ab2db2bd37adadb5b311a6bb2eb6656d80bc73d3`.

**Validação publicada:** a página oficial abriu, mas solicitou novo login após atualização; o comportamento com a conta real da titular **não foi reverificado**. Estado: **CORRIGIDO NO CÓDIGO / TESTE INTERNO CONCLUÍDO / AGUARDANDO TESTE OPERACIONAL**. A homologação de chamados reais depende ainda de ocorrência adequada, sem sucesso simulado.

### 28.18 Correção pontual — escolha do relatório no PDF gerencial (28/09/2026)

**Solicitação e divergência:** na rota `/relatorios`, Gestor/Titular não conseguia escolher qual relatório gerar: o PDF reunia todas as seções retornadas pelo dashboard, embora houvesse filtros de período e especialidade. A Matriz Funcional de Perfis e Automações de 12/09/2026, seção 5.2, permite aos Gestores e Coordenadores visão geral e recortes sustentados pelos dados efetivamente registrados; a Especificação Funcional Estrutural da Interface, seção 4.1, inclui relatórios globais, indicadores e produção gerencial. O Manual Técnico Integrado v5 estabelece que os relatórios oficiais vêm das RPCs próprias, sem cálculo a partir de listas parciais.

**Correção:** `src/features/reports/ReportsPage.tsx` apresenta **Relatório para PDF**, com **Visão geral — todos os relatórios** e opções correspondentes somente às seções realmente retornadas com indicadores pelo dashboard, inclusive Agenda por especialidade quando houver dados. A escolha determina as seções exportadas, sem modificar o painel visível, os valores, os filtros de período/especialidade, a autorização ou a chamada de `get_reports_dashboard_for_interface`. `src/features/reports/report-export.ts` identifica no cabeçalho do PDF o recorte escolhido. Sem alterações em Supabase, SQL, RPC ou permissões. `tests/unit/reports-labels.test.tsx` comprova seção escolhida, visão geral, números preservados e ausência de nova consulta.

**Testes:** testes direcionados **5/5 PASS**; suíte completa **36/36 arquivos, 240/240 testes PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS** (aviso de tamanho do bundle); `git diff --check` **PASS**. **Estado:** CORRIGIDO NO CÓDIGO / TESTE INTERNO CONCLUÍDO; validação do seletor e do PDF com conta real no Pages **PENDENTE**, sem declarar download publicado verificado.


### 28.19 Padronização institucional dos PDFs do CAPO (28/09/2026)

**Solicitação:** aplicar a identidade institucional oficial aprovada pela Titular a todos os PDFs gerados pelo sistema CAPO, incluindo os PDFs dos Relatórios Gerenciais.

**Levantamento físico anterior à correção:** foram identificados quatro geradores ativos de PDF na SPA atual: Relatórios Gerenciais, Transporte, Plano Alimentar/Nutrição e Encaminhamento Odontológico. Todos produziam PDF a partir de streams próprios e não apresentavam, de forma uniforme, o cabeçalho institucional completo com a arte CAPO + Secretaria Municipal de Saúde + Prefeitura de Pouso Alegre.

**Correção aplicada:** a arte institucional já registrada em `src/lib/pdf/capo-document-brand.ts` passou a ser consumida por um gerador compartilhado, `src/lib/pdf/capo-document-pdf.ts`. O cabeçalho é incorporado como imagem JPEG no próprio PDF, em cada página, antes do conteúdo funcional. Os quatro emissores foram ligados a esse gerador comum:
- `src/features/reports/report-export.ts` — Relatórios Gerenciais, inclusive a opção de escolha do relatório já implementada;
- `src/features/transport/TransportPage.tsx` — Solicitação de Transporte;
- `src/features/nutrition/NutritionPage.tsx` — Plano Alimentar Nutricional;
- `src/features/dentistry/DentistryPage.tsx` — Encaminhamento Odontológico.

**Preservação funcional:** não houve alteração de RPC, SQL, RLS, policies, Storage, autorização, cálculo de indicadores, dados de paciente, fluxo de assinatura ou regras de emissão. A mudança ficou restrita à composição visual dos PDFs e ao reaproveitamento de um único cabeçalho institucional. O conteúdo específico de cada documento foi preservado.

**Teste de proteção adicionado:** `tests/unit/report-export.test.ts` passou a verificar que o PDF gerencial contém recurso de imagem institucional (`/Subtype /Image`), referência `/XObject` e execução de `/Logo Do`, além das verificações já existentes de conteúdo e paginação. O gerador compartilhado foi submetido, nesta manutenção direta, a verificação estática TypeScript isolada com `tsc --noEmit`: **PASS**. A suíte completa `npm test`, `npm run typecheck` e `npm run build` do repositório **não foi executada nesta sessão**, portanto não declarar PASS global até nova execução no ambiente completo.

**Commits da alteração direta:** `8b7fa2c594826a5baca4b7dea3c83d98eccb290f`, `582e32f1226c364ad24ed0123b9e386f2f39269a`, `d50f524d0295c1b0c0e3433bd097da33ae7d2eb3`, `fe3135ebff61407c308c259268e84f69a48acd3b`, `a3aca830069a2d9222366fa9c278b216918b6e67`, `6948fe204a8647b832169c963128e360a75ad471`, `6ffb10c598e83539b73d5a1221e93b9a61a4d035`, `458aef5e6b1bef55d888e44e2d9211d15fb0a07e`, `a9130a4e414944780915a5665bf6aa39f210c9d3`, `2341f40f85e326b5837d719e61a8a336c84f1609` e `b63480c0d75131010e9b16fa6d48f7b6ae77841b`.

**Estado:** **CORRIGIDO NO CÓDIGO / IDENTIDADE INSTITUCIONAL CENTRALIZADA / AGUARDANDO SUÍTE COMPLETA E VALIDAÇÃO VISUAL DOS PDFs PUBLICADOS**. Não declarar homologação visual final até abrir ao menos um PDF de cada fluxo após a publicação.


### 28.20 Retificação da validação publicada — PDFs de Relatórios (28/09/2026)

**Evidência operacional apresentada pela Titular:** após abrir os PDFs gerados em **Relatórios Gerenciais** no sistema publicado, foi confirmado visualmente que **nenhuma alteração institucional estava presente no arquivo efetivamente baixado**. Portanto, a etapa 28.19 não pode ser considerada homologada no ambiente publicado.

**Confronto físico do `main`:** o código corrente em `src/features/reports/report-export.ts` chama `buildCapoDocumentPdf()`, e o gerador compartilhado `src/lib/pdf/capo-document-pdf.ts` incorpora a imagem institucional proveniente de `src/lib/pdf/capo-document-brand.ts`. Assim, existe divergência entre o código-fonte atual do `main` e o comportamento observado pela Titular no PDF entregue pelo sistema publicado.

**Classificação atual:** **FAIL OPERACIONAL NA PUBLICAÇÃO / INVESTIGAÇÃO NECESSÁRIA**. Não declarar a identidade institucional dos PDFs como concluída. Antes de alterar novamente a composição do PDF, deve-se confirmar se o Pages publicado contém o build correspondente ao `main` atual e, em seguida, gerar e abrir fisicamente um novo PDF de Relatórios. Se o build publicado estiver atualizado e o cabeçalho continuar ausente, tratar como falha real do gerador/renderização do PDF e corrigir o código.

**Demais documentos:** Transporte, Nutrição e Odontologia permanecem igualmente **não homologados visualmente** até que seus PDFs publicados sejam efetivamente gerados e abertos.

**Estado:** 🔴 **PDF DE RELATÓRIOS — NÃO HOMOLOGADO / PUBLICADO SEM ALTERAÇÃO VISÍVEL SEGUNDO TESTE REAL DA TITULAR.**


### 28.21 Ajuste cirúrgico do cabeçalho institucional dos PDFs (28/09/2026)

**Evidência visual da Titular:** o PDF de Relatórios publicado apresentou o cabeçalho institucional ocupando uma faixa excessivamente alta, afastando o conteúdo do topo da página. A Titular autorizou reduzir a altura do cabeçalho e mantê-lo mais próximo da margem superior.

**Correção cirúrgica:** alterado exclusivamente o posicionamento do cabeçalho compartilhado em `src/lib/pdf/capo-document-pdf.ts`. A imagem institucional permanece com largura útil de 505 pontos, mas a altura de exibição foi reduzida de 168,333 para **90 pontos** e reposicionada para o topo da página (`y=738`). O início do conteúdo foi elevado para `y=716`. Como o gerador é compartilhado, o ajuste vale igualmente para Relatórios, Transporte, Nutrição e Odontologia.

**Relatórios:** removida apenas a linha textual redundante `CAPO - Centro de Acolhimento ao Paciente Oncológico` de `src/features/reports/report-export.ts`, pois a identificação institucional já passa a ser feita pelo cabeçalho gráfico. Título do documento, escopo, período, especialidade, tipo do relatório e dados permanecem inalterados.

**Preservação:** nenhuma alteração em RPC, SQL, Supabase, autorização, indicadores, conteúdo clínico/administrativo, armazenamento, assinatura ou fluxo de emissão.

**Commits:** `605c92cf0c28ffef2d27a197982c773daaca841d` e `7035b55ecb4c74b80acbfcfd89d6296501a9301a`.

**Estado:** **CORRIGIDO NO CÓDIGO / AGUARDANDO NOVA PUBLICAÇÃO E VALIDAÇÃO VISUAL DO PDF REAL**. O FAIL operacional de 28.20 só poderá ser encerrado após a Titular abrir um PDF novo gerado pelo build que contenha estes commits.


### 28.22 Correção interna — logo dos Relatórios e preservação de indicadores zerados (28/09/2026)

**Regra confirmada pela Titular:** valor `0` é dado válido e deve permanecer visível no relatório. Não bloquear geração de PDF nem omitir indicadores apenas porque todos os valores do período são zero.

**Diagnóstico interno:** `ReportsPage.tsx` já preserva métricas numéricas zeradas porque `dashboardEntries()` aceita valores do tipo `number`, inclusive `0`, e `report-export.ts` converte esses valores para texto sem filtro por positividade. Portanto, a causa da ausência visual da logo não era a existência de indicadores zerados. O comportamento publicado continuava divergente do gerador atual do `main`.

**Correção cirúrgica aplicada ao gerador compartilhado:** `src/lib/pdf/capo-document-pdf.ts` passou a declarar explicitamente `/ProcSet [/PDF /Text /ImageC]` nos recursos de cada página, mantendo o XObject JPEG institucional `/Logo`. Foi acrescentada uma identificação institucional textual mínima logo abaixo da faixa gráfica — `CAPO | Secretaria Municipal de Saude | Prefeitura de Pouso Alegre` — como marcador de renderização do novo gerador e fallback de identificação, sem substituir a logo. O cabeçalho gráfico continua estreito e posicionado no topo, conforme 28.21.

**Proteção de regressão:** `tests/unit/report-export.test.ts` ganhou cenário específico com todos os indicadores iguais a `0`, verificando que `Agendados no período: 0`, `Realizados no período: 0` e `Faltas no período: 0` permanecem no conteúdo exportado. O mesmo teste verifica os recursos de imagem e o marcador institucional do gerador novo.

**Commits:** `ac0cd00d90e05afea8b32a79117db8a8b8c4743f` e `7adeff750e305a2ad01537f9bcc5c9180a696450`.

**Estado:** **CORRIGIDO INTERNAMENTE NO CÓDIGO / ZERO PRESERVADO COMO DADO / LOGO AINDA EXIGE VALIDAÇÃO NO BUILD PUBLICADO**. Se um novo PDF publicado não apresentar nem a logo nem o marcador textual institucional acima, fica comprovado que o ambiente publicado não está executando este build do `main`, e a próxima ação deve ser no processo de publicação/deploy, não no conteúdo do PDF.


### 28.23 Reorganização funcional da Área Técnica — TI individual e Gestor/Titular (28/09/2026)

**Solicitação:** reorganizar a Área Técnica já existente sem criar novos módulos, sem alterar contratos do banco e sem duplicar implementação entre o perfil TI e o Gestor/Titular. A mesma organização deve aparecer na entrada técnica individual e na Área Técnica acessada pelo Gestor/Titular.

**Fundamento e estado físico:** a rota `/tecnica` já utiliza o componente compartilhado `src/features/technical/TechnicalPage.tsx` e é autorizada aos papéis `administrador` e `administrador_tecnico`. A documentação técnica vigente e `TAREFA_08_LOGS_E_OBSERVABILIDADE_TECNICA.md` confirmam que painel, estado do sistema, integrações, logs runtime, chamados e histórico persistido já utilizam os contratos canônicos existentes. Portanto, a correção foi aplicada no ponto compartilhado, sem criar duas telas ou duas lógicas.

**Correção aplicada:** a navegação principal da Área Técnica foi reorganizada em quatro áreas: **Painel Técnico**, **Chamados**, **Diagnóstico** e **Manutenção**. No Painel Técnico, situação geral, banco, autenticação, integrações, avisos/incidentes e resumo dos chamados passaram a usar apresentação funcional simples com os estados **Operacional / Atenção / Indisponível**; códigos e métodos técnicos de verificação não são exibidos nessa visão. Em Chamados, a fila e o andamento permanecem ligados aos mesmos contratos e o histórico persistido deixa de ser uma aba principal separada, passando a ser consultado dentro da própria área de Chamados. Em Diagnóstico foram reunidos Estado do Sistema, Integrações e Logs Técnicos, preservando os dados sanitizados já retornados pelo backend. Em Manutenção foram agrupados o repositório oficial GitHub, o projeto oficial Supabase, a IA de Desenvolvimento do CAPO sem URL inventada quando não configurada, a Documentação Técnica e a área de correções/manutenções em andamento. O Perfil Técnico foi preservado dentro da mesma área de Manutenção.

**Linguagem e segurança:** nomes internos como método de verificação não aparecem no Painel Técnico. Identificadores de integração recebem rótulo funcional quando reconhecidos, inclusive Supabase Auth / Edge Functions. Os detalhes técnicos continuam disponíveis somente no contexto de Diagnóstico onde são necessários à investigação. Nenhum log, incidente, chamado ou manutenção fictícia foi criado para preencher a interface.

**Arquivos alterados:** `src/features/technical/TechnicalPage.tsx` e `src/features/technical/technical-page.css`. Commits da manutenção: `dd0d200d1c67d7bb2ea092074023821582956afc`, `c2ccea82a8d46a8e588c7412a5cee68a72125fa6` e `fc8e8fea574aec91735ad174893e44e726ec9b48`. Comparação contra `66bc26f897abf8975d4b94dcc5d0c2859f733999`: somente esses dois arquivos foram modificados.

**Preservação funcional:** nenhuma RPC, SQL, RLS, policy, migration, permissão, contrato Supabase, rota de autorização ou fluxo técnico foi modificado. O Gestor/Titular continua acessando a mesma Área Técnica por seu papel `administrador`; o perfil TI continua utilizando `administrador_tecnico`.

**Validação disponível nesta sessão:** inspeção física pós-alteração do arquivo e comparação de commits confirmaram o escopo restrito aos dois arquivos acima. Não há workflow de GitHub Actions disponível no repositório para executar automaticamente `npm test`, `npm run typecheck` e `npm run build` por esta conexão. Portanto, **não declarar PASS de suíte, typecheck, build ou homologação visual publicada nesta etapa**.

**Estado:** **CORRIGIDO NO CÓDIGO / ESCOPO CONFERIDO / AGUARDANDO SUÍTE COMPLETA E VALIDAÇÃO OPERACIONAL DA ÁREA TÉCNICA PUBLICADA**.


### 28.24 Correção pontual — gestão da agenda pelo Gestor e governança Coordenação → Administrativo (28/09/2026)

**Problemas observados:** (1) em **Gestor/Titular → Equipe e Agendas**, selecionar um profissional permitia editar cadastro, especialidades, papéis e permissões, mas não abria a configuração/horários reais da agenda desse profissional; (2) a Coordenação possuía a ação de **Efetivar alteração** depois da aprovação, misturando anuência com execução administrativa; (3) a Agenda Geral não apresentava ao Administrativo/Gestor autorizado as solicitações de alteração estrutural já aprovadas que aguardavam efetivação.

**Fundamento funcional usado nesta correção:** os registros vigentes do projeto tratam **alteração própria/operacional** e **alteração estrutural sujeita à Coordenação** como fluxos distintos. O fluxo funcional consolidado fica: profissional/necessidade → Coordenação analisa e **aprova/devolve** → solicitação aprovada fica aguardando execução → **Administrativo autorizado** efetiva a mudança estrutural. Férias, mudança permanente de horário, mudança de turno, carga e demais alterações estruturais não são executadas pelo Coordenador. Gestor/Titular mantém capacidade gerencial de consultar a configuração real e executar os ajustes operacionais temporários já autorizados pelos contratos existentes.

**Correção no Gestor/Titular:** `src/features/gestor/GestorTeamPage.tsx` passou a abrir, para o profissional selecionado, o gerenciador real de agenda reutilizando `OwnAgendaManager`. A consulta usa `getAgendaConfiguration(professionalId)`, portanto os horários/configurações exibidos vêm do backend e não são simulados. O Gestor pode registrar somente ajustes operacionais temporários suportados pelos contratos já existentes de bloqueio/exceção. A interface informa explicitamente que férias, mudança permanente de horário, turno ou carga seguem o fluxo Coordenação → anuência → efetivação administrativa.

**Reuso do gerenciador:** `src/features/agenda/OwnAgendaManager.tsx` foi parametrizado para uso tanto na própria agenda do profissional quanto na agenda de um profissional selecionado pelo Gestor, sem duplicar lógica. Permanecem os mesmos contratos `getAgendaConfiguration`, `createAgendaBlock` e `createAgendaException`. Nenhuma nova RPC foi criada.

**Correção na Coordenação:** `src/features/coordination/CoordinationDashboard.tsx` deixa de oferecer **Efetivar alteração**. A Coordenação continua podendo **Aprovar/Rejeitar** solicitações e **Aprovar/Devolver** decisões de equipe, inclusive férias e mudança de horário. Após aprovação, a interface informa **Aguardando efetivação administrativa**. A aprovação agora é apresentada explicitamente como anuência.

**Correção na operação administrativa:** `src/features/agenda/AgendaPage.tsx` passou a consultar `getAgendaChangeRequests('aprovada', null, 50)` somente para contas com papel `administrador` ou `administrativo_operacional`. A Agenda Geral mostra **Alterações estruturais aprovadas** e permite **Efetivar alteração aprovada** por meio do contrato existente `applyAgendaChangeRequest(requestId)`. Depois da confirmação do banco, a lista é recarregada e a agenda é atualizada. Coordenador e profissional não recebem esse controle.

**Arquivos alterados:** `src/features/agenda/AgendaPage.tsx`, `src/features/agenda/OwnAgendaManager.tsx`, `src/features/coordination/CoordinationDashboard.tsx` e `src/features/gestor/GestorTeamPage.tsx`. Comparação contra `ce439692a970c46462b6e397bf83a4a7ba71683b`: somente esses quatro arquivos foram modificados.

**Commits da manutenção:** `fd44db71ac99a5cc5404e093fad4c7b54da360b2`, `97222cbf8bbc06d93e3921c0f6248f7e5aeb13b4`, `daa29b2e2225f9b312bdd223026019fdfab762ac`, `033ba8c41e788fdb6bac7340519599f4496d3140`, `ade1f336bcac53abcca214ab83c4f70f9a6ec8f9` e `b12ca6a4f7e803e86a806f0775c8bfcfd884fa61`.

**Preservação técnica:** nenhuma migration, SQL, RPC, RLS, policy, trigger, permissão ou schema foi alterado. A correção apenas expõe e reorganiza na interface os contratos já existentes. Nenhum horário, férias, solicitação ou profissional fictício foi criado.

**Validação nesta sessão:** leitura física pós-alteração e comparação de commits confirmaram o escopo restrito aos quatro arquivos acima. Não foi possível executar localmente `npm test`, `npm run typecheck` ou `npm run build` por esta conexão, portanto **não declarar PASS de suíte nem homologação operacional publicada**.

**Estado:** **CORRIGIDO NO CÓDIGO / FLUXO FUNCIONAL SEPARADO / HORÁRIOS DO PROFISSIONAL LIGADOS AO GESTOR / AGUARDANDO SUÍTE COMPLETA E TESTE OPERACIONAL PUBLICADO**.


### 28.25 Reposicionamento da efetivação de alterações estruturais — Início do Gestor/Titular (28/09/2026)

**Solicitação visual/funcional:** o bloco **Alterações estruturais aprovadas** não deve ocupar espaço dentro da **Agenda Geral**. A função deve aparecer separadamente na aba **Início** do Gestor/Titular, imediatamente depois de **Cadastro de Profissional**.

**Correção aplicada:** o bloco completo foi removido de `src/features/agenda/AgendaPage.tsx`. A Agenda Geral volta a concentrar somente consulta de agenda, agendamento, remarcação e navegação Dia/Semana/Mês. O mesmo fluxo real de alterações aprovadas foi transferido para `src/features/gestor/GestorDashboard.tsx`, logo após o cartão **Cadastro de Profissional**, como área própria **Alterações estruturais aprovadas**.

**Comportamento preservado:** o painel continua consultando `getAgendaChangeRequests('aprovada', null, 50)` e a ação **Efetivar alteração aprovada** continua utilizando `applyAgendaChangeRequest(requestId)`. Não foi criada RPC, regra de negócio ou persistência nova; houve somente reposicionamento da função na interface do Gestor/Titular.

**Conferência física:** leitura da `main` após os commits confirmou que `GestorDashboard.tsx` contém **Alterações estruturais aprovadas** depois de **Cadastro de Profissional** e que `AgendaPage.tsx` não contém mais esse bloco.

**Commits:** `547dc1abf3442a748637263f07712db5c1cbbba7` — remoção da Agenda Geral; `0d983f40f137e0a4757ceda9eff9119b3a115051` — inclusão no Início do Gestor/Titular.

**Estado:** **CORRIGIDO NO CÓDIGO / POSIÇÃO CONFERIDA NA MAIN / AGUARDANDO VALIDAÇÃO VISUAL PUBLICADA**.


### 28.26 Aba própria de Gestão de Agenda no Gestor/Titular (28/09/2026)

**Solicitação:** o Gestor/Titular precisa ter uma aba própria para executar sobre a agenda de qualquer profissional os mesmos ajustes temporários já liberados na tela **Minha Agenda** do profissional, sem misturar essas ações com cadastro de equipe nem com mudanças estruturais sujeitas à Coordenação.

**Fonte física confrontada:** o arquivo nominal `CAPO_ESPECIFICACAO_ESTRUTURAL_DA_INTERFACE_2026-09-12.md` não está presente na árvore atual da `main`. Para não presumir conteúdo ausente, a regra foi confrontada com o Index estrutural aprovado existente no repositório (`index(20260913-103215).html`) e com o componente vigente `src/features/agenda/OwnAgendaManager.tsx`. Ambos separam **ajustes temporários da própria disponibilidade** de **mudanças estruturais de jornada/carga**, que devem seguir Coordenação.

**Operações temporárias preservadas:** Café / Intervalo; Alimentação / Almoço; Reunião; Atividade interna; Relatório; Bloquear período; Exceção de data. Os contratos continuam sendo `getAgendaConfiguration`, `createAgendaBlock` e `createAgendaException`.

**Correção aplicada:** `src/features/gestor/GestorTeamPage.tsx` passou a ter duas abas internas: **Cadastro de Profissionais** e **Gestão de Agenda**. Na aba Gestão de Agenda, o Gestor seleciona o profissional na lista da equipe, abre a configuração/horários reais retornados pelo backend e utiliza o mesmo `OwnAgendaManager` empregado no fluxo profissional. O cadastro, papéis, especialidades e permissões permanecem isolados na aba Cadastro de Profissionais.

**Governança preservada:** férias, mudança permanente de horário, mudança de turno, alteração de carga e demais mudanças estruturais não são efetivadas nesta aba. Continuam no fluxo **Coordenação → anuência → efetivação administrativa**.

**Ajuste de rótulo:** a opção `alimentacao` passou a ser apresentada como **Alimentação / Almoço**, sem mudança do valor técnico ou do contrato existente.

**Arquivos alterados:** `src/features/gestor/GestorTeamPage.tsx`, `src/features/agenda/OwnAgendaManager.tsx` e `src/features/gestor/gestor.css`.

**Commits:** `6f2937bc3d296212ab400af0badd15fba6f472f3`, `47235667dac1741e77634f6c83e429ddd8b64c15` e `41f979245f87d69355ff0609832b07dc691db78e`.

**Preservação:** nenhuma RPC, SQL, RLS, policy, trigger, migration ou permissão de backend foi alterada. A correção reutiliza exclusivamente contratos já existentes.

**Estado:** **CORRIGIDO NO CÓDIGO / ABA DE GESTÃO DE AGENDA CRIADA NO GESTOR / AGUARDANDO VALIDAÇÃO VISUAL PUBLICADA E SUÍTE COMPLETA**.

### 28.27 Substituição do timbre canônico em todos os PDFs (28/09/2026)

**Problema e imagem oficial:** a arte institucional incorporada anteriormente estava errada, e o gerador ainda compunha uma identificação textual separada abaixo dela. A Titular enviou o novo timbre completo `Imagem do ChatGPT 28 de set. de 2026, 17_10_24(1).png`. O arquivo integral e inalterado foi preservado em `src/assets/capo-timbre-oficial.png` (SHA-256 `f441287d862a90abac95f5464e72882ad9eef4c32811bc9fd326b2c32b83c1a3`, idêntico ao anexo recebido). `src/lib/pdf/capo-document-brand.ts` contém a mesma arte convertida integralmente para JPEG, na proporção original 1448 × 237, para incorporação no PDF; não houve recorte nem redesenho. A linha antiga montada com texto foi removida.

**Geradores físicos encontrados e atendidos:** `src/features/reports/report-export.ts` (Relatórios Gerenciais), `src/features/transport/TransportPage.tsx` (Solicitação de Transporte), `src/features/nutrition/NutritionPage.tsx` (Plano Alimentar) e `src/features/dentistry/DentistryPage.tsx` (Encaminhamento Odontológico). Todos chamam `src/lib/pdf/capo-document-pdf.ts`. A impressão opcional dos Relatórios pelo navegador também recebeu o PNG integral em `src/features/reports/ReportsPage.tsx` e `reports-page.css`. Busca posterior por criação de PDF em `src` não encontrou outro gerador ativo.

**Composição:** cada página mostra a arte única no topo, à largura útil de 505 pontos e altura proporcional de 82,65 pontos, com corpo abaixo da faixa. O rodapé registra a data e hora de geração em português, fuso de São Paulo, e a autoria fornecida pelo fluxo real: conta Gestor/Coordenador em Relatórios; solicitante Gestor em Transporte; profissional autor do Plano Alimentar em Nutrição; médico solicitante em Odontologia. Quando o autor não consta no contrato, a informação aparece explicitamente como não informada, sem atribuição fictícia. A imagem antiga e a linha textual redundante não são utilizadas.

**Relatórios sem registros e zeros:** PDF geral permanece habilitado quando a consulta oficial retorna estado vazio, com título, escopo, filtros e mensagem de ausência de registros; não inventa contagem. Indicadores numéricos `0` retornados pelo dashboard continuam impressos como `0`. RPCs, SQL, Supabase, Storage, autorização e fluxos de emissão não foram alterados.

**Arquivos desta correção:** `src/assets/capo-timbre-oficial.png`, `src/lib/pdf/{capo-document-brand,capo-document-pdf}.ts`, `src/features/reports/{ReportsPage.tsx,report-export.ts,reports-page.css}`, `src/features/{transport/TransportPage.tsx,nutrition/NutritionPage.tsx,dentistry/DentistryPage.tsx}`, `tests/unit/{capo-document-pdf,report-export,reports-labels}.test.*` e este Documento Mestre. A numeração duplicada das seções finais 28.20–28.23 foi regularizada para 28.23–28.26, sem reescrever o conteúdo histórico.

**Verificação interna:** testes direcionados de PDF/Relatórios **9/9 PASS** e testes pertinentes disponíveis **15/15 PASS**; suíte completa **243/244 PASS**, com uma falha de expectativa antiga em `tests/unit/App.test.tsx` para o título da Área Técnica. O mesmo teste falha no `origin/main` limpo anterior a esta alteração. `npm run typecheck` apresenta erro em `src/features/technical/TechnicalPage.tsx:417` (união string/número/boolean somada a número), também reproduzido no `origin/main` limpo anterior. Não foram alterados arquivos da Área TI nesta frente. `npm run build` **PASS**; `git diff --check` **PASS**. PDFs locais de teste dos quatro tipos, com conteúdo não clínico, foram abertos/renderizados: timbre integral legível, proporcional e sem sobreposição; segunda página também conferida; extração visual e textual confirmou indicadores `0` e rodapé. Isto não equivale à homologação com conta real no Pages.

**Estado:** **CORRIGIDO NO CÓDIGO / VALIDADO INTERNAMENTE / PUBLICAÇÃO E HOMOLOGAÇÃO OPERACIONAL PENDENTES**. PDFs já armazenados não são regravados por esta alteração. A pendência antiga de deploy descrita em 28.20 somente se encerra após gerar e abrir novos PDFs no sistema publicado.

**Publicação e conferência física do GitHub:** commit `d5cef933bc4b6fc94274590c2356ff27daf8cece` publicado no `main`. Leitura posterior de `origin/main` confirmou o PNG oficial (blob `a400b1bc28912c581e0d2ef71ca6cf8bff271286`) e o gerador com imagem proporcional e rodapé por extenso. A validação publicada com conta real segue pendente; não há confirmação de PDF novo baixado no Pages nesta sessão.


### 28.23 Tarefa 2 — conta mestre de homologação e troca de contexto no mesmo login (28/09/2026)

**Objetivo autorizado pela Titular:** criar uma conta exclusiva de manutenção/homologação, separada da conta Gestor/Titular, para conferir as telas ativas do CAPO em um único login, sem autenticar novamente a cada perfil e sem conceder o contexto Gestor/Titular.

**Conta configurada no Supabase:**
- username interno: `manuteste`;
- conta ativa;
- `is_homologation_account = true`;
- papel real/base e contexto inicial: `administrador_tecnico` — TI / Manutenção;
- papel `administrador` / Gestor-Titular não concedido;
- termo vigente aceito;
- registro-base em `homologation_contexts` criado.

**Perfis profissionais exclusivos de homologação criados e ativos:**
- Médico Clínico Geral → Clínica Geral;
- Nutrição → Nutrição;
- Assistência Social → Assistência Social;
- Psicologia → Psicologia;
- Fisioterapia → Fisioterapia.

As capacidades efetivas existentes foram preservadas conforme a configuração real do banco: Clínica Geral possui renovação de receita e encaminhamento odontológico externo; Assistência Social possui preenchimento de solicitação de transporte; os demais contextos utilizam as permissões/capacidades atualmente existentes para suas especialidades. Nenhuma capability fictícia foi adicionada.

**Interface:** o botão já existente `Perfil` foi reutilizado para a conta de homologação, preservando o padrão visual do sistema. Para `manuteste`, ele passa a oferecer:
- TI / Manutenção;
- Coordenador;
- Administrativo Operacional;
- Médico Clínico Geral;
- Nutrição;
- Assistência Social;
- Psicologia;
- Fisioterapia.

Não existe opção Gestor/Titular nesse seletor.

A troca usa exclusivamente as RPCs de homologação já existentes:
- `get_homologation_options_for_interface`;
- `set_homologation_context_for_interface`;
- `clear_homologation_context_for_interface`.

A sessão é preservada; após a seleção, o contexto efetivo é recarregado e a aplicação passa a aplicar as mesmas regras de rota, especialidade e capability usadas por contas reais.

**Cobertura das telas ativas fora do Gestor/Titular:** a combinação dos contextos acima cobre as rotas correntes de TI, Coordenação, Administrativo Operacional e áreas profissionais/especializadas (Clínica Geral, Nutrição, Assistência Social, Psicologia e Fisioterapia), inclusive Agenda, Solicitações, Fila, Faltosos, Encaminhamentos, Encerramentos, Relatórios e módulos condicionados por especialidade/capability. As rotas exclusivas `/gestor/*` permanecem deliberadamente fora desta conta.

**Arquivos alterados:**
- `src/components/shell/ProfileShortcuts.tsx`;
- `src/components/shell/profile-shortcuts.css`;
- `tests/unit/profile-shortcuts.test.tsx`.

**Commits de interface/teste:**
- `8deba4db7b01ef3e2f70a6988aa8301da0b19030`;
- `5d68be83f4d6ab5f5fb362850fcad528b6bed3bf`;
- `32f3abac41dfbb4285fee5b83b6065a449525c09`.

**Estado:** **IMPLEMENTADO NO BANCO E NO CÓDIGO / AGUARDANDO PUBLICAÇÃO E HOMOLOGAÇÃO OPERACIONAL REAL COM A CONTA `manuteste`**.


### 28.24 Correção da troca de perfil sem novo login (28/09/2026)

**Falha observada na homologação real:** ao selecionar outro perfil na conta `manuteste`, o contexto era alterado no banco, porém a interface executava `window.location.assign('/')`, provocando recarga completa da aplicação e exigindo novo login no ambiente publicado.

**Correção cirúrgica:** a troca de contexto passou a:
1. executar `set_homologation_context_for_interface` ou `clear_homologation_context_for_interface`;
2. atualizar o `AccessContext` dentro da sessão já autenticada por `refreshAccessContext()`;
3. navegar internamente para `/` com React Router;
4. preservar a sessão, sem reload completo e sem novo login.

**Arquivos alterados:**
- `src/features/access/access-context.tsx`;
- `src/components/shell/AppShell.tsx`;
- `src/app/App.tsx`;
- `src/components/shell/ProfileShortcuts.tsx`.

**Commits:** `dbbfa7fb6cbda073385608d291405f01ef3bfbdf`, `f7b904a4dfc97d613bc911880dc28aa003352477`, `f7246f68c0d39043bd4cbdfde3191dfd55876dd3`, `e5373d8161ded292f7a4e50bb65f999285a39a02`.

**Estado:** **CORRIGIDO NO CÓDIGO / AGUARDANDO NOVA PUBLICAÇÃO E TESTE REAL DA TROCA DE PERFIL SEM REAUTENTICAÇÃO**.


### 28.25 Correção — Relatórios/PDF no contexto Coordenador da conta de homologação (28/09/2026)

**Falha observada:** ao utilizar a conta mestre `manuteste` no contexto simulado `coordenador`, a interface reconhecia o perfil da Coordenação, porém a RPC `get_reports_dashboard_for_interface()` negava o painel gerencial. A causa física era a autorização interna da RPC consultar somente os papéis reais em `user_roles`. Como `manuteste` possui papel real/base `administrador_tecnico`, o contexto efetivo de homologação `coordenador` era ignorado.

**Correção cirúrgica no Supabase:** a RPC passou a reconhecer `coordenador` quando, simultaneamente:
- a conta está ativa e marcada com `is_homologation_account = true`;
- existe contexto de homologação habilitado;
- o papel simulado ativo é `coordenador`.

As verificações reais de `administrador` e `coordenador` permanecem preservadas para contas comuns. Nenhuma permissão de Gestor/Titular foi adicionada à conta `manuteste`.

**Efeito esperado:** no contexto Coordenador, a rota `/relatorios` pode carregar os indicadores gerenciais reais e disponibilizar os controles já existentes de impressão e `Gerar / salvar PDF`, inclusive quando os indicadores válidos retornarem valor zero.

**Persistência no repositório:** migration `supabase/migrations/20260928213500_allow_coordinator_homologation_reports.sql`.

**Commit:** `6cf16143b6bd03f5c2a598c751c4a784ec94028b`.

**Estado:** **CORRIGIDO NO SUPABASE E REGISTRADO NO GITHUB / AGUARDANDO TESTE REAL NO CONTEXTO COORDENADOR DA CONTA `manuteste`**.


### 28.26 Regressão visual/estrutural da Home do Administrativo Operacional — restauração do padrão aprovado (28/09/2026)

**Evidência de homologação real apresentada pela Titular:** a Home do contexto `administrativo_operacional` passou a exibir cards genéricos grandes, um bloco redundante de resumo operacional e não exibia a **Agenda do dia**, divergindo do Index aprovado `index(20260913-024654)_AUXILIAR_ADMINISTRATIVO.html`.

**Fonte canônica restaurada:** o Index aprovado contém, nesta ordem:
1. Painel Operacional / atalhos rápidos;
2. Agenda do dia;
3. Pendências do dia;
4. Faltosos;
5. indicadores operacionais;
6. Aniversariantes.

Os atalhos aprovados do bloco principal são:
- Pacientes;
- Agenda;
- Solicitações;
- Faltosos;
- Busca Ativa;
- Transporte;
- Familiares;
- Encaminhamentos.

**Correção cirúrgica aplicada no React atual:**
- restaurados os oito atalhos do Administrativo Operacional conforme o Index aprovado;
- restaurado o padrão visual compacto/colorido já utilizado pela interface aprovada, sem redesenho;
- restaurado o bloco real `Agenda do dia`, alimentado por `get_agenda_for_interface`;
- restaurados os blocos `Pendências do dia` e `Faltosos`, alimentados por `get_pending_items_for_interface` e `get_no_show_followups_for_interface`;
- removida da Home operacional a repetição do resumo genérico `Painel Operacional / Resumo do seu contexto` que havia reaparecido na implementação corrente;
- nenhuma informação fictícia foi adicionada; estados vazios permanecem explícitos;
- nenhuma regra de negócio, RLS, trigger ou autorização foi ampliada.

**Validação de backend:** `has_app_role()` já reconhece o papel simulado ativo das contas marcadas como homologação. Portanto Agenda, Pendências e Faltosos podem usar o mesmo contrato de autorização do Administrativo Operacional real dentro da conta `manuteste`, sem conceder o papel permanentemente.

**Conferência dos demais perfis contra o estado registrado no Documento Mestre:**
- Nutrição: `Minha Agenda` continua antes de `Aniversariantes de hoje`;
- Assistência Social: `Minha Agenda` continua antes de `Aniversariantes de hoje`;
- Coordenação: `Equipe e Profissionais` continua antes de `Agendas da Equipe` e `Aniversariantes de hoje`;
- TI: permanece com Painel Técnico próprio;
- Gestor/Titular não foi alterado nesta restauração.

**Arquivos alterados:**
- `src/features/home/ProfileDashboard.tsx`;
- `src/features/home/HomePage.tsx`;
- `src/features/home/home-page.css`;
- `tests/unit/App.test.tsx`;
- `tests/unit/profile-dashboard.test.tsx`.

**Commits:** `71fda737f9f5157d96d9b100271ad11dbf2d58b9`, `fd0fdf34ff0a9ce6e2a29c1eab02f45f6a38b610`, `4190f08a7ce4f74d1ba5c3c82a605c5d2086fbb7`, `6650841eb480cf8f8d868d3811f1f6f965d4263a`, `51a119548349233c3d4864c5d4c992566895da8f`.

**Estado:** **REGRESSÃO CORRIGIDA NO CÓDIGO / PADRÃO APROVADO RESTAURADO / AGUARDANDO PUBLICAÇÃO E HOMOLOGAÇÃO VISUAL REAL**.


### 28.27 Regressão de composição — módulo genérico “Minha atuação” nos perfis profissionais padrão (28/09/2026)

**Evidência de homologação real apresentada pela Titular:** no contexto profissional padrão, exemplificado por Fisioterapia, a Home exibia um bloco genérico denominado `Área compartilhada / Minha atuação assistencial`, além de item lateral `Minha atuação`. Esse elemento não corresponde à composição visual aprovada dos perfis profissionais do CAPO.

**Correção cirúrgica aplicada:**
- removido o item visível `Minha atuação` da navegação lateral;
- removido o card `Minha Atuação` do painel profissional genérico;
- removido da tela profissional o cabeçalho `Área compartilhada / Minha atuação assistencial`;
- removido o bloco redundante de atalhos `Rotina profissional` que precedia a agenda;
- o perfil profissional padrão passa a entrar diretamente por **Minha agenda**, preservando em seguida aniversariantes, pacientes vinculados e resumo operacional;
- quando houver mais de uma especialidade ativa no mesmo vínculo profissional, o seletor de especialidade permanece disponível junto da agenda; com apenas uma especialidade, ele não é exibido;
- no mecanismo de **acúmulo de função**, o mesmo botão `Perfil` passa a direcionar Psicologia, Fisioterapia, Clínica Geral e demais especialidades profissionais padrão para `Minha Agenda`, e não para um módulo genérico `Minha atuação`;
- Nutrição e Assistência Social continuam usando suas telas específicas;
- a rota interna `/atuacao` foi preservada apenas por compatibilidade técnica e não é oferecida como módulo de navegação ao usuário;
- funções próprias como `Encerrar minha atuação` permanecem preservadas porque representam ação funcional específica, e não a tela genérica removida.

**Arquivos alterados:**
- `src/components/navigation/navigation-config.ts`;
- `src/features/home/ProfileDashboard.tsx`;
- `src/features/professional/AssistentialPage.tsx`;
- `src/components/shell/profile-shortcuts.ts`;
- testes de App, ProfileShortcuts e contrato do shell.

**Commits principais:** `1bbd551bc4264f46ed59b66d010efe29ac7cf250`, `909e10ce8fcfafecd5135333ccd1cace9a6e8299`, `cbd3d88bfc3f139a3b17f16cd88dea1765f1eb38`, `061bab8cd16e7bd3da12f4e8457b9202568e5da0`, `be6f6801967001148945e6d9af235085949696a7`, `782783d9e1f8169b498acd71ff65755b1abfceef`, `84864464e2289273d29782a9c0cb73e4ee1ef5d2`, `215e97942b0109a6f31516b12ad96d7a3dc767c3`.

**Estado:** **REGRESSÃO CORRIGIDA NO CÓDIGO / ESTRUTURA PROFISSIONAL VISÍVEL RESTAURADA / AGUARDANDO PUBLICAÇÃO E HOMOLOGAÇÃO VISUAL REAL**.


### 28.28 Correção funcional — Renovação de Receita: Administrativo solicitante / Médico Clínico executor (28/09/2026)

**Evidência de homologação real apresentada pela Titular:** no contexto do Médico Clínico, a tela de Renovação de Receita estava visualmente e funcionalmente semelhante ao fluxo Administrativo e chegava a exibir retorno de autorização relacionado à seleção de médico destinatário. Isso contrariava a divisão funcional do CAPO: **o Administrativo é o solicitante e o Médico Clínico é o executor da tarefa**.

**Regra funcional consolidada:** o Administrativo localiza o paciente, seleciona o Médico Clínico destinatário, informa o motivo operacional e envia a solicitação. O Médico Clínico recebe somente as solicitações destinadas a ele, aceita a tarefa, executa a etapa médica no sistema oficial e, quando a receita estiver pronta, registra no CAPO **onde o paciente deverá retirá-la**. A solicitação retorna então ao Administrativo, que consulta a devolutiva do Clínico, contata/orienta o paciente e encerra o fluxo. Quando o Clínico indicar necessidade de consulta, o retorno segue ao Administrativo para agendamento.

**Divergência física confirmada no banco antes da correção:** a coluna `pickup_location` já existia em `public.prescription_renewal_requests`, porém a RPC médica `manage_prescription_renewal_medical_for_interface` não aceitava local de retirada; esse campo era preenchido apenas na etapa administrativa. A RPC de listagem já devolvia `pickup_location`.

**Correção no Supabase oficial:** aplicada a migration física `20260928215704_align_prescription_renewal_clinician_executor_flow`. A RPC médica passou a aceitar `p_pickup_location`; para a ação `renewed`, o local de retirada é obrigatório e gravado pelo Médico Clínico. A notificação ao Administrativo informa que a receita está pronta e que o local de retirada deve ser consultado. A RPC administrativa preserva o local informado pelo Clínico durante a conclusão e continua responsável por contato/orientação e encerramento. A assinatura física pós-migração foi conferida no projeto oficial `fftebavlhbfcrvrtnrld`.

**Correção de interface — Médico Clínico:** `src/features/renewals/RenewalPrescriptionPage.tsx` passou a apresentar o contexto profissional como **Renovação de Receita — Solicitações Recebidas**, com a descrição de que são tarefas encaminhadas pelo Administrativo. A tela profissional não consulta mais a lista de médicos destinatários, eliminando a mensagem indevida de autorização. As ações médicas passaram a ser **Aceitar solicitação**, registrar **Observação operacional**, informar **Local de retirada da receita**, marcar **Informar receita pronta** ou **Necessita consulta**.

**Correção de interface — Administrativo:** permanece com **Nova solicitação**, busca do paciente, seleção do Médico Clínico e envio. No retorno de receita pronta, o local de retirada aparece como informação **fornecida pelo Médico Clínico**; o Administrativo registra somente a orientação/contato e a observação administrativa final antes de concluir.

**Contratos frontend atualizados:** `src/lib/supabase/rpc.ts` passa `p_pickup_location` para a RPC médica; `src/types/database.ts` registra o novo parâmetro opcional. Os testes unitários de Renovação e de transporte RPC foram atualizados para exigir o fluxo médico com local de retirada.

**Arquivos alterados:** `src/features/renewals/RenewalPrescriptionPage.tsx`, `src/lib/supabase/rpc.ts`, `src/types/database.ts`, `tests/unit/renewal-prescription-page.test.tsx`, `tests/unit/supabase-rpc.test.ts` e `supabase/migrations/20260928215704_align_prescription_renewal_clinician_executor_flow.sql`.

**Commits principais:** `96c1286a713200c43677c934e22e0ae7aa09e624`, `7568cbf0013dfa4b0cf45a9b9691f7559154dd7b`, `2128558e7dcd05da2af18d85b1e60f0be6837ec7`, `a18a5c92288a293fd09c553d4992a4c905d81ddd`, `551010a0bff6f93d0a418242ee881f198c88a279` e `e8e4c2ec441d7567e623986a96ebd9692f719730`.

**Validação disponível nesta sessão:** assinatura física das RPCs no Supabase conferida após a migration: `manage_prescription_renewal_medical_for_interface(p_request_id uuid, p_action text, p_operational_return text, p_pickup_location text)`. O banco e o GitHub estão alinhados quanto ao novo contrato. A suíte `npm test`, `typecheck` e `build` não foi executada por esta conexão; não declarar PASS automatizado nem homologação visual publicada.

**Estado:** **CORRIGIDO NO SUPABASE E NO CÓDIGO / ADMINISTRATIVO SOLICITANTE E CLÍNICO EXECUTOR SEPARADOS / AGUARDANDO PUBLICAÇÃO, SUÍTE COMPLETA E TESTE OPERACIONAL REAL**.


### 28.28 Padronização visual dos atalhos principais por perfil (28/09/2026)

**Ordem da Titular:** aplicar o padrão visual de atalhos coloridos já aprovado no CAPO, sem reestruturar telas nem alterar funções.

**Escopo executado:**
- **Assistência Social:** somente os atalhos já existentes foram padronizados visualmente, sem qualquer alteração nos blocos funcionais, agenda, acompanhamento social ou fluxos. Permanecem: Minha Agenda, Acompanhamento Social no Serviço CAPO, Familiar / Cuidador e Solicitações.
- **Nutrição:** atalhos existentes de Planejamento Alimentar, Solicitações e Relatórios passaram a usar o mesmo padrão cromático/ícones dos acessos rápidos aprovados.
- **Coordenação:** os acessos rápidos existentes passaram a usar cores e ícones distintos, preservando exatamente as rotas e permissões já existentes.
- **Painéis compartilhados por perfil:** o contrato cromático dos cards foi generalizado para permitir que atalhos principais de Coordenador, Administrativo Operacional, Profissional, Nutrição e TI utilizem a mesma identidade visual quando renderizados pelo componente comum.
- **Gestor/Titular:** nenhuma função ou estrutura foi alterada; seu padrão aprovado foi apenas reutilizado como referência visual.
- Nenhuma RPC, RLS, policy, trigger, tabela, autorização, ordem de fluxo ou regra de negócio foi alterada.
- Nenhum atalho funcional novo foi criado nesta padronização; foram estilizados os atalhos já existentes.

**Arquivos alterados:**
- `src/features/social/SocialPage.tsx`;
- `src/features/social/social-page.css`;
- `src/features/nutrition/NutritionPage.tsx`;
- `src/features/coordination/CoordinationDashboard.tsx`;
- `src/features/home/ProfileDashboard.tsx`;
- `src/features/home/home-page.css`.

**Commits:** `2b8dea3fa617ae45812913ad98cf07bc94b04e19`, `8f60b8e02cbff76967223dcb09868098ac88d52e`, `085f29e02a20f3a4b9b19f190477c840485f1d0e`, `88bdb6ab46b142ef1c16667d5ec61a90768a3e14`, `46e658bbd40665c36bc89fa99f76d5fdf714f3c0`, `5e5886dd391cd9e9938dee231346b80de0698694`.

**Estado:** **PADRONIZAÇÃO VISUAL APLICADA NO CÓDIGO / SEM ALTERAÇÃO FUNCIONAL / AGUARDANDO HOMOLOGAÇÃO VISUAL PUBLICADA**.
### 28.29 Correção pontual — separação dos logins Gestor/Titular e TI/Manutenção (28/09/2026)

**Evidência no Supabase oficial:** `daniele` tinha papel principal `administrador`, mas estava marcada como conta de homologação com contexto simulado profissional ativo; o contexto simulado substituía a tela principal. `manuteste` já tinha papel principal `administrador_tecnico`, conta de homologação habilitada e simulação inativa. Os dois usuários têm IDs distintos e papéis principais distintos.

**Correção aplicada somente aos dados da conta `daniele`:** desativado o contexto simulado em `public.homologation_contexts` e retirada a marca de conta de homologação em `public.user_accounts`, em uma transação. Nenhuma senha, papel, função, RPC, migration ou código de interface foi alterado. A conta `manuteste` permanece habilitada para alternância controlada dos perfis de homologação pelo botão Perfil, conforme contrato já implementado no `main`.

**Verificação física após a transação:** `daniele`: `administrador`, simulação inativa, homologação desabilitada; `manuteste`: `administrador_tecnico`, simulação inativa, homologação habilitada. O login por nome de usuário consulta o e-mail interno vinculado em Supabase Auth. `manuteste` está vinculado a `danielecarvalho.smsregulcao@gmail.com`.

**Retificação final da grafia do e-mail `daniele`:** a responsável especificou expressamente `administrativo.capo@gmail.com` como endereço principal. O endereço em `auth.users` e na identidade de e-mail em `auth.identities` foi restaurado conjuntamente para essa grafia. A verificação física final confirmou ambas as tabelas, e-mail confirmado e contexto principal `administrador`. O mesmo ID de usuário e a senha foram preservados. O CAPO autentica pelo nome de usuário `daniele`.

**Estado:** **VÍNCULOS DE PERFIL E E-MAIL PRINCIPAL CORRIGIDOS E CONFERIDOS NO BANCO; LOGIN REAL E ALTERNÂNCIA NA PUBLICAÇÃO PENDENTES DE TESTE COM AS RESPECTIVAS CONTAS.**
### 28.30 Regressão visual das telas iniciais por perfil — acessos rápidos (28/09/2026)

**Evidência apresentada pela Titular:** após conseguir alternar pelos perfis publicados, as telas iniciais de Coordenação, Assistência Social, TI/Manutenção e profissionais não reproduziam o desenho aprovado dos acessos rápidos do Gestor/Titular. Referência visual real enviada nesta sessão: faixa de boas-vindas do shell, título de painel e cards compactos com cor, ícone, título e descrição, em grade responsiva. As funções de cada card devem ser pertinentes ao perfil. A aprovação interna anterior de presença/ordem de elementos não equivalia à aprovação visual publicada. Gestor/Titular está correto e a Home do Administrativo Operacional já havia sido corrigida; ambos foram preservados.

**Causa física:** o padrão completo da grade de cards estava restrito ao seletor `home-profile-gestor`; Coordenação mantinha cards sem descrições e sem a classe de composição aprovada; Assistência Social usava card próprio de outra proporção; TI usava abas sem cores de atalhos; o profissional assistencial padrão entrava na agenda sem cards. Nutrição tinha tons, mas não a composição visual do padrão comum. A Home profissional contempla também o Clínico Geral; nenhuma função profissional nova foi inventada.

**Correção visual restrita:** novo estilo compartilhado `src/styles/quick-access.css` aplica grade de até oito colunas, ícone, título, descrição, cor e adaptação móvel aos painéis não Gestor/AO. Coordenação manteve as rotas já existentes e ganhou descrições curtas; Assistência Social preservou os quatro atalhos existentes e seus destinos; Nutrição usa a mesma composição; profissional padrão e Clínico Geral ganharam atalhos para seções/rotas já existentes e autorizadas, incluindo Renovação de Receita somente para especialidade Clínica Geral autorizada; TI transformou os quatro seletores de módulo já existentes em cards coloridos, conservando a mudança de aba e a autorização. Nenhuma RPC, permissão, banco, dado, agenda ou layout do Gestor/Titular e AO foi alterado. A tipagem preexistente de soma do resumo de suporte técnico foi explicitada como número, sem mudar seu cálculo.

**Arquivos:** `src/styles/quick-access.css`, `src/features/home/HomePage.tsx`, `src/features/home/ProfileDashboard.tsx`, `src/features/coordination/CoordinationDashboard.tsx`, `src/features/social/SocialPage.tsx`, `src/features/nutrition/NutritionPage.tsx`, `src/features/professional/AssistentialPage.tsx`, `src/features/technical/TechnicalPage.tsx`, `src/features/technical/technical-page.css`.

**Verificação interna:** `npm run typecheck` PASS; `npm run build` PASS; testes direcionados de perfil e Social 9/9 PASS; suíte completa 242/245 PASS. As três falhas em `App.test.tsx` (título antigo da Área Técnica), `profile-shortcuts.test.tsx` (atalho de atuação antiga) e `renewal-prescription-page.test.tsx` (texto antigo de estado vazio) foram reproduzidas também no `main` limpo anterior a esta correção, com os mesmos cenários, portanto não são regressões introduzidas por este ajuste visual. Homologação visual dos perfis no Pages após deploy permanece **PENDENTE**; não declarar PASS publicado antes da inspeção física.

**Estado:** **REGRESSÃO VISUAL CORRIGIDA NO CÓDIGO / TESTES DIRECIONADOS, TYPECHECK E BUILD PASS / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL PELA TITULAR.**


### 28.29 Regressão de linguagem/estrutura — Familiar / Cuidador (28/09/2026)

**Evidência apresentada na homologação real:** a tela Familiar / Cuidador no contexto Administrativo Operacional exibia blocos e textos técnicos voltados à implementação, entre eles **Registros confidenciais**, **Integração oficial CAPO** e a frase **“O vínculo familiar e o fluxo de luto usam contratos distintos e auditáveis do Supabase.”**

**Confronto estrutural:** o Index aprovado `index(20260913-103215).html` não contém esses blocos nem expõe Supabase/contratos técnicos ao usuário. A composição aprovada do módulo Familiar / Cuidador é funcional e centrada em **Vincular / substituir familiar**, **Familiar ativo** e **Histórico de substituições**. O Documento Mestre já registra que Familiar/Cuidador e Luto são fluxos distintos, mas essa separação pertence à implementação e à auditoria, não à linguagem operacional da tela.

**Correção aplicada:** removidos da interface os blocos **Registros confidenciais** e **Integração oficial CAPO** e qualquer menção visível a contratos/Supabase nessa área. O cabeçalho passou a usar a regra funcional aprovada: **“Somente um familiar pode permanecer ativo por paciente; substituições preservam o histórico.”** O estado vazio foi ajustado para **“Nenhum familiar ativo para o paciente selecionado.”** e o histórico passou a usar linguagem funcional, sem termos de implementação.

**Preservação funcional:** nenhuma RPC, SQL, RLS, policy, trigger, migration, autorização ou dado do módulo foi alterado. A correção é exclusivamente de composição e linguagem da interface. A separação real entre Familiar/Cuidador e Luto permanece preservada no backend e nas rotas.

**Teste atualizado:** `tests/unit/family-caregiver-page.test.tsx` deixou de exigir os textos técnicos removidos e agora verifica explicitamente que **Supabase**, **Registros confidenciais** e **Integração oficial CAPO** não aparecem na interface do usuário.

**Arquivos alterados:** `src/features/social/FamilyCaregiverPage.tsx` e `tests/unit/family-caregiver-page.test.tsx`.

**Commits:** `72650ed6c1d4d1229ec76ebae30867e9f19c5481`, `c26b6cd6c051abdcb405c54e611e09d9ecb9cf4d` e `a969d76a3ebe1231c44e6e09f1babdf6ed44aca1`.

**Estado:** **REGRESSÃO CONFIRMADA E CORRIGIDA NO CÓDIGO / PADRÃO ESTRUTURAL RESTAURADO / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL**.


### 28.30 Regressão de usabilidade — botões congelados na Busca Ativa administrativa (28/09/2026)

**Evidência de homologação:** na Busca Ativa do Administrativo, os botões de operação aparentavam permanecer congelados/desabilitados durante o uso.

**Confronto físico:** o Supabase oficial foi relido. As RPCs `get_active_searches_for_interface`, `register_active_search_attempt_for_interface`, `close_active_search_for_interface` e `search_patients_for_interface` reconhecem explicitamente o papel `administrativo_operacional` para consulta/operação, portanto não havia bloqueio de autorização no banco. O Index aprovado mantém validação de contexto antes da gravação, mas a implementação React havia transferido parte dessa validação para atributos `disabled`, fazendo o controle parecer congelado em vez de orientar o usuário.

**Correção aplicada:** em `src/features/gestor/ActiveSearchPage.tsx`, os botões **Buscar**, **Registrar tentativa** e **Encerrar Busca Ativa** deixam de ser bloqueados por preenchimento incompleto. Permanecem desabilitados apenas enquanto existe mutation em andamento (`busy`), evitando duplicidade de gravação. Ao clicar com dados insuficientes, a própria tela informa o requisito: busca com pelo menos dois caracteres, seleção do paciente, resultado do contato com pelo menos dois caracteres ou motivo de encerramento com pelo menos cinco caracteres.

**Regras de negócio preservadas:** o backend continua validando paciente ativo, não falecido, com histórico CAPO, meio de contato permitido, resultado mínimo, próximo contato futuro e motivo de encerramento. Nenhuma RPC, SQL, RLS, policy, trigger ou migration foi alterada.

**Commit:** `8f430d2a1d91cdb801c543f71ba05aea71e663e6`.

**Estado:** **REGRESSÃO DE INTERFACE CONFIRMADA E CORRIGIDA NO CÓDIGO / AUTORIZAÇÃO DO AO CONFIRMADA NO SUPABASE / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.31 Regressão de usabilidade — controles congelados em Encerramentos (28/09/2026)

**Evidência de homologação:** na tela **Encerramentos**, os controles de operação permaneciam visualmente congelados/desabilitados até que todos os campos exigidos estivessem previamente preenchidos.

**Confronto com a auditoria vigente:** a seção 7.13 do Documento Mestre já determina que a autorização real das ações de Encerramentos vem do backend e dos campos retornados pelo próprio contrato, especialmente `can_close`, `can_reopen`, status da pendência e elegibilidade de profissional. Portanto, a interface deve respeitar essas autorizações, mas não precisa transformar validações de preenchimento em botões permanentemente desabilitados.

**Correção aplicada:** em `src/features/closures/ClosuresPage.tsx`, os botões de **Buscar paciente**, **Concluir meu encerramento**, **Reabrir encerramento**, **Atribuir profissional**, **Solicitar encerramento da própria atuação** e **Abrir ciclo de retorno** deixaram de ser bloqueados por formulário incompleto. Permanecem desabilitados apenas durante operação em andamento (`busy`) para impedir gravação duplicada.

**Validação orientada:** quando faltar informação obrigatória, o botão responde com mensagem clara na própria tela, por exemplo: selecionar paciente, selecionar especialidade, escolher profissional elegível ou informar motivo/observação com pelo menos cinco caracteres.

**Governança preservada:** as ações continuam aparecendo somente quando autorizadas pelo contexto e pelo retorno do backend. Profissional continua limitado ao próprio encerramento; Administrativo/Administrador mantêm apenas as ações administrativas previstas; Coordenador permanece sem ações que o backend não autoriza.

**Backend preservado:** nenhuma RPC, SQL, RLS, policy, trigger, migration ou permissão foi alterada.

**Commit:** `122b70e30425781ae83ef6a61b6411c9b0f4b955`.

**Estado:** **REGRESSÃO DE INTERFACE CONFIRMADA E CORRIGIDA NO CÓDIGO / REGRAS DE AUTORIZAÇÃO PRESERVADAS / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.32 Padronização visual — Relatórios profissionais por cards/ícones (28/09/2026)

**Solicitação:** substituir a apresentação sequencial/listada dos tipos de relatório profissional pelo mesmo padrão visual já utilizado nas demais telas profissionais: **cards com ícones**, preservando dados, filtros e contratos existentes.

**Correção aplicada:** em `src/features/reports/ReportsPage.tsx`, os blocos profissionais de **Agenda**, **Retornos**, **Fila da especialidade**, **Solicitações**, **Encaminhamentos** e **Encerramentos** passaram a ser apresentados como cards icônicos selecionáveis. Ao selecionar um card, a tela exibe somente os indicadores daquele relatório, mantendo o período e a especialidade atualmente selecionados.

**Padrão visual:** foram adicionados ícone, título, descrição curta, destaque do card selecionado, cores discretas por categoria e comportamento responsivo. Em telas menores, a grade se reorganiza sem transformar os relatórios novamente em lista textual.

**Preservação funcional:** nenhuma RPC, SQL, RLS, policy, permissão, regra de cálculo, filtro, fonte de dados ou geração de PDF foi alterada. A mudança é exclusivamente de apresentação da área profissional de Relatórios.

**Arquivos alterados:** `src/features/reports/ReportsPage.tsx` e `src/features/reports/reports-page.css`.

**Commits:** `3c7277d617b21fb68491cd2d1409985788bcfd09` e `678173c80bc8c4db5af51ee6ae14d903a6d1a6f5`.

**Estado:** **PADRONIZADO NO CÓDIGO / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL**.


### 28.33 Correção funcional — autonomia temporária em “Gerenciar minha agenda” do Clínico (28/09/2026)

**Regra funcional confirmada:** a área **Gerenciar minha agenda** pertence à autonomia temporária do próprio profissional. O Médico Clínico pode flexibilizar diretamente a própria agenda, sem depender do Administrativo, para ajustes temporários como **Café / Intervalo**, **Alimentação / Almoço**, **Reunião**, **Atividade interna**, **Relatório**, **Bloquear período**, **Exceção de data** e **Horário provisório em data específica**. Somente alterações permanentes/estruturais de jornada, turno, carga ou horário seguem **Coordenação → anuência → efetivação administrativa**.

**Confronto estrutural:** o Index aprovado do Médico Clínico e o registro de auditoria já separam **autonomia temporária da própria disponibilidade** de **mudanças estruturais**. O componente vigente `OwnAgendaManager` já utilizava `getAgendaConfiguration`, `createAgendaBlock` e `createAgendaException`, mas a opção genérica de exceção era gravada apenas como bloqueio e o backend ainda tratava qualquer `alteracao_horario` como estrutural, mesmo sendo uma exceção de data específica.

**Correção na interface:** `src/features/agenda/OwnAgendaManager.tsx` passou a explicitar a autonomia temporária sem dependência do Administrativo e ganhou a opção **Horário provisório — data específica**. Essa opção é registrada como `alteracao_horario` em `createAgendaException`. O botão **Registrar alteração temporária** deixou de ficar bloqueado por formulário incompleto e permanece desabilitado apenas durante gravação; a validação continua exibindo mensagem clara quando faltarem tipo, data, horário ou justificativa.

**Correção no Supabase oficial:** aplicada a migration `allow_professional_temporary_own_schedule_time_exception`, registrada no repositório como `supabase/migrations/20260928223000_allow_professional_temporary_own_schedule_time_exception.sql`. A RPC `create_agenda_exception_for_interface` continua impedindo alteração em agenda de outro profissional e continua exigindo Administrativo Controlador para exceção retroativa, mas deixa de bloquear `alteracao_horario` quando é uma exceção da própria agenda em data específica.

**Mudanças permanentes preservadas:** bloqueios recorrentes por dia da semana continuam restritos à Administração no contrato de `create_agenda_block_for_interface`; alterações permanentes de jornada/carga/turno continuam fora de `Gerenciar minha agenda` e seguem o fluxo de Coordenação e execução administrativa.

**Commits:** `2083fde3e14a5c275bb7525249111b787358e97b` e `5c9defcef97ff077ba893542bdb1c6661809afab`.

**Estado:** **CORRIGIDO NO CÓDIGO E NO SUPABASE / AUTONOMIA TEMPORÁRIA DO CLÍNICO PRESERVADA / ALTERAÇÕES PERMANENTES MANTIDAS NO FLUXO COORDENAÇÃO → ADMINISTRATIVO / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.34 Correção de navegação e competência — Minha Agenda / Gerenciar minha agenda / Remarcação (28/09/2026)

**Evidência de homologação:** no contexto do Médico Clínico, o acesso de agenda estava confundindo a visualização da própria agenda com o fluxo de remarcação de consulta, enquanto o acesso **Gerenciar minha agenda** não estava disponível de forma clara no Início nem na barra lateral.

**Regra vigente confirmada pela Titular:** o profissional **consulta a própria agenda**, registra presença/falta, **agenda retorno** quando o atendimento permitir e gerencia diretamente os **ajustes temporários da própria disponibilidade**. A **remarcação de consulta** pertence ao Administrativo. Alterações permanentes de horário/jornada/carga continuam no fluxo Coordenação → anuência → efetivação administrativa.

**Correção de navegação:** criada a rota profissional `/minha-agenda/gerenciar`, que abre diretamente `AgendaPage` com o `OwnAgendaManager` expandido. A barra lateral profissional passou a apresentar **Minha Agenda** para `/agenda` e **Gerenciar minha agenda** como item separado. No Início profissional, **Minha Agenda** passou a navegar para `/agenda` e foi incluído card próprio **Gerenciar minha agenda — Bloqueios e ajustes temporários**.

**Correção na Agenda do profissional:** o título passou a ser **Minha Agenda**. O botão geral **Remarcar retorno** foi removido do contexto profissional. O botão **Gerenciar minha agenda** permanece dentro da própria Agenda e abre os ajustes temporários. O profissional continua podendo **Agendar retorno** a partir do atendimento confirmado; esse fluxo cria retorno novo e não executa remarcação de consulta existente.

**Endurecimento de interface:** mesmo que algum estado antigo tente abrir o formulário de remarcação, `AgendaPage` não renderiza esse formulário no contexto profissional e a função de remarcação retorna orientação de que a operação pertence ao Administrativo.

**Correção de autorização no Supabase oficial:** a regra anterior registrada em 26/09, que permitia ao profissional consultar/remarcar o próprio retorno, foi **superada por esta regra vigente**. Aplicada a migration `restrict_rescheduling_to_administrative_flow`, registrada no repositório como `supabase/migrations/20260928231500_restrict_rescheduling_to_administrative_flow.sql`. As funções `get_reschedulable_appointments` e `reschedule_appointment_for_interface` agora autorizam somente `administrador` e `administrativo_operacional`. Coordenador e profissional não executam remarcação.

**Arquivos de interface alterados:** `src/app/route-access.ts`, `src/components/navigation/navigation-config.ts`, `src/app/App.tsx`, `src/features/agenda/AgendaPage.tsx` e `src/features/professional/AssistentialPage.tsx`.

**Commits:** `7f515623da266b5abcb255ceabd4fbb97dad993a`, `a1cd828173af7870b6a87cce1aeaef7882be4e76`, `281740d66d484b2e7ea9b3fa6c4b047d81e0a7b5`, `a2f9cf26c45d24905810e7493e3a5acf06021c66`, `5214d52c5a8c87a6faf671ef9c57e6dca6a1b044`, `f69acbae09db2e9075a42d3cfdf7283667b8996c` e `d3ef897428baa047f91f5f5772f76060bcfd7623`.

**Conferência física pós-correção:** `AgendaPage.tsx` contém **Gerenciar minha agenda**, não contém mais **Remarcar retorno** no contexto profissional e mantém **Remarcar** apenas na área administrativa. O Início profissional contém links separados para `/agenda` e `/minha-agenda/gerenciar`. A barra lateral contém o novo item. As duas RPCs de remarcação foram relidas no Supabase e não incluem mais autorização para `profissional`.

**Estado:** **CORRIGIDO NO CÓDIGO E NO SUPABASE / FLUXOS SEPARADOS / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.35 Correção de contexto — Renovação de Receita do Médico Clínico sem opções administrativas (28/09/2026)

**Evidência de homologação:** na tela de Renovação de Receita aberta no contexto do Médico Clínico ainda apareciam opções administrativas quando a conta possuía papéis acumulados. Isso contrariava o fluxo já registrado na seção 28.28: **Administrativo solicita; Médico Clínico executa; Administrativo recebe a devolutiva e orienta o paciente**.

**Confronto estrutural:** o Index aprovado do Médico Clínico organiza Renovação de Receita como fila de **Recebidas / Em andamento / Histórico**, com atuação médica sobre a solicitação recebida e devolução operacional ao Administrativo. A tela clínica não deve expor criação administrativa, seleção de médico destinatário, cancelamento administrativo ou conclusão administrativa.

**Causa confirmada:** `RenewalPrescriptionPage.tsx` usava a lista acumulada de papéis da conta para definir `canCreate` e `canManageAdmin`. Assim, uma conta cujo contexto principal era `profissional`, mas que também possuía papel administrativo acumulado, podia receber simultaneamente controles clínicos e administrativos.

**Correção aplicada:** a tela passa a usar o **contexto principal aberto**. Quando `primary_context.code='profissional'` e existe a capacidade `renovacao_receita`, o usuário é tratado exclusivamente como executor médico naquele módulo. Criação de nova solicitação e ações administrativas só aparecem quando o contexto principal é `administrador` ou `administrativo_operacional`.

**Fluxo clínico simplificado:** para solicitação `awaiting_medical`, o botão passou a ser **Recebido**. Após o recebimento, no estado `medical_in_progress`, o Clínico informa **Onde retirar a receita** e pode registrar uma **Observação para o Administrativo (opcional)**. O botão principal passou a ser **Receita pronta**. A observação deixa de ser obrigatória para receita pronta; quando vazia, o frontend envia a devolutiva operacional neutra `Receita pronta`, preservando o contrato do backend. O fluxo secundário **Necessita consulta** permanece disponível e exige justificativa operacional.

**Devolução automática preservada:** a RPC física `manage_prescription_renewal_medical_for_interface` foi relida no Supabase oficial e já registra `pickup_location`, move a solicitação para `awaiting_admin` e chama `capo_criar_notificacao` para o papel `administrativo_operacional` com o aviso **Receita pronta para retirada**. Portanto, não foi necessária nova alteração de banco nesta etapa.

**Teste de regressão:** `tests/unit/renewal-prescription-page.test.tsx` foi atualizado para o novo fluxo **Receita pronta + local de retirada** e ganhou cenário específico em que a conta possui `profissional` e `administrativo_operacional`, mas está com contexto principal `profissional`; nesse caso, a tela deve exibir **Recebido** e não pode exibir **Nova solicitação** nem **Cancelar solicitação**.

**Arquivos alterados:** `src/features/renewals/RenewalPrescriptionPage.tsx` e `tests/unit/renewal-prescription-page.test.tsx`.

**Commits:** `efac69e4c0b81cc2e667beaa0e94c10ae9ece434`, `e62c3773a3c55771ac1eb9ceb2761ab6f7e5c00b` e `35dd2831681be7d52b528299707b48c6469c924a`.

**Estado:** **REGRESSÃO DE CONTEXTO CONFIRMADA E CORRIGIDA NO CÓDIGO / DEVOLUÇÃO AUTOMÁTICA AO ADMINISTRATIVO CONFIRMADA NO SUPABASE / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.36 Correção de contexto — Odontologia do Médico Clínico sem funções administrativas (28/09/2026)

**Evidência de homologação:** na tela de Odontologia aberta no contexto do Médico Clínico ainda podiam aparecer funções administrativas quando a conta possuía papéis acumulados.

**Confronto com o projeto estrutural:** o Index aprovado do Médico Clínico define o fluxo profissional como **Novo encaminhamento + Histórico**, com busca do paciente, destino, conteúdo do encaminhamento, identificação do Médico Clínico/CRM, pré-visualização e geração do PDF oficial. A seção 7.12 desta auditoria confirma que o PDF odontológico é de autoria exclusiva do profissional competente. Gestão e Administrativo apenas recebem, visualizam/baixam o documento e conduzem a providência administrativa.

**Causa confirmada:** `src/features/dentistry/DentistryPage.tsx` utilizava diretamente os indicadores acumulados `can_issue` e `can_manage` devolvidos pelo backend. Em contas com mais de um papel, isso permitia que o contexto clínico exibisse simultaneamente emissão profissional e controles administrativos.

**Correção aplicada:** a tela agora separa as ações pelo `primary_context.code`. Quando o contexto principal é `profissional`, somente `can_issue` é considerado e a tela apresenta **Nova emissão**, **Histórico**, geração do **PDF oficial** e consulta/visualização do documento. Quando o contexto principal é `administrador` ou `administrativo_operacional`, somente `can_manage` é considerado e são exibidos **Encaminhamentos recebidos**, campo de **Providência / informação administrativa** e ações administrativas autorizadas.

**Controles removidos do contexto Clínico:** **Iniciar atendimento**, **Concluir atendimento**, **Cancelar encaminhamento** e **Providência / informação administrativa** não são renderizados no contexto profissional, mesmo quando o backend informa `can_manage=true` por papel acumulado.

**Preservação funcional:** geração e vinculação do PDF continuam exclusivas do profissional emissor; Administrativo/Gestão não recebem ação de geração do documento. Nenhuma RPC, SQL, RLS, policy, trigger ou migration foi alterada nesta etapa.

**Teste de regressão:** `tests/unit/dentistry-page.test.tsx` foi atualizado para usar contexto administrativo real no teste de gestão e ganhou cenário específico de papel acumulado, confirmando que o contexto principal `profissional` não exibe controles administrativos.

**Arquivos alterados:** `src/features/dentistry/DentistryPage.tsx` e `tests/unit/dentistry-page.test.tsx`.

**Commits:** `85f7617665e763cd4ffbfd5739db789c3432e0f1` e `7ad8dcecc38e8d8d4b369e5b0baa4550997a26a2`.

**Estado:** **REGRESSÃO DE CONTEXTO CORRIGIDA NO CÓDIGO / FUNÇÕES CLÍNICAS E ADMINISTRATIVAS SEPARADAS / BACKEND PRESERVADO / AGUARDANDO PUBLICAÇÃO E TESTE VISUAL REAL**.


### 28.37 Correção funcional — encerramentos independentes por especialidade com aviso aos demais profissionais (29/09/2026)

**Regra funcional confirmada pela Titular:** cada profissional encerra somente a própria atuação/especialidade, de forma independente. O encerramento de uma especialidade **não cria obrigação, pendência automática nem dependência** para as demais. Quando uma especialidade é encerrada, os outros profissionais que ainda atendem aquele paciente recebem apenas um **aviso informativo**. Cada um encerra sua própria atuação conforme sua programação individual. A formalização do encerramento global do ciclo CAPO permanece como etapa administrativa separada.

**Confronto estrutural:** o modelo canônico continua sendo **Paciente → Ciclo CAPO → Especialidade participante → Responsável operacional → Encerramento profissional da especialidade**. A função `finalize_care_cycle_for_interface` permanece restrita a Administrador/Administrativo Operacional e só formaliza o ciclo quando as especialidades participantes estiverem encerradas. Nenhuma especialidade passa a depender temporalmente do encerramento de outra.

**Correção no Supabase oficial:** `close_care_closure_for_interface` passou a identificar os demais profissionais ativos do mesmo ciclo/paciente, utilizando responsáveis atuais das especialidades e profissionais com agendamentos válidos no ciclo. O profissional que realizou o encerramento é excluído. Cada destinatário recebe notificação **individual**, por `auth_user_id`, do tipo `care_specialty_closed`, informando que outra especialidade encerrou sua atuação e que a atuação do destinatário permanece independente. Não são criados novos `patient_care_closures` para os demais profissionais e o estado das outras especialidades não é alterado por esse aviso.

**Aviso administrativo preservado:** a notificação `care_closure_completed` para `administrativo_operacional` foi mantida para acompanhamento e posterior formalização do ciclo quando aplicável.

**Correção de interface:** em `src/features/closures/ClosuresPage.tsx`, a linguagem deixou de tratar o ato profissional como uma solicitação a terceiro. O botão passou a ser **Encerrar minha atuação**. O fluxo da própria especialidade cria o registro técnico necessário e conclui o encerramento imediatamente na sequência, exibindo quantos outros profissionais foram avisados quando o backend devolve essa contagem. A tela explicita que os demais profissionais são apenas avisados e encerram sua atuação de forma autônoma.

**Migration:** `supabase/migrations/20260929011500_notify_other_professionals_on_independent_specialty_closure.sql`.

**Commits:** `144048dbc2d6bd293f5668d070f5a7c3db26f08d` e `e44f2e76ba2a89f1290243b2d2aca5000ce439e7`.

**Conferência física pós-correção:** a função foi relida no Supabase e contém notificação individual por `auth_user_id`, preserva o aviso ao Administrativo e não modifica outras especialidades. A tela atual contém o texto de independência entre encerramentos e não contém mais o botão **Solicitar encerramento da própria atuação**.

**Estado:** **CORRIGIDO NO CÓDIGO E NO SUPABASE / ENCERRAMENTOS INDIVIDUAIS E INDEPENDENTES / AVISO ENTRE PROFISSIONAIS IMPLEMENTADO / FORMALIZAÇÃO FINAL ADMINISTRATIVA PRESERVADA / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.38 Regressão de contexto — relatório profissional chamando dashboard gerencial (29/09/2026)

**Evidência de homologação:** no contexto **Profissional / Médico Clínico**, a tela de Relatórios exibia corretamente os cards e indicadores da própria especialidade, mas também apresentava o erro **“Não foi possível carregar o dashboard: Perfil sem autorização para Relatórios gerenciais do CAPO.”**

**Confronto estrutural e físico:** o Index aprovado do Médico Clínico define **Relatórios da Clínica Geral** como relatório operacional da própria atuação. No Supabase oficial, `get_my_specialty_operational_report_for_interface` autoriza o profissional autenticado a consultar indicadores da especialidade vinculada ao próprio profissional. Já `get_reports_dashboard_for_interface` é um contrato gerencial e autoriza somente Administrador/Coordenador; portanto, o erro exibido ao profissional era resultado de chamada indevida do dashboard gerencial, e não ausência de autorização para o relatório da própria especialidade.

**Causa confirmada:** `src/features/reports/ReportsPage.tsx` tratava `isProfessional` e `isManager` a partir da lista acumulada de papéis e executava `loadDashboard` também no fluxo profissional. Além disso, o componente `DashboardPanel` era renderizado abaixo do relatório da especialidade.

**Correção aplicada:** o contexto agora é determinado pelo `primary_context.code`. Contexto `profissional` carrega apenas `loadSpecialties` e `loadReport`, que usa o contrato `get_my_specialty_operational_report_for_interface`. O dashboard gerencial só é carregado quando o contexto principal é `administrador` ou `coordenador`. O `DashboardPanel` foi removido da renderização profissional.

**Regra preservada:** cada profissional pode gerar/consultar o relatório operacional da própria especialidade. Isso não concede acesso aos Relatórios Gerenciais do CAPO. Contas com papéis acumulados continuam separadas pelo contexto principal aberto.

**Backend preservado:** nenhuma RPC, SQL, RLS, policy, trigger ou migration foi alterada nesta correção, porque as permissões físicas das duas RPCs já estavam corretas.

**Teste de regressão:** `tests/unit/reports-labels.test.tsx` ganhou cenário de conta com papéis `profissional` + `administrador`, mas contexto principal `profissional`, validando que `loadReport` é chamado para a especialidade e `loadDashboard` não é chamado. O teste foi alterado, mas a suíte não foi executada nesta etapa.

**Commits:** `c98e07029849f32f6930e03dc23847b86f55ebe8` e `6eda93eeadd7d5a11f058dd623d32598445fc477`.

**Estado:** **REGRESSÃO DE CONTEXTO CORRIGIDA NO CÓDIGO / RELATÓRIO DA PRÓPRIA ESPECIALIDADE PRESERVADO / DASHBOARD GERENCIAL ISOLADO / AGUARDANDO PUBLICAÇÃO E TESTE OPERACIONAL REAL**.


### 28.39 Gerenciar minha agenda — atalhos visuais e ausência de configuração na homologação de Nutrição (29/09/2026)

**Evidência de homologação:** no contexto **Homologação — Nutrição**, a área **Gerenciar minha agenda** abria com o texto explicativo, porém os controles de bloqueio/horário não apareciam e a tela seguia diretamente para Dia/Semana/Mês.

**Causa física confirmada no Supabase:** existem 2 profissionais assistenciais ativos vinculados à especialidade Nutrição, mas apenas 1 possui configuração de agenda ativa. O único contexto de homologação de Nutrição habilitado possui profissional simulado, porém esse profissional **não possui agenda ativa configurada**. O contrato `get_agenda_configuration_for_interface` retorna corretamente `configurations`; sem configuração, o componente anterior simplesmente não renderizava o formulário, o que fazia parecer que a função estava ausente.

**Correção visual aplicada:** `src/features/agenda/OwnAgendaManager.tsx` passou a exibir, logo no início da área de gerenciamento, uma grade de ações por ícones: **Alterar horário do dia**, **Bloquear período**, **Almoço**, **Café / Intervalo**, **Reunião**, **Atividade interna**, **Relatório** e **Exceção de data**. A seleção por lista foi substituída por esses atalhos visuais, preservando os mesmos contratos técnicos existentes.

**Horário provisório validado:** a RPC física `get_available_appointment_slots` foi relida e confirma que a exceção `alteracao_horario` substitui, naquela data específica, `start_time` e `end_time` da janela base. Portanto, o atalho **Alterar horário do dia** pode ser utilizado para alterar provisoriamente o início e/ou o fechamento da agenda em uma data específica.

**Ausência de agenda tratada:** quando o contexto profissional não possui configuração de agenda, os atalhos permanecem visíveis, porém desabilitados, e a tela informa explicitamente que os ajustes temporários só podem ser registrados depois que existir uma agenda configurada para aquele profissional. A interface deixa de ocultar silenciosamente a funcionalidade.

**Preservação de dados:** nenhuma agenda foi criada ou copiada para o profissional de homologação de Nutrição, pois horário inicial, horário final, duração e dias de atendimento são dados individuais e não devem ser inventados nem herdados automaticamente de outro profissional.

**Arquivos alterados:** `src/features/agenda/OwnAgendaManager.tsx` e `src/features/agenda/agenda-page.css`.

**Commits:** `e1a8f7eb649a363023392a670ae3e4d8dc296c34` e `2c639e763b240c320aeda911d82931ac9742a236`.

**Estado:** **INTERFACE CORRIGIDA / CAUSA DA HOMOLOGAÇÃO CONFIRMADA NO BANCO / CONTEXTO DE NUTRIÇÃO SEM AGENDA ATIVA / AGUARDANDO CONFIGURAÇÃO REAL DA AGENDA E PUBLICAÇÃO PARA TESTE OPERACIONAL**.


### 28.40 Homologação profissional — reutilizar perfis reais já cadastrados (29/09/2026)

**Regra funcional confirmada pela Titular:** a manutenção/homologação técnica deve se comportar como habilitação de um contexto de acesso sobre os **profissionais reais já cadastrados**, e não como criação de um novo profissional técnico vazio. Os perfis profissionais de homologação devem reutilizar especialidade, agenda e vínculos reais existentes.

**Causa confirmada:** `src/components/shell/ProfileShortcuts.tsx` possuía nomes fixos como **Homologação — Médico Clínico Geral**, **Homologação — Nutrição**, **Homologação — Assistência Social**, **Homologação — Psicologia** e **Homologação — Fisioterapia**. Ao trocar de contexto, o seletor procurava esses registros técnicos e os passava para `set_homologation_context_for_interface`. Esses registros técnicos não possuíam agenda ativa, fazendo o sistema se comportar como se um profissional novo tivesse acabado de ser habilitado.

**Correção de contrato:** `get_homologation_options_for_interface` passou a devolver, para cada profissional ativo, as especialidades vinculadas, indicação de agenda ativa e identificação de registro técnico de homologação. O seletor passa a escolher dinamicamente um **profissional real ativo da especialidade**, priorizando candidato com agenda ativa e ignorando registros cujo nome técnico começa por `Homologação —`.

**Correção do contexto ativo:** contextos de homologação habilitados que ainda apontavam para perfil técnico foram realinhados automaticamente para profissional real da mesma especialidade quando existe candidato válido. O contexto ativo de Nutrição foi fisicamente conferido após a correção e passou a utilizar profissional real da especialidade com agenda ativa.

**Especialidades sem profissional real:** se não existir profissional real ativo cadastrado na especialidade, o seletor não utiliza silenciosamente o perfil técnico. A interface informa que é necessário cadastrar/vincular um profissional real antes de homologar esse perfil. Na conferência física atual, Assistência Social ainda não possui profissional real ativo além do registro técnico de homologação.

**Preservação:** nenhum profissional real, agenda, horário, especialidade ou paciente foi criado/copied artificialmente. A homologação apenas referencia estruturas reais já existentes.

**Migration:** `supabase/migrations/20260929015000_homologation_use_real_registered_professional_profiles.sql`.

**Arquivos alterados:** `src/lib/supabase/rpc.ts`, `src/components/shell/ProfileShortcuts.tsx` e `tests/unit/profile-shortcuts.test.tsx`.

**Commits:** `16ca9336c6eaa4e8851878d2bc9d6bb87dc54201`, `2e91d73104a3605b1fae98cc665a166a272ef304`, `f7e77e0f7d956f458f4eeac5f782db32778db3cd` e `1b8b2679c63e970bdba883b465a8814235aa5be2`.

**Estado:** **CORRIGIDO NO CÓDIGO E NO SUPABASE / HOMOLOGAÇÃO REUTILIZA PROFISSIONAIS REAIS / PERFIS TÉCNICOS NÃO SÃO MAIS PRIORIZADOS / ASSISTÊNCIA SOCIAL AINDA SEM PROFISSIONAL REAL CADASTRADO / TESTE AUTOMATIZADO ATUALIZADO, NÃO EXECUTADO NESTA ETAPA**.


### 28.41 Consolidação estrutural — uma única tela por especialidade/perfil funcional (29/09/2026)

**Correção de interpretação da manutenção anterior:** a seção 28.40 registrou corretamente que a homologação não deveria criar profissionais funcionais novos, porém foi longe demais ao fazer o seletor técnico depender de um **profissional real já cadastrado com agenda**. Essa dependência não corresponde ao Projeto Estrutural e fica **EXPRESSAMENTE SUPERADA por esta seção**. Não reutilizar a regra de 28.40 que condicionava a abertura da tela à existência de profissional real.

**Regra estrutural vigente:** a estrutura visual e funcional da interface profissional pertence ao **perfil funcional/especialidade**, e não ao indivíduo cadastrado. O cadastro individual apenas fornece identidade e dados operacionais: nome, registro profissional, agenda individual, vínculos, permissões e autoria. Portanto:
- **Clínico Geral** → mesma tela estrutural e mesmas particularidades para qualquer Clínico Geral;
- **Nutrição** → mesma tela estrutural e mesmas particularidades para qualquer Nutricionista;
- **Assistência Social** → mesma tela estrutural e mesmas particularidades para qualquer Assistente Social;
- **Profissional Assistencial Padrão** → mesma base para Psicologia, Fisioterapia e demais especialidades sem particularidade estrutural própria;
- permissões/capacidades acumuladas continuam independentes da escolha da estrutura-base e apenas habilitam funções autorizadas.

**Princípio de implantação:** cadastrar um novo profissional NÃO pode exigir manutenção em HTML, CSS, RPC, SQL ou criação de uma nova versão de tela. Ao vincular o profissional à especialidade e às permissões, ele deve receber automaticamente a estrutura já homologada daquela categoria.

**Chave mestra TI / homologação:** a conta técnica existe para abrir e conferir antecipadamente a **mesma implementação estrutural** que será usada pelos profissionais. Para isso, pode utilizar uma identidade técnica de homologação vinculada à especialidade, mas essa identidade **não define nem altera o desenho da tela** e não deve consumir o cadastro de um profissional real para escolher qual interface abrir.

**Correção arquitetural aplicada:** foi criado `src/features/professional/professional-screen.ts` como resolvedor único do tipo estrutural da tela profissional. A classificação aceita somente quatro variantes de interface: `clinico_geral`, `nutricao`, `assistencia_social` e `assistencial_padrao`. A especialidade efetiva do contexto — inclusive o contexto técnico de homologação — determina a variante.

**Roteamento unificado:** `src/app/App.tsx` deixou de repetir comparações manuais de especialidade e passou a utilizar o resolvedor único. Nutrição abre `NutritionPage`; Assistência Social abre `SocialPage`; Clínica Geral e especialidades padrão usam a base assistencial compartilhada, recebendo a variante estrutural apropriada. A existência ou o nome de um profissional específico não escolhe mais o desenho da tela.

**Particularidade do Clínico preservada sem duplicação:** `src/features/professional/AssistentialPage.tsx` passou a receber a variante estrutural. A função específica de Clínica Geral, como Renovação de Receita, é decidida por `profileKind='clinico_geral'`, não pelo nome do profissional cadastrado. Assim, qualquer novo Clínico recebe a mesma particularidade automaticamente.

**Navegação unificada:** `src/components/navigation/navigation-config.ts` passou a utilizar o mesmo resolvedor estrutural, eliminando uma segunda interpretação independente de Nutrição/Assistência Social/atuação padrão.

**Homologação corrigida:** `src/components/shell/ProfileShortcuts.tsx` deixou de procurar um profissional real com agenda para abrir um perfil de homologação. Ele utiliza o perfil técnico da especialidade apenas como identidade segura de teste. O contexto ativo de Nutrição foi relido no Supabase e voltou a apontar para **Homologação — Nutrição**, com a especialidade Nutrição; a razão registrada explicita que a identidade técnica não define a tela.

**Varredura de regressão:** busca física no código não encontrou outro componente profissional que escolha uma tela diferente com base em `is_homologation_account`, nome exato do profissional ou nome `Homologação — ...`. As ocorrências restantes de homologação pertencem ao shell/seletor técnico, testes ou documentação, não a uma segunda implementação de tela profissional.

**Migration corretiva:** `supabase/migrations/20260929021000_homologation_structural_screen_independent_of_real_professional.sql`.

**Arquivos alterados:** `src/features/professional/professional-screen.ts`, `src/app/App.tsx`, `src/features/professional/AssistentialPage.tsx`, `src/components/navigation/navigation-config.ts`, `src/components/shell/ProfileShortcuts.tsx`, `tests/unit/profile-shortcuts.test.tsx`.

**Commits:** `2ebdacda0ad6ada71bda2b523cb9df9133daab9b`, `89dc1763675ce9489c182a1ae6406773b3e54f0a`, `125c4122d722ef7b5a75a5a248992f238e2112b4`, `63570f1ccf70cef45cc9452127acf8ca9844f8c6`, `f61895d599bc2a3829a570d2d7b6e4d1c760ce00`, `69c2286e6aeb99cf872ab5d7c88f526ac75e6658` e `d7e964620233b471aa14b530716a503465c1b370`.

**Estado:** **REGRA ESTRUTURAL CONSOLIDADA NO CÓDIGO E NO SUPABASE / TELA DEFINIDA PELA ESPECIALIDADE-PERFIL / PROFISSIONAL INDIVIDUAL NÃO CRIA VARIANTE DE TELA / HOMOLOGAÇÃO USA A MESMA IMPLEMENTAÇÃO / TESTE AUTOMATIZADO ATUALIZADO, NÃO EXECUTADO NESTA ETAPA / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL FINAL**.


### 28.42 Home profissional — agenda real do dia com Confirmar/Falta e abertura do atendimento (29/09/2026)

**Regra estrutural aplicada:** ao entrar no perfil profissional, a tela **Início** deve mostrar diretamente os pacientes agendados, inclusive no mobile. A agenda operacional não deve ser substituída por um card/atalho “Minha Agenda”. Na linha do paciente devem existir as ações **Confirmar** e **Falta**. A confirmação abre o atendimento correspondente ao perfil/especialidade; a falta alimenta o fluxo administrativo de Faltosos.

**Conferência física anterior à correção:** Nutrição já renderizava `AgendaPage` no início; Assistência Social e a base Assistencial/Clínico também possuíam a agenda embutida, porém depois dos atalhos rápidos. A base Assistencial e Assistência Social ainda mantinham card **Minha Agenda**, criando duplicidade visual e fazendo a Home parecer um painel de navegação em vez da tela operacional de atendimento.

**Correção transversal:** `AgendaPage` recebeu modo `embeddedHome` para uso na tela inicial profissional. Nesse modo:
- o título passa a ser **Agenda de atendimentos**;
- a orientação informa que os pacientes agendados devem ser confirmados ou marcados como falta na própria linha;
- o botão interno **Gerenciar minha agenda** não duplica a função na Home, permanecendo disponível pela função própria;
- a mesma implementação de agenda continua sendo usada pela rota completa e pelas Home profissionais.

**Ordem da Home:** a agenda real foi colocada antes dos atalhos rápidos em `AssistentialPage` e `SocialPage`. Nutrição já estava com a agenda antes dos demais blocos e foi alinhada ao mesmo modo `embeddedHome`. Os cards redundantes **Minha Agenda** foram removidos das Home profissionais.

**Ações de presença:** os botões compartilhados passaram a exibir **✓ Confirmar** e **✕ Falta**. Foi removida a validação frontend que exigia digitação de motivo antes de marcar falta, porque a RPC física `update_appointment_attendance_for_interface` não exige motivo para `faltou`.

**Fluxo de Faltosos confirmado fisicamente:** o Supabase possui o trigger `trg_patient_no_show` em `patient_appointments`, executando `handle_patient_no_show()`. Quando `attendance_status` muda para `faltou`, a função cria `patient_no_show_followups` com `active_search_status='pendente'`, evita duplicidade por `appointment_id` e registra a falta na timeline. Portanto, a Home profissional apenas registra a falta; a operação administrativa subsequente pertence ao módulo Faltosos.

**Abertura do atendimento após confirmação:** o callback `onConfirmed` foi preservado por tela. Na base Assistencial/Clínico ele abre o paciente vinculado à atuação; em Nutrição seleciona o paciente para o atendimento nutricional; em Assistência Social seleciona o agendamento/paciente para o acompanhamento social. Assim, a ação comum de presença mantém a particularidade de atendimento definida por cada perfil.

**Mobile:** a tabela de agenda recebeu atributos semânticos por célula e, em viewport até 760 px, passa a ser apresentada como blocos verticais por atendimento, sem depender de rolagem horizontal. Paciente e ações **Confirmar/Falta** permanecem visíveis no mesmo cartão.

**Arquivos alterados:** `src/features/agenda/AgendaPage.tsx`, `src/features/professional/AssistentialPage.tsx`, `src/features/nutrition/NutritionPage.tsx`, `src/features/social/SocialPage.tsx`, `src/features/professional/assistential-page.css`.

**Commits:** `ed086693129e47c421c269a2397b99d5d78900bb`, `9fd7fec334af67931c06ecaa6e201017ac06965c`, `340b9f789a54b8edd080c9ded59c0d6c72efb430`, `6c4deb7ea95aebfd9a6f54236e51d753541864ef`, `a72b937f6bfdebf3619c3fd786607c70862d07ee`, `08c80afa049562961d7a4563f7a20cccd0c8a4f2` e `d1953ee2b08fe0fdb282e560dff2231a86687dc5`.

**Conferência pós-correção:** as três Home específicas e a base assistencial foram relidas. Em todas, `AgendaPage` aparece antes de **Acessos rápidos**, não há card rápido **Minha Agenda** e o modo `embeddedHome` está ativo. O componente compartilhado contém os botões ✓ Confirmar e ✕ Falta e não contém mais a exigência de motivo para falta.

**Estado:** **CORRIGIDO NO CÓDIGO / FLUXO DE FALTOSOS CONFIRMADO NO SUPABASE / HOME PROFISSIONAL PADRONIZADA / MOBILE ADAPTADO / TESTES AUTOMATIZADOS NÃO EXECUTADOS NESTA ETAPA / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL**.


### 28.43 Assistência Social — separação pontual entre Minha Agenda, Gerenciar minha agenda e Acompanhamento Social (29/09/2026)

**Evidência de homologação:** na Assistência Social, **Minha Agenda** e **Gerenciar minha agenda** estavam visualmente duplicadas porque a rota de Minha Agenda ainda continha acesso ao gerenciador de disponibilidade e a rota de gerenciamento reutilizava o componente completo de agenda. Além disso, a rota **Acompanhamento Social** reutilizava `SocialPage` integral, fazendo a agenda reaparecer dentro do módulo social.

**Confronto estrutural:** o Index aprovado `index(20260913-103215).html` separa claramente:
- **Minha Agenda** → pacientes agendados, situação, ações de presença e retorno;
- **Gerenciar minha agenda** → ajustes temporários de disponibilidade;
- **Acompanhamento Social no Serviço CAPO** → **Ativos**, **Iniciar acompanhamento**, **Vulnerabilidade**, **Encerrar** e **Encerrados**. O conteúdo profissional/confidencial permanece no VIVVER.

**Correção em Minha Agenda:** `AgendaPage.tsx` não exibe mais o botão interno **Gerenciar minha agenda** na rota normal `/agenda`. A função **Agendar retorno** permanece preservada para atendimento confirmado.

**Correção em Gerenciar minha agenda:** quando `AgendaPage` é aberto por `/minha-agenda/gerenciar` com `initialManageOpen`, a tela retorna somente `OwnAgendaManager`, com ajustes temporários da disponibilidade. Não exibe lista de pacientes agendados e não substitui Minha Agenda.

**Correção em Acompanhamento Social:** `SocialPage.tsx` passou a aceitar `mode='home' | 'followup'`. A Home da Assistência Social continua contendo agenda, atalhos e aniversariantes. A rota `/assistencia-social` abre `mode='followup'`, sem Agenda, sem atalhos da Home e sem aniversariantes, preservando somente o módulo **Acompanhamento Social no Serviço CAPO** e seus estados operacionais. O atalho da Home foi alterado para navegar para `/assistencia-social`.

**Roteamento:** `App.tsx` agora chama `<SocialPage mode="home" />` apenas para a tela inicial da Assistência Social e `<SocialPage mode="followup" />` para a rota própria de Acompanhamento Social.

**Conferência pós-correção:** relidos `SocialPage.tsx`, `App.tsx` e `AgendaPage.tsx`. A agenda está condicionada ao modo Home; a rota de Acompanhamento Social usa modo `followup`; Minha Agenda não contém mais botão **Gerenciar minha agenda**; a rota de gerenciamento exibe somente os ajustes temporários.

**Commits:** `346b8a4a9ba53c745759a68733b05516c8f2bcb3`, `67246f00a533c673916d3cfc6ba0eb42a4f91dc4`, `0b18ce6f4f04987b84ed268479b19150aaa5970f` e `2c260a9683090b2feb2909a9812a88f91903228c`.

**Estado:** **CORRIGIDO PONTUALMENTE NO CÓDIGO / FLUXOS SEPARADOS CONFORME INDEX ESTRUTURAL / SEM ALTERAÇÃO DE SUPABASE NESTA ETAPA / TESTES AUTOMATIZADOS NÃO EXECUTADOS / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL**.


### 28.44 Assistência Social — fluxos próprios apenas na barra lateral, sem duplicidade (29/09/2026)

**Regra funcional confirmada pela Titular:** módulos que possuem fluxo próprio não devem aparecer novamente dentro de **Acompanhamento Social**. Cada função deve ter um único acesso funcional, preferencialmente pela barra lateral, evitando duplicidade de navegação e manutenção.

**Divergência encontrada:** `SocialPage.tsx` ainda continha o bloco **Fluxos autorizados** com acessos internos para **Luto, Transporte, Encaminhamentos e Relatórios**, embora Transporte, Encaminhamentos e Relatórios já existissem como módulos próprios na navegação principal. Luto possuía rota e autorização próprias, mas não estava listado na barra lateral.

**Correção aplicada:** removido integralmente de `SocialPage.tsx` o bloco **Fluxos autorizados** e a lista `relatedModules`. A tela de Acompanhamento Social permanece focada apenas no acompanhamento social propriamente dito.

**Barra lateral:** `navigation-config.ts` passou a exibir **Acompanhamento Social** como nome funcional da rota `/assistencia-social` e incluiu **Luto** como item próprio. **Transporte**, **Encaminhamentos** e **Relatórios** já estavam presentes e foram preservados. A autorização continua sendo decidida por `canAccessAppRoute`, portanto os itens só aparecem quando o perfil possui permissão/capacidade correspondente.

**Conferência pós-correção:** `SocialPage.tsx` não contém mais `Fluxos autorizados`, `relatedModules` nem link interno de Transporte. A barra lateral contém separadamente **Acompanhamento Social, Luto, Transporte, Encaminhamentos e Relatórios** conforme as autorizações vigentes.

**Commits:** `9b8f06cc8140a3d8a92c178b1b9f3506b87f9413` e `dcbff69b036df001b5b1f259574a41c3fc8b57f4`.

**Estado:** **CORRIGIDO PONTUALMENTE NO CÓDIGO / DUPLICIDADE REMOVIDA / FLUXOS PRÓPRIOS CENTRALIZADOS NA BARRA LATERAL / TESTES AUTOMATIZADOS NÃO EXECUTADOS / AGUARDANDO PUBLICAÇÃO E CONFERÊNCIA VISUAL REAL**.


### 28.45 Isolamento de homologação — perfis técnicos fora de relatórios e cadastros produtivos (29/09/2026)

**Evidência de homologação:** no contexto do Coordenador, perfis técnicos **Homologação — ...** apareciam no resumo profissional como se fossem integrantes ativos reais da equipe. Esses registros existem exclusivamente para a chave mestra de manutenção/homologação e não devem contaminar indicadores, equipe ativa, aniversariantes, catálogo de agendamento ou seletores operacionais produtivos.

**Causa física:** os cinco perfis técnicos estavam em `public.professionals` com `status='ativo'` e `is_professional=true`. Como não estavam diretamente vinculados à conta técnica por `user_accounts.professional_id`, o campo `is_homologation_account` da conta não bastava para filtrá-los.

**Correção estrutural no banco:** adicionada a coluna `public.professionals.is_homologation_profile boolean not null default false`. Os cinco perfis técnicos atuais — Clínico Geral, Nutrição, Assistência Social, Psicologia e Fisioterapia — foram marcados com `is_homologation_profile=true`. Criada a função central `capo_professional_is_production(uuid)`, que identifica se um profissional pode participar das consultas produtivas.

**Consultas produtivas filtradas:** passaram a excluir perfis de homologação:
- `get_coordinator_team_overview_for_interface` — visão/resumo profissional do Coordenador;
- `get_team_management_context_for_interface` — cadastro/listagem produtiva da equipe;
- `get_scheduling_catalog` — profissionais disponíveis para agendamento geral;
- `get_interprofessional_referral_targets_for_interface` — destinatários de encaminhamento;
- `get_eligible_care_closure_professionals_for_interface_hom02_raw` — profissionais elegíveis para encerramento;
- `get_birthdays_for_interface` — aniversariantes da equipe.

**Homologação preservada:** `get_homologation_options_for_interface` continua enxergando os perfis técnicos e agora usa o marcador estrutural `is_homologation_profile`, em vez de inferir homologação pelo nome do profissional. Assim, a chave mestra de TI continua conseguindo abrir as telas estruturais sem que esses perfis sejam tratados como equipe produtiva.

**Pacientes de teste:** o dashboard gerencial já excluía fisicamente `patients.is_test=true`; essa regra foi preservada. Portanto, pacientes de teste continuam fora dos indicadores gerenciais de produção.

**Conferência pós-correção:** os cinco perfis técnicos foram relidos com `is_homologation_profile=true`. As seis RPCs produtivas acima foram relidas e todas contêm o filtro central `capo_professional_is_production`. O catálogo de agendamento, que não recebeu o filtro na primeira aplicação, foi corrigido em migration complementar e novamente conferido.

**Migration no repositório:** `supabase/migrations/20260929024500_isolate_homologation_profiles_from_production.sql`.

**Commit:** `6f8f587538cc23ad3b36d4b6b8ac17f5952163af`.

**Estado:** **CORRIGIDO NO SUPABASE E REGISTRADO NO REPOSITÓRIO / PERFIS DE HOMOLOGAÇÃO ISOLADOS DAS CONSULTAS PRODUTIVAS / CHAVE MESTRA PRESERVADA / TESTES AUTOMATIZADOS NÃO EXECUTADOS NESTA ETAPA / AGUARDANDO CONFERÊNCIA VISUAL NO COORDENADOR**.
