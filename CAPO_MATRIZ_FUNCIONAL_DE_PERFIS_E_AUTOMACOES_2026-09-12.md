# CAPO — MATRIZ FUNCIONAL DE PERFIS, TELAS E AUTOMAÇÕES

**Data de consolidação:** 12/09/2026  
**Status:** REFERÊNCIA FUNCIONAL OBRIGATÓRIA PARA AUDITORIAS E COMANDOS FUTUROS  
**Projeto:** CAPO — Centro de Apoio ao Paciente Oncológico  

---

## 1. FINALIDADE DESTE DOCUMENTO

Este documento consolida a estrutura funcional aprovada das telas por perfil, o comportamento transversal das agendas, as automações esperadas entre os setores e a regra de relatórios do CAPO.

Ele deve ser utilizado como **matriz funcional de comparação** antes de qualquer novo comando técnico dirigido à manutenção ou ao Supabase.

### Documentos de consulta obrigatória antes de novos comandos técnicos

1. **CAPO_MATRIZ_FUNCIONAL_DE_PERFIS_E_AUTOMACOES_2026-09-12.md** — este documento.
2. **CAPO_ESPECIFICACAO_FUNCIONAL_ESTRUTURAL_DA_INTERFACE_2026-09-12.md** — documento estrutural/funcional de origem.

Como referência estrutural complementar de nomenclatura e arquitetura da interface, permanece válido:

- **CAPO_ESPECIFICACAO_ESTRUTURAL_DA_INTERFACE_2026-09-12.md**.

### Regra de uso

Antes de formular qualquer comando de diagnóstico, integração, correção ou implementação no Supabase/interface, deve-se:

- consultar os documentos obrigatórios acima;
- confrontar a decisão funcional aprovada com o estado físico atual do Supabase e da interface;
- classificar cada item como: **já existe / existe parcialmente / precisa integrar / precisa corrigir / precisa criar**;
- evitar novas migrations quando o comportamento puder ser obtido por integração ou reaproveitamento da estrutura já existente;
- não utilizar conversas ou relatórios anteriores como prova de funcionamento físico atual.

---

# 2. MODELO GERAL DA INTERFACE

O CAPO possui uma única interface. Uma conta pode acumular funções e permissões, sem múltiplos logins e sem troca manual de perfil.

```text
PESSOA
  ↓
CONTA ÚNICA
  ↓
FUNÇÃO(ÕES) / ESPECIALIDADE(S)
  +
PERMISSÕES ACUMULADAS
  +
CONTEXTO PRINCIPAL
  ↓
AMBIENTE DE TRABALHO CORRESPONDENTE
```

O contexto principal define apenas o ambiente inicial mais adequado à rotina predominante. As demais funções acumuladas permanecem acessíveis conforme as permissões da conta.

A interface deve ser dinâmica: concessão ou retirada de uma permissão deve fazer aparecer ou desaparecer o bloco funcional correspondente, sem exigir reconstrução do HTML por perfil.

---

# 3. PADRÃO TRANSVERSAL DAS AGENDAS PROFISSIONAIS

O início operacional do atendimento é igual para **todas as agendas assistenciais**, incluindo Assistência Social, Nutrição, Clínico Geral, Psicologia, Fisioterapia e futuras especialidades.

## 3.1 Linha da agenda

Cada paciente agendado deve apresentar, ligado ao nome:

```text
Horário   Paciente          Especialidades       Ação
08:00     Paciente A        [2 especialidades]   [✓ Confirmado] [✕ Falta]
```

### Indicador de especialidades

O indicador junto ao nome mostra em quais especialidades o paciente está atualmente em acompanhamento.

Exemplo:

```text
Paciente A
[2 especialidades]
       ↓
Clínico Geral
Nutrição
```

Esse indicador informa o vínculo assistencial do paciente, sem expor automaticamente conteúdos confidenciais de outras áreas.

## 3.2 Botão Confirmado

```text
[✓ CONFIRMADO]
       ↓
registra presença
       ↓
abre imediatamente o paciente
       ↓
inicia o fluxo operacional de atendimento
       ↓
apresenta as ações permitidas
à função/especialidade daquele profissional
```

Não deve existir etapa intermediária obrigatória para procurar novamente o paciente.

## 3.3 Botão Falta

```text
[✕ FALTA]
       ↓
registra ausência
       ↓
FALTOSOS
       ↓
Auxiliar Administrativo
```

**Falta não alimenta Busca Ativa.**

Busca Ativa é fluxo distinto e permanece separado.

