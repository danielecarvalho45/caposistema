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

# 9. METODOLOGIA DA AUDITORIA FINAL

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

# 10. REGISTRO DE CORREÇÕES

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

# 11. PENDÊNCIAS DE DECISÃO

Nenhuma registrada até o momento.

---

# 12. REGRA DE CONTINUIDADE

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
