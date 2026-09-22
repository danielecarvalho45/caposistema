# Tarefa 07 — Área assistencial compartilhada

## Resultado

Psicologia, Fisioterapia e as futuras especialidades passam a usar uma única
área React em `/atuacao`, orientada pelo vínculo real do profissional e por suas
especialidades ativas. A agenda deixou de ser um placeholder e agora consome a
RPC canônica `get_agenda_for_interface`.

Estado: **AMARELO / CONTAS E DADOS REAIS PENDENTES**.

## Contrato implantado

- `CAPOProfissionalAssistencialIntegration` centraliza especialidades, busca de
  pacientes, agenda e relatório operacional.
- `get_my_assistential_specialties_for_interface()` devolve somente as
  especialidades ativas do profissional autenticado e identifica o contexto de
  homologação vigente.
- `search_my_patients_for_interface()` expõe apenas identificação sanitizada e
  limita os resultados aos pacientes visíveis vinculados ao profissional por
  responsabilidade assistencial ativa ou agenda válida.
- `get_agenda_for_interface()` é consumida com o `professional_id` da conta
  profissional; Administração, AO e Coordenação mantêm a visão institucional já
  autorizada no backend.
- `get_my_specialty_operational_report_for_interface()` fornece os indicadores
  reais de agenda, retornos, fila, solicitações, encaminhamentos e encerramentos.
- A interface não cria prontuário clínico genérico, não inventa dados e não
  replica um HTML por especialidade.
- As novas RPCs removem execução de `PUBLIC` e `anon`, concedem somente a
  `authenticated` e validam sessão, termo, conta, papel, profissional e escopo.

## Migration

- `20260916183355_create_shared_assistential_loaders`

Não foram criadas novas tabelas. A migration adiciona somente os dois loaders
seguros que faltavam à integração compartilhada.

## Homologação executada

Foi usada a conta de homologação existente em contexto profissional de
Psicologia, vinculada temporariamente à profissional Jaqueline e ao paciente de
teste já cadastrado. Em uma única transação:

1. foi criado um ciclo assistencial efêmero;
2. a responsabilidade de Psicologia foi associada pelo contrato canônico;
3. a lista de especialidades reconheceu o contexto corrente;
4. a busca profissional encontrou exatamente o paciente vinculado;
5. a transação foi revertida.

Após `ROLLBACK`, foram confirmados zero ciclos e zero vínculos residuais do
ensaio, além do contexto de homologação novamente desabilitado.

## Interface

- rota `/atuacao` exclusiva para conta com papel profissional e vínculo ativo;
- seleção de especialidade derivada do backend;
- busca explícita por nome, número CAPO ou CMS, com mínimo de dois caracteres;
- cartões de métricas por período, sem cálculo oficial no navegador;
- rota `/agenda` integrada ao backend e autorizada por papel conforme o contrato
  físico da RPC;
- estados de carregamento, vazio, erro e indisponibilidade;
- layout responsivo e compartilhado, sem duplicação por profissão.

## Pendência real

Os seis profissionais assistenciais ativos ainda não possuem `user_accounts`
próprias vinculadas, e o banco ainda não contém volume assistencial real
suficiente para homologar a experiência ponta a ponta de cada especialidade.
Esses vínculos e dados não foram fabricados. A tarefa somente poderá ficar verde
depois da validação com contas autorizadas e registros reais.

## Validação técnica

- ESLint, TypeScript e Prettier: aprovados;
- 58 testes unitários: aprovados;
- build Vite de produção: aprovado, mantendo apenas o aviso conhecido de chunk
  principal acima de 500 kB;
- 3 cenários Playwright: aprovados em Chromium;
- `git diff --check`: aprovado;
- consultor de desempenho: nenhuma ocorrência relacionada às duas novas RPCs;
- consultor de segurança: sinalizou, como esperado, que as duas RPCs
  `SECURITY DEFINER` são executáveis por `authenticated`. A exposição é
  intencional para a Data API; `anon` e `PUBLIC` não possuem `EXECUTE`, o
  `search_path` está fixo e ambas validam autorização dentro do corpo. Os demais
  avisos são anteriores e permanecem na fila de auditoria global.

## Referências técnicas consultadas

- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Data API Security: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Breaking Changes: https://supabase.com/changelog?types=breaking-change
- Supabase Database Linter 0029: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