---

# 4. MODELO GERAL DOS PROFISSIONAIS ASSISTENCIAIS

Todos os profissionais assistenciais cadastrados recebem uma estrutura-base comum. A especialidade determina as funções próprias e as permissões adicionais determinam capacidades extras.

```text
PROFISSIONAL CADASTRADO
│
├── Início
├── Minha Agenda
├── Buscar Paciente
├── Funções próprias da especialidade
├── Solicitações
├── Encaminhamentos [somente se tiver permissão]
├── Relatórios da própria especialidade
└── Sair
```

## 4.1 Fluxo do atendimento

```text
MINHA AGENDA
     ↓
paciente agendado
     ↓
[✓ Confirmado]
     ↓
PACIENTE
     ↓
ações próprias da especialidade
     ↓
providências / solicitações / encaminhamento, se permitido
     ↓
retorno, se necessário
     ↓
finalizar atendimento
```

## 4.2 Buscar Paciente

Além da Agenda, o profissional pode localizar um paciente quando existir necessidade legítima dentro de sua função e de suas permissões.

```text
BUSCAR PACIENTE
      ↓
localizar
      ↓
1 clique
      ↓
contexto permitido do paciente
```

## 4.3 Encaminhamento interprofissional

Encaminhamento não é capacidade automática de nenhuma profissão.

```text
PROFISSÃO ≠ PERMISSÃO PARA ENCAMINHAR
```

O botão só aparece quando a conta possuir a capacidade formalmente atribuída.

```text
permissão adicionada → botão aparece
permissão removida   → botão desaparece
```

Não deve ser codificado por nome de profissão.

---

# 5. RELATÓRIOS — REGRA TRANSVERSAL

## 5.1 Profissionais assistenciais

Todos os profissionais possuem **relatórios de produção da própria especialidade**, limitados ao que o próprio CAPO registra e consegue calcular de forma confiável.

```text
PROFISSIONAL
    ↓
RELATÓRIOS DA PRÓPRIA ESPECIALIDADE
    ↓
produção obtida dos dados
que o CAPO efetivamente registra
```

Não se deve inventar indicador sem fonte real no sistema.

## 5.2 Coordenador e Administrador Geral

Coordenador e Administrador Geral podem extrair relatórios de tudo que o CAPO efetivamente puder oferecer:

- visão geral;
- por especialidade;
- por profissional, quando pertinente;
- por período;
- por produção;
- por fluxos, agendas, faltas e outros recortes sustentados pelos dados existentes.

---

# 6. ADMINISTRADOR DO SISTEMA / TITULAR

## 6.1 Tela inicial

```text
INÍCIO
│
├── Acessos rápidos
│   ├── Pacientes
│   ├── Agenda
│   ├── Faltosos
│   ├── Solicitações
│   ├── Transporte
│   ├── Familiares
│   ├── Encerramentos
│   └── Relatórios
│
├── Agenda do dia — todos os profissionais
├── Aniversariantes — pacientes / equipe
├── Atividades recentes
├── Cadastro de Profissional
├── Indicadores
└── Status do Sistema
```

## 6.2 Atendimento e Acompanhamento

```text
PACIENTES
├── Cadastrar
└── Consultar

AGENDA GERAL
├── Agendar
└── Consultar

SOLICITAÇÕES
├── Recebidas
├── Aceitas
└── Encerradas

FLUXOS E ACOMPANHAMENTOS
├── Acompanhamento Social
├── Luto
├── Familiar / Cuidador
├── Nutrição
├── Encaminhamentos
│   ├── Recebidos
│   └── Enviados
├── Transporte
└── Odontologia

FALTOSOS
├── Acompanhar faltas
├── Contatos
└── Remanejamento / Remarcação

BUSCA ATIVA
└── fluxo próprio

ENCERRAMENTOS
└── Encerramentos por especialidade
```

Não existe menu de “Encerramentos administrativos”, “Situação de óbito” dentro de Encerramentos, nem “Pedido de reabertura”.

## 6.3 Administração do Sistema

```text
USUÁRIOS E CONTAS
├── Cadastrar Profissional
└── Permissões
```

Papéis/capacidades técnicas podem existir no backend, mas não precisam necessariamente virar menus genéricos separados para o usuário.

## 6.4 Relatórios

Administrador Geral possui acesso aos relatórios gerais e por especialidade de tudo que o sistema puder produzir de forma real.

## 6.5 Automações principais

```text
novo profissional
      ↓
cadastro
      ↓
função / especialidade
      ↓
permissões
      ↓
agenda / ambiente correspondente
```

