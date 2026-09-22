# Tarefa 08 — Logs e observabilidade técnica

## Resultado

O bloco técnico deixou de usar painéis vazios e contadores mantidos apenas na
sessão do navegador. A SPA agora oferece a rota `/tecnica`, integrada às RPCs
canônicas de painel, saúde do sistema, inventário de integrações, logs runtime,
chamados e histórico persistido.

Estado: **AMARELO / CONTA TI E TELEMETRIA REAL PENDENTES**.

## Contratos integrados

- `get_technical_dashboard_for_interface` — indicadores de chamados e runtime
  no período, incluindo erros recentes;
- `get_technical_system_status_for_interface` — verificação canônica de banco,
  autenticação, suporte e repositório de logs;
- `get_technical_integrations_for_interface` — inventário de dependências e
  evidência de monitoramento;
- `get_technical_runtime_logs_for_interface` — logs sanitizados com filtros de
  período, severidade, componente e código;
- `get_technical_support_requests_for_interface` — chamados técnicos reais;
- `get_technical_support_history_for_interface` — histórico persistido dos
  chamados por meio da auditoria canônica.

Nenhuma migration foi necessária. Os contratos físicos já estavam implantados
e protegidos; esta tarefa acrescentou tipagem, validação de resposta, transporte
Supabase e interface React.

## Autorização e segurança

- a rota e a navegação são liberadas apenas aos papéis `administrador` e
  `administrador_tecnico`;
- as seis RPCs exigem sessão, termo vigente, conta ativa e repetem a autorização
  dentro do banco;
- `anon` e `PUBLIC` não possuem `EXECUTE`; somente `authenticated` chama a Data
  API e a autorização funcional permanece no corpo;
- todas são `SECURITY DEFINER` com `search_path` configurado;
- mensagens runtime são sanitizadas pelo backend e a interface não expõe
  segredos, chaves, payloads brutos do provedor ou tabelas diretamente;
- a auditoria global assistencial não foi aberta ao papel técnico. O histórico
  exibido em TI é o histórico específico de suporte autorizado pelo contrato.

## Homologação física

A conta Administradora ativa existente executou os contratos reais:

- painel dos últimos 30 dias: todos os contadores em zero, coerentes com a
  ausência de telemetria e chamados;
- estado do sistema: Banco de Dados, Autenticação, Suporte Técnico e Logs
  Técnicos Runtime retornaram `operacional`;
- integrações: a dependência `supabase_auth_admin_edge_function` foi inventariada
  como `desconhecido`, pois sua configuração não é verificável pelo banco e não
  há evento runtime de sucesso ou falha;
- logs runtime: zero registros;
- chamados técnicos: zero registros;
- auditoria global: registros reais persistidos foram confirmados para a conta
  Administradora, sem serem incorporados à visão do papel técnico.

O banco contém 44 registros históricos no diário de construção e 24 eventos na
auditoria operacional, mas esses dados não foram reutilizados como se fossem
telemetria runtime.

## Interface

- painel técnico por período;
- estado e método de verificação de cada componente;
- inventário de integrações com evidência e fonte de monitoramento;
- filtros de logs e estados de carregamento, vazio e erro;
- lista de chamados e carregamento sob demanda do histórico persistido;
- layout responsivo e entrada “Área técnica” no shell compartilhado.

## Pendências reais

- não existe conta ativa com o papel `administrador_tecnico` para homologação do
  acesso específico de TI;
- `technical_runtime_logs` e `technical_support_requests` ainda estão vazias;
- a integração administrativa de Auth só poderá mudar de `desconhecido` quando
  operações reais registrarem telemetria no componente previsto.

Nenhum log, chamado, erro ou integração fictícia foi criado para preencher a
tela.

## Validação técnica

- ESLint, TypeScript, Prettier e `git diff --check`: aprovados;
- 60 testes unitários: aprovados;
- build Vite de produção: aprovado, com o aviso conhecido de chunk principal
  acima de 500 kB;
- 3 testes Playwright em Chromium: aprovados;
- consultor de desempenho: nenhuma ocorrência relacionada às seis RPCs
  integradas;
- consultor de segurança: as seis RPCs receberam o aviso esperado de execução
  `SECURITY DEFINER` por `authenticated`. A exposição é intencional para a Data
  API; `anon` e `PUBLIC` estão revogados e a autorização por papel é repetida no
  corpo. Os demais achados são anteriores e permanecem na fila global.

## Referências técnicas consultadas

- Supabase Logs: https://supabase.com/docs/guides/platform/logs
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Changelog: https://supabase.com/changelog
- Supabase Database Linter 0029: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
