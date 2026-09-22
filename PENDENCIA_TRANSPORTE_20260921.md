# Pendência de Transporte — CAPO

**Data:** 2026-09-21  
**Classificação:** 🟡 PRONTA COM PENDÊNCIA EXTERNA

## Resumo simples

A área de Transporte já está ligada ao sistema e protegida por permissão. Porém, o contrato oficial que permitiria registrar, acompanhar e concluir transportes ainda não foi localizado no projeto.

Por isso, a tela permanece em estado vazio. Nenhum transporte, paciente, endereço, responsável ou documento fictício foi criado.

## Verificação realizada

Foram consultados:

- rota e controle de acesso de Transporte;
- página React de Transporte;
- serviço central de chamadas ao Supabase;
- tipos do banco;
- migrations do Supabase;
- fluxo real de Solicitações administrativas;
- documentação de continuidade, Solicitações e Notificações;
- testes unitários relacionados a acesso, rota e RPC.

## O que foi encontrado

### Existente

- rota `/transporte`;
- capability `preencher_solicitacao_transporte`;
- item de navegação exibido somente para contexto autorizado;
- tela protegida com estado vazio;
- testes de autorização da rota.

### Não localizado

- tabela específica de Transporte;
- RPC de listagem;
- RPC de criação;
- RPC de processamento ou conclusão;
- histórico específico;
- evento de notificação de Transporte;
- integração específica com Pendências;
- contrato de PDF ou documento oficial.

## Pendência necessária

A equipe responsável precisa fornecer ou confirmar:

1. nome e estrutura da tabela oficial;
2. campos obrigatórios e estados permitidos;
3. quem pode criar, visualizar, processar e concluir;
4. relação com paciente e com Solicitações;
5. regras de origem, destino e responsável;
6. estrutura do histórico e autoria;
7. eventos de notificação;
8. documento oficial, caso exista;
9. RPCs ou migration oficiais;
10. regras de RLS e autorização.

## Decisão

Não alterar o banco neste momento. Criar uma estrutura por inferência poderia gerar dados incorretos e um fluxo paralelo ao institucional.

Enquanto o contrato oficial não for disponibilizado, manter Transporte protegido e vazio. Quando o contrato existir, implementar a integração seguindo o padrão real de Solicitações, sem duplicar fonte de verdade.

## Validação atual

- typecheck: aprovado;
- lint: aprovado;
- testes focados de acesso e rota: aprovados;
- build de produção: aprovado;
- nenhum SQL, RPC, RLS, policy, trigger, tabela ou coluna de Transporte foi criado ou alterado.