Mudança de permissão deve reorganizar a interface automaticamente.

---

# 7. COORDENADOR

## 7.1 Tela principal

```text
PAINEL DA COORDENAÇÃO
│
├── Equipe e Profissionais
├── Agendas da Equipe
├── Pacientes em Acompanhamento
├── Filas / Pendências / Fluxos
├── Faltosos
├── Busca Ativa
├── Solicitações
├── Gestão de Agenda
├── Relatórios e Indicadores
├── Linha do Tempo Operacional
├── Auditoria Operacional
├── Contingência Operacional
└── Suporte
```

## 7.2 Equipe, disponibilidade e Agenda

```text
COORDENAÇÃO
    ↓
Equipe / profissionais
    ↓
disponibilidade / afastamentos / férias / cobertura
    ↓
Agendas da equipe
    ↓
Administrativo operacionaliza
    ↓
agendamentos / remarcações
```

O Coordenador não recebe automaticamente funções clínicas. Se também for profissional assistencial, o ambiente profissional aparece por causa dessa função acumulada.

## 7.3 Relatórios

Coordenador possui visão geral e por especialidade, dentro de tudo que o CAPO puder produzir a partir dos dados reais registrados.

---

# 8. AUXILIAR ADMINISTRATIVO

O Auxiliar Administrativo é o principal executor dos fluxos administrativos diários.

## 8.1 Estrutura

```text
INÍCIO
├── pendências do dia
├── movimentações de agenda
├── solicitações recebidas
├── faltosos
└── avisos

PACIENTES
├── cadastrar
└── consultar

AGENDA GERAL
├── agendar
├── remarcar
├── consultar
└── operacionalizar retornos

SOLICITAÇÕES
├── recebidas
├── aceitas
└── encerradas

FALTOSOS
├── pacientes faltosos
├── contatos
├── motivo
├── remanejamento
└── remarcação

BUSCA ATIVA
└── fluxo próprio

TRANSPORTE
FAMILIAR / CUIDADOR
ENCAMINHAMENTOS
ODONTOLOGIA
RENOVAÇÃO DE RECEITA
ENCERRAMENTOS — acompanhamento operacional
```

## 8.2 Automação de Faltosos

```text
PROFISSIONAL
    ↓
[Falta]
    ↓
FALTOSOS
    ↓
AUXILIAR ADMINISTRATIVO
    ↓
contato / motivo / providência
    ↓
remanejamento / remarcação
```

## 8.3 Automação de Solicitações

```text
PROFISSIONAL
    ↓
cria solicitação
    ↓
ADMINISTRATIVO recebe
    ↓
ACEITAR
    ↓
profissional recebe aviso automático
    ↓
resolver
    ↓
CONCLUIR
    ↓
profissional recebe novo aviso automático
```

---

# 9. ASSISTÊNCIA SOCIAL

A Assistência Social segue o mesmo padrão transversal de Agenda e início de atendimento.

## 9.1 Estrutura

```text
INÍCIO
MINHA AGENDA
BUSCAR PACIENTE
ACOMPANHAMENTO SOCIAL
FAMILIAR / CUIDADOR
LUTO — quando pertinente
SOLICITAÇÕES
ENCAMINHAMENTOS — somente se tiver permissão
RELATÓRIOS DA ASSISTÊNCIA SOCIAL
SAIR
```

## 9.2 Atendimento

```text
AGENDA
  ↓
[✓ Confirmado]
  ↓
PACIENTE
  ↓
ações próprias da Assistência Social
  ↓
acompanhamento social
  ↓
familiar/cuidador, quando pertinente
  ↓
luto, quando pertinente
  ↓
sinalizações / providências
  ↓
solicitação administrativa, se necessária
  ↓
retorno
  ↓
finalizar atendimento
```

Se clicar em Falta:

```text
[✕ Falta] → FALTOSOS → Administrativo
```

---

# 10. NUTRIÇÃO

## 10.1 Estrutura

```text
INÍCIO
MINHA AGENDA
BUSCAR PACIENTE
PLANEJAMENTO ALIMENTAR
SOLICITAÇÕES
ENCAMINHAMENTOS — somente se tiver permissão
RELATÓRIOS DA NUTRIÇÃO
SAIR
```

## 10.2 Fluxo de atendimento

