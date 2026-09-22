# Tarefa 05 — Aniversariantes

## Status

**🟣 MÓDULO CONSTRUÍDO E VALIDADO TECNICAMENTE — pronto para implantação de teste.**

## Auditoria e fontes

Foram confrontados o Manual Técnico Integrado v5, o Comando Mestre, os HTMLs legados de Auxiliar Administrativo, Coordenação, Assistência Social, Nutrição e Médico, e o schema físico `fftebavlhbfcrvrtnrld`.

O banco não possuía função ou view canônica de aniversariantes. As fontes físicas confirmadas são:

- `patients.birth_date` para pacientes;
- `professionals.birth_date` para a equipe CAPO.

Na auditoria de 16/09/2026 existia um único paciente, marcado como teste, com nascimento cadastrado. Os sete profissionais ativos não possuíam `birth_date`. Não existiam agendamentos nem ciclos ativos reais para homologar o recorte profissional.

## Decisão de segurança e escopo

- Administrador, Administrativo Operacional e Coordenação consultam pacientes ativos, vivos e visíveis no contexto institucional/homologação.
- O perfil profissional consulta somente pacientes cuja especialidade ativa esteja sob sua responsabilidade atual ou que possuam vínculo de agenda com ele.
- A equipe inclui somente profissionais ativos com nascimento cadastrado.
- A resposta entrega nome, identificadores operacionais do paciente e função da equipe; não entrega data completa de nascimento, idade ou telefone.
- O botão de WhatsApp dos HTMLs legados não foi incorporado nesta etapa: a RPC de aniversariantes não retorna telefone. A integração com contato real será avaliada somente na implantação de teste, usando contrato autorizado e sem registrar envio fictício.
- A data de referência é calculada no backend no fuso `America/Sao_Paulo` e não pode ser escolhida pelo cliente.

## Implementação

### Backend

Migration `20260916150852_create_secure_birthdays_interface`:

- criou `get_birthdays_for_interface()`;
- valida sessão, termo vigente, conta ativa e papel permitido;
- aplica isolamento de homologação com `capo_patient_visible_in_current_context`;
- aplica escopo profissional por responsabilidade atual do ciclo ou vínculo de agenda;
- devolve objeto sanitizado com `reference_date`, `time_zone`, `patients` e `team`;
- revoga `EXECUTE` de `PUBLIC`/`anon` e concede somente a `authenticated`.

Hash físico posterior:

| Função | Hash MD5 |
|---|---|
| `get_birthdays_for_interface` | `b3bd94f6de879f079c58cc89d2fab05d` |

### Interface

- o painel “Aniversariantes” foi integrado à página inicial comum;
- pacientes acompanhados e equipe são renderizados diretamente da RPC;
- estados de carregamento, erro e vazio são explícitos;
- a interface não calcula aniversários a partir de coleções locais;
- nenhum contato fictício é oferecido; eventual integração de contato será validada somente na implantação de teste.

## Verificação

| Verificação | Resultado |
|---|---|
| Preflight da migration em transação revertida | PASS |
| Migration registrada no projeto físico | PASS |
| ACL: `anon=false`, `PUBLIC=false`, `authenticated=true` | PASS |
| Leitura administrativa autenticada sem aniversariantes reais do dia | PASS — listas vazias coerentes |
| Homologação transacional com paciente de teste ajustado para o dia | PASS — 1 paciente retornado |
| Reversão do contexto e do nascimento de teste após homologação | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 53 testes |
| `npm run build` | PASS — 91 módulos |
| `npm run test:e2e` | PASS — 3 testes |
| `git diff --check` | PASS — apenas avisos LF/CRLF |

O advisor de segurança sinaliza a RPC por ser `SECURITY DEFINER` executável por `authenticated`. A exposição é intencional porque as tabelas não possuem grants diretos ao cliente; o corpo limita sessão, termo, conta, papel, escopo do paciente e os campos retornados. O advisor de performance não apresentou alerta específico para o fluxo.

## Implantação de teste

As verificações abaixo não são pendências da construção atual. Serão executadas
somente quando houver implantação de teste disponível:

- cadastrar ou utilizar datas reais de nascimento da equipe;
- validar o painel com aniversariantes reais de pacientes e equipe;
- homologar Administração, AO, Coordenação e cada contexto profissional;
- testar negação para perfil não autorizado e sessão expirada pela aplicação real;
- avaliar eventual abertura de WhatsApp administrativo com telefone real e contrato autorizado;
- confirmar a fonte segura de contato para profissionais, sem usar o contrato administrativo indevidamente.