```text
AGENDA
  ↓
paciente marcado
  ↓
┌────────────────────┬────────────────────┐
│                    │                    │
[✓ Confirmado]     [✕ Falta]
│                    │
↓                    ↓
registra presença   FALTOSOS
│                    ↓
↓                Administrativo
PACIENTE
│
├── dados necessários
├── especialidades em acompanhamento
├── sinalização de vulnerabilidade, se houver
│
├── [PLANEJAMENTO ALIMENTAR]
│        ↓
│     abrir planejamento
│        ↓
│     preencher / atualizar
│        ↓
│     gerar PDF
│        ↓
│     retornar ao paciente
│
├── encaminhamento, somente se autorizado
├── agendar retorno
└── finalizar atendimento
```

A vulnerabilidade é informação do contexto do paciente. Não significa automaticamente encaminhamento para Nutrição.

O Planejamento Alimentar deve abrir diretamente no contexto do paciente e gerar o PDF previsto no fluxo da Nutrição.

---

# 11. CLÍNICO GERAL

## 11.1 Estrutura

```text
INÍCIO
MINHA AGENDA
BUSCAR PACIENTE
RENOVAÇÃO DE RECEITA
SOLICITAÇÕES
ENCAMINHAMENTOS — somente se tiver permissão
RELATÓRIOS DO CLÍNICO GERAL
SAIR
```

## 11.2 Atendimento comum

```text
AGENDA
  ↓
[✓ Confirmado]
  ↓
PACIENTE
  ↓
ações operacionais permitidas
  ↓
retorno
  ↓
encerramento da própria especialidade, quando pertinente
```

Falta segue para Faltosos do Administrativo.

## 11.3 Renovação de Receita

Somente o Administrativo inicia o pedido de Renovação de Receita para o Clínico Geral.

```text
PACIENTE / DEMANDA
      ↓
ADMINISTRATIVO
      ↓
RENOVAÇÃO DE RECEITA
      ↓
CLÍNICO GERAL
      ↓
┌──────────────────────┬────────────────────────┐
│                      │                        │
RENOVAR RECEITA       NECESSITA CONSULTA
│                      │
↓                      ↓
realiza no sistema     solicita agendamento /
oficial / VIVVER       remarcação
│                      │
↓                      ↓
registra conclusão     ADMINISTRATIVO
operacional no CAPO    ↓
│                    agenda consulta
↓                      ↓
ADMINISTRATIVO        MINHA AGENDA
↓
contata paciente
```

O CAPO não armazena o conteúdo da receita clínica.

---

# 12. PSICOLOGIA, FISIOTERAPIA E FUTURAS ESPECIALIDADES

Não deve existir uma arquitetura separada criada manualmente para cada nova especialidade.

Cada nova especialidade utiliza o modelo profissional padrão:

```text
INÍCIO
MINHA AGENDA
├── indicador de especialidades do paciente
├── [✓ Confirmado]
└── [✕ Falta]

BUSCAR PACIENTE
FUNÇÕES PRÓPRIAS DA ESPECIALIDADE
SOLICITAÇÕES
ENCAMINHAMENTOS — somente se tiver permissão
RELATÓRIOS DA PRÓPRIA ESPECIALIDADE
SAIR
```

## Cadastro dinâmico

```text
CADASTRO DA ESPECIALIDADE / PROFISSIONAL
        ↓
define função / especialidade
        ↓
define capacidades / permissões
        ↓
vincula profissional
        ↓
vincula agenda
        ↓
CAPO apresenta automaticamente
o ambiente correspondente
```

Nova profissão/especialidade não deve exigir alteração manual de HTML ou migration apenas para existir na interface.

---

# 13. TI / MANUTENÇÃO

TI é função técnica adicional e não concede automaticamente funções administrativas, gerenciais ou assistenciais.

```text
TI / MANUTENÇÃO
│
├── Painel Técnico
├── Chamados de Suporte Recebidos
├── Estado do Sistema
├── Conectividade e Integrações
├── Logs Técnicos Autorizados
├── Manutenção e Correções
├── Documentação Técnica
├── Ferramentas / Atalhos
└── IA de Desenvolvimento do CAPO
```

---

# 14. AUTOMAÇÕES TRANSVERSAIS QUE O SUPABASE DEVE SUSTENTAR

## 14.1 Cadastro de profissional

```text
PROFISSIONAL CADASTRADO
      ↓
especialidade / função / permissões
      ↓
interface correspondente aparece
```

## 14.2 Paciente agendado

```text
PACIENTE AGENDADO
      ↓
aparece na Agenda correta do profissional
```

## 14.3 Comparecimento

```text
[CONFIRMADO]
      ↓
registra presença
      ↓
abre imediatamente o paciente
      ↓
inicia atendimento da especialidade
```

## 14.4 Falta

```text
[FALTA]
      ↓
registra ausência
      ↓
FALTOSOS
      ↓
Administrativo
```

## 14.5 Paciente em múltiplas especialidades

```text
PACIENTE
      ↓
indicador junto ao nome
      ↓
lista especialidades atualmente vinculadas
```

## 14.6 Solicitações

```text
PROFISSIONAL cria solicitação
      ↓
Administrativo recebe
      ↓
Administrativo aceita
      ↓
profissional recebe aviso automático
      ↓
Administrativo conclui
      ↓
profissional recebe aviso automático
```

Recusa, devolução ou necessidade de informação complementar também deve gerar retorno automático ao solicitante.

## 14.7 Vulnerabilidade

A sinalização de vulnerabilidade pertence ao contexto do paciente e pode existir independentemente de encaminhamento para Nutrição.

Quando a Nutrição acessa o paciente, visualiza a sinalização dentro dos limites de informação autorizados.

## 14.8 Planejamento Alimentar

```text
PACIENTE DA NUTRIÇÃO
      ↓
PLANEJAMENTO ALIMENTAR
      ↓
preencher / atualizar
      ↓
gerar PDF
```

## 14.9 Renovação de Receita

```text
ADMINISTRATIVO inicia
      ↓
CLÍNICO recebe
      ↓
RENOVAR RECEITA
      OU
NECESSITA CONSULTA
      ↓
retorno automático ao Administrativo
```

## 14.10 Encaminhamento

A função só aparece para contas autorizadas e deve direcionar o próximo fluxo conforme organização vigente.

## 14.11 Retorno

O profissional pode agendar/organizar retorno dentro das regras e disponibilidades autorizadas de sua própria agenda.

## 14.12 Relatórios

Relatórios devem ser calculados a partir dos registros reais do CAPO, respeitando o escopo de acesso de cada perfil.

---

# 15. MATRIZ DE COMPARAÇÃO PARA AUDITORIA DO SUPABASE

Antes de qualquer intervenção técnica, o Supabase deve ser auditado contra os seguintes blocos:

### BLOCO A — Contas, funções, especialidades e permissões
Verificar se a conta única suporta funções acumuladas, especialidades, permissões adicionais e contexto principal sem troca manual de perfil.

### BLOCO B — Agenda e comparecimento
Verificar se Confirmado e Falta conseguem operar como ações seguras e automáticas com os destinos definidos neste documento.

### BLOCO C — Paciente × especialidades
Verificar se há vínculo canônico suficiente para mostrar, junto ao nome do paciente, as especialidades em acompanhamento.

### BLOCO D — Automações de fluxo
Verificar Faltosos, Solicitações, Busca Ativa, Encaminhamentos, Vulnerabilidade, Retornos, Renovação de Receita, Nutrição e demais transições.

### BLOCO E — Notificações
Verificar se mudanças relevantes de status conseguem gerar aviso automático à pessoa que precisa agir.

### BLOCO F — Funções próprias das especialidades
Verificar funções específicas, como Planejamento Alimentar/PDF da Nutrição e Renovação de Receita do Clínico Geral.

### BLOCO G — Relatórios
Identificar quais produções podem ser calculadas hoje com fonte física confiável e quais dependem de integração/correção.

### BLOCO H — Permissões acumuladas e contexto principal
Verificar se uma conta pode acumular profissional + Coordenação + Administração + TI sem mistura indevida das responsabilidades e sem duplicação de login.

---

# 16. REGRA PARA COMANDOS FUTUROS À MANUTENÇÃO

Nenhum novo comando técnico deve partir diretamente de uma percepção visual ou de um relatório anterior.

Sequência obrigatória:

```text
DECISÃO FUNCIONAL APROVADA
        ↓
consultar esta MATRIZ
        +
consultar a ESPECIFICAÇÃO FUNCIONAL ESTRUTURAL
        ↓
validar estado físico atual
Interface + Supabase
        ↓
classificar
já existe / parcial / integrar / corrigir / criar
        ↓
definir alteração mínima necessária
        ↓
comando fechado para manutenção
        ↓
execução
        ↓
auditoria independente
```

### Regra anti-loop

**NÃO UTILIZE O HISTÓRICO DE CONVERSAS ANTERIORES COMO PROVA DE FUNCIONAMENTO. TODA CONCLUSÃO DEVE SER REVALIDADA NO ZIP ATUAL, NO CÓDIGO EFETIVAMENTE EXECUTADO E, QUANDO POSSÍVEL, POR TESTE REAL. RELATÓRIOS E CONVERSAS ANTERIORES SÃO APENAS EVIDÊNCIAS A SEREM CONFRONTADAS, NÃO RESULTADOS A SEREM HERDADOS.**

---

# 17. STATUS DESTE DOCUMENTO

Esta matriz representa o desenho funcional consolidado definido até 12/09/2026 e passa a ser fonte obrigatória para a futura auditoria de adequação do Supabase e da interface.

Novas decisões funcionais aprovadas devem ser incorporadas formalmente a esta matriz ou a uma versão posterior claramente identificada, evitando que comandos técnicos sejam gerados a partir de regras espalhadas apenas em conversas.

---

# 18. ATUALIZAÇÃO FUNCIONAL — FLUXO DO AUXILIAR ADMINISTRATIVO

Esta seção consolida e substitui, quando houver diferença de detalhamento, o desenho preliminar do Auxiliar Administrativo descrito anteriormente nesta matriz.

## 18.1 Regra de espelhamento no Gestor do Sistema

**Todo o fluxo funcional do Auxiliar Administrativo deve estar disponível na tela do Gestor/Administrador do Sistema de forma funcionalmente idêntica.**

O Gestor do Sistema pode acumular a capacidade administrativa operacional. Quando essa capacidade estiver atribuída à conta, o bloco administrativo deve abrir os mesmos fluxos, ações, estados, automações e documentos disponíveis ao Auxiliar Administrativo, sem criar uma segunda versão divergente do processo.

```text
AUXILIAR ADMINISTRATIVO
        ↓
fluxo administrativo oficial
        ↓
MESMO FLUXO
        ↓
GESTOR / ADMINISTRADOR DO SISTEMA
quando possuir a capacidade correspondente
```

A diferença entre as telas é de contexto principal e permissões acumuladas, não de duplicação do fluxo administrativo.

## 18.2 Estrutura funcional do Auxiliar Administrativo

```text
INÍCIO
├── Painel Operacional
│   ├── Agenda do dia
│   ├── Pendências do dia
│   ├── Solicitações recebidas
│   ├── Faltosos
│   ├── Remarcações / retornos
│   ├── Avisos
│   ├── Fila de Pacientes — sinalizações
│   ├── Fila de Familiares — sinalizações
│   └── Transportes / demais providências pendentes
│
PACIENTES
├── Cadastrar → Cadastro + Oferta CAPO na mesma tela/fluxo
└── Consultar

AGENDA GERAL
├── Agendar
├── Consultar
├── Remarcar
└── Fila de Espera
    ├── Pacientes
    └── Familiares

SOLICITAÇÕES
├── Recebidas
├── Aceitas / Em atendimento
├── Concluídas
└── Devolvidas / pendentes de informação

FALTOSOS
├── Acompanhar faltas
├── Contatos
├── Motivo / providência
└── Remanejamento / Remarcação

BUSCA ATIVA
└── fluxo próprio, separado de Faltosos

TRANSPORTE
FAMILIAR / CUIDADOR
ENCAMINHAMENTOS
├── Recebidos
└── Enviados
ODONTOLOGIA
RENOVAÇÃO DE RECEITA
ENCERRAMENTOS
└── Encerramentos por especialidade — acompanhamento operacional
RELATÓRIOS
└── produção administrativa baseada apenas no que o CAPO registra
SAIR
```

## 18.3 Cadastro do paciente e Oferta CAPO — fluxo unificado

A Oferta CAPO não é um módulo separado. Ela integra o próprio fluxo de entrada/cadastro do paciente.

```text
CADASTRAR PACIENTE
      ↓
dados cadastrais
      ↓
OFERTA CAPO
      ↓
registrar contato / tentativa / resposta
      ↓
┌────────────────────┬──────────────────────┬─────────────────────┐
│ ACEITOU            │ NOVO CONTATO         │ RECUSA / DESFECHO   │
│                    │ NECESSÁRIO           │                     │
↓                    ↓                      ↓
continuidade CAPO    mantém pendência       registra desfecho
                     e histórico
```

## 18.4 WhatsApp — ação contextual transversal

Sempre que paciente ou familiar estiver identificado em um contexto no qual o perfil tenha autorização legítima para contato, deve existir botão de WhatsApp associado diretamente à pessoa correspondente.

- Paciente → botão abre WhatsApp Web no número cadastrado do paciente.
- Familiar → possui número próprio de contato; botão abre WhatsApp Web no número cadastrado do familiar.
- O telefone do familiar não deve ser confundido com o telefone do paciente.
- WhatsApp não é módulo separado.
- O CAPO abre o contato no WhatsApp Web; o envio permanece ação do usuário.

## 18.5 Tela de Agendamento

```text
AGENDA GERAL → AGENDAR
        ↓
buscar / selecionar paciente
        ↓
especialidade
        ↓
profissional
        ↓
data
        ↓
horários disponíveis
        ↓
primeira consulta / retorno
        ↓
CONFIRMAR AGENDAMENTO
        ↓
agendamento gravado
        ↓
paciente entra na Agenda do profissional
        ↓
WHATSAPP
        ↓
abre WhatsApp Web no número do paciente
com a comunicação de agendamento preparada
        ↓
Auxiliar envia
```

O CAPO deve reutilizar os dados já conhecidos pelo fluxo. Quando Agendar for aberto a partir de Faltosos, retorno, fila de espera, Renovação de Receita ou outra providência que já identifique paciente/especialidade, essas informações não devem ser exigidas novamente sem necessidade.

## 18.6 Fila de Espera — duas filas visíveis

A interface apresenta somente duas filas:

```text
FILA DE ESPERA
├── PACIENTES
└── FAMILIARES
```

### 18.6.1 Fila de Pacientes

A Fila de Pacientes é visualmente única. A especialidade aparece na própria linha do paciente; não existe necessidade de abrir uma fila visual separada por especialidade.

O CAPO, internamente, mantém a organização necessária por especialidade e ordem da fila.

```text
NOVA VAGA
    ↓
CAPO identifica a especialidade
    ↓
identifica internamente o próximo paciente elegível
    ↓
avisa o Auxiliar Administrativo
    +
sinaliza o paciente na fila
    ↓
[ AGENDAR ]
    ↓
tela de Agendamento já recebe paciente + especialidade
```

Não deve existir duplicidade ativa do mesmo paciente para a mesma especialidade; o histórico deve ser preservado.

### 18.6.2 Fila de Familiares

A Fila de Familiares possui processo próprio e não é simples cópia da Fila de Pacientes.

O familiar possui cadastro e número de contato próprios e permanece vinculado ao paciente correspondente.

**Regra obrigatória:** o familiar não pode ser atendido pelo mesmo psicólogo que atende o paciente ao qual está vinculado.

```text
FAMILIAR NA FILA
      ↓
CAPO identifica paciente vinculado
      ↓
identifica psicólogo que acompanha o paciente
      ↓
esse psicólogo fica INELEGÍVEL para o familiar
      ↓
CAPO considera os demais psicólogos disponíveis
      ↓
cruza ordem da fila + compatibilidade + vaga
      ↓
sinaliza próximo familiar elegível
      ↓
avisa Auxiliar
      ↓
[ AGENDAR ]
```

A conferência da incompatibilidade deve ser realizada pelo sistema, e não deixada como responsabilidade manual do Auxiliar Administrativo.

## 18.7 Faltosos

```text
PROFISSIONAL
     ↓
[ FALTA ]
     ↓
CAPO registra ausência
     ↓
FALTOSOS DO ADMINISTRATIVO
     ↓
contato / WhatsApp
     ↓
motivo / providência
     ↓
remanejamento / remarcação, quando necessário
```

**Faltosos e Busca Ativa são fluxos distintos. A ação Falta não alimenta diretamente Busca Ativa.**

## 18.8 Solicitações administrativas e notificações

```text
PROFISSIONAL
     ↓
solicitação administrativa
     ↓
AUXILIAR recebe
     ↓
ACEITAR
     ↓
profissional recebe aviso automático
     ↓
Auxiliar executa
     ↓
CONCLUIR
     ↓
profissional recebe aviso automático
```

Devolução, recusa ou necessidade de informação complementar também deve gerar aviso ao profissional quando houver ação necessária.

## 18.9 Retornos e remarcações

Quando uma necessidade de retorno/remarcação já nasce vinculada ao paciente e à especialidade, o botão de ação deve abrir diretamente a tela de Agendamento com os dados já conhecidos preenchidos, apresentando as opções válidas de agenda.

## 18.10 Renovação de Receita

A Renovação de Receita é iniciada pelo Administrativo e enviada ao Clínico Geral.

```text
AUXILIAR ADMINISTRATIVO
        ↓
solicitação de Renovação de Receita
        ↓
CLÍNICO GERAL
        ↓
┌──────────────────────┬────────────────────────┐
│ RENOVAR RECEITA      │ NECESSITA CONSULTA     │
↓                      ↓
registra conclusão     retorna ao Administrativo
operacional no CAPO    para agendamento
↓                      ↓
retorno automático     [ AGENDAR ]
ao Administrativo      ↓
↓                      Agenda do Clínico
contato com paciente
```

O conteúdo da receita permanece no sistema oficial próprio, não no CAPO.

## 18.11 Transporte — solicitação com PDF operacional

O documento de Transporte gerado em PDF deve permanecer vinculado ao paciente e à solicitação correspondente e chegar junto ao fluxo recebido pelo Administrativo.

```text
NECESSIDADE / SOLICITAÇÃO DE TRANSPORTE
        ↓
PDF gerado
        ↓
PDF vinculado ao paciente + solicitação
        ↓
AUXILIAR recebe o fluxo já com o documento
        ↓
[ VISUALIZAR PDF ] [ DOWNLOAD ]
        ↓
encaminhamento externo
        ↓
registrar providência
        ↓
acompanhar até conclusão / cancelamento
        ↓
histórico preservado
```

O PDF não deve exigir procura em módulo separado. Deve acompanhar a solicitação para download e anexação no encaminhamento externo.

## 18.12 Odontologia — encaminhamento do Dr. Ilton com PDF

O documento de encaminhamento odontológico gerado pelo Dr. Ilton deve permanecer vinculado ao paciente e ao encaminhamento e chegar junto à providência recebida pelo Administrativo.

```text
DR. ILTON
    ↓
paciente
    ↓
encaminhamento para Odontologia
    ↓
gera PDF
    ↓
PDF vinculado ao paciente + encaminhamento
    ↓
AUXILIAR ADMINISTRATIVO recebe
    ↓
[ VISUALIZAR PDF ] [ DOWNLOAD ]
    ↓
Auxiliar anexa o PDF no encaminhamento externo
    ↓
registra a providência no CAPO
    ↓
acompanha o fluxo
```

Transporte e Odontologia mantêm documentos próprios e fluxos próprios; o princípio comum é o documento acompanhar a solicitação operacional correspondente.

## 18.13 Familiar / Cuidador — contato próprio

O familiar possui registro próprio de telefone/WhatsApp, além do vínculo com o paciente.

```text
FAMILIAR / CUIDADOR
├── Nome
├── vínculo com o paciente
├── telefone / WhatsApp próprio
├── paciente vinculado
└── histórico do vínculo
```

O botão WhatsApp exibido no contexto do familiar utiliza o telefone do familiar.

## 18.14 Automação central do Administrativo

O CAPO deve funcionar como orquestrador do trabalho administrativo:

```text
EVENTO / NECESSIDADE
       ↓
CAPO identifica o fluxo e o responsável
       ↓
pendência chega ao Administrativo
       ↓
Auxiliar abre diretamente o contexto necessário
       ↓
executa a providência
       ↓
CAPO encaminha automaticamente a próxima etapa
ou notifica o responsável correspondente
```

O Auxiliar não deve precisar repetir buscas ou reconstruir manualmente contexto que o CAPO já possui.

## 18.15 Observação obrigatória para a tela do Gestor do Sistema

**O fluxo administrativo descrito nesta seção deve estar presente na tela do Gestor/Administrador do Sistema IGUALZINHO ao fluxo do Auxiliar Administrativo quando a conta do Gestor possuir a capacidade administrativa operacional.**

Isso inclui, sem redução funcional:

- Cadastro + Oferta CAPO unificados;
- Consulta de pacientes e WhatsApp contextual;
- Agenda Geral, Agendar, Consultar e Remarcar;
- Fila de Pacientes e Fila de Familiares com suas lógicas próprias;
- Solicitações e notificações de mudança de estado;
- Faltosos;
- Busca Ativa separada;
- Transporte com PDF junto à solicitação;
- Familiar/Cuidador com contato próprio;
- Encaminhamentos;
- Odontologia com PDF do Dr. Ilton junto ao encaminhamento;
- Renovação de Receita;
- Encerramentos por especialidade no âmbito operacional;
- Relatórios administrativos suportados pelos dados reais do CAPO;
- mesmas automações, atalhos contextuais e encaminhamento da próxima ação.

O Gestor pode possuir outros módulos adicionais por suas permissões de governança, Administração do Sistema e/ou TI, mas **esses módulos adicionais não podem substituir, reduzir nem alterar o fluxo administrativo acumulado**.
