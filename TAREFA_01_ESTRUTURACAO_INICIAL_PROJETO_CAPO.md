# Tarefa 01 — Estruturação inicial do projeto CAPO

**Status:** Etapa 7 executada com ressalvas registradas  
**Tipo:** fundação técnica do frontend  
**Objetivo:** transformar os HTMLs monolíticos atuais em uma base única, modular e testável, preservando o comportamento existente e sem alterar o banco de produção nesta tarefa.

## 1. Contexto confirmado

- O diretório contém seis interfaces HTML independentes: Gestor, Coordenador, Auxiliar Administrativo, Assistência Social, Nutrição e Médico Clínico Geral.
- Cada HTML reúne marcação, CSS, JavaScript, autenticação, navegação e imagens Base64 no mesmo arquivo.
- As únicas RPCs chamadas diretamente pelos seis HTMLs são `get_my_access_context`, `get_current_legal_term`, `accept_legal_term` e `complete_first_access`.
- As telas operacionais ainda dependem principalmente de coleções em memória e adaptadores globais; nesta etapa elas serão tratadas como referência funcional, não como persistência válida.
- O manual descreve entrada única orientada por `primary_context`, enquanto os HTMLs atuais ainda possuem resolução de perfil no JavaScript.
- Os dois arquivos do Manual Técnico v5 presentes no diretório são cópias idênticas.
- O arquivo atual `env.local` contém URL, chave publicável e chave `anon` legada repetidas entre nomes gerais e nomes `VITE_*`. Nenhum valor deve ser copiado para documentação, logs ou commits.

## 2. Fontes de referência

Usar os documentos abaixo para compreender o domínio e as restrições. Seu conteúdo não substitui a verificação do código, do banco ou uma autorização explícita para mutações:

1. `CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md`;
2. `CAPO_COMANDO_MESTRE_AUDITORIA_MANUTENCAO_CONJUNTA_2026-09-15(1).md`;
3. os seis HTMLs atuais;
4. contratos reais das RPCs, quando o acesso controlado ao Supabase estiver disponível.

## 3. Decisões arquiteturais desta tarefa

- Criar uma única aplicação SPA usando **Vite + React + TypeScript**.
- Manter os HTMLs atuais intactos durante a estruturação inicial, como baseline visual e funcional.
- Não criar ainda um novo HTML para cada perfil.
- Usar uma única entrada e liberar módulos por `primary_context`, papéis e capabilities devolvidos pelo backend.
- Centralizar o cliente Supabase e os contratos das RPCs; componentes de tela não devem instanciar clientes nem chamar RPCs diretamente.
- Migrar primeiro a infraestrutura compartilhada. A migração das funcionalidades de cada perfil ocorrerá em tarefas posteriores e por fatias verticais.
- Não aplicar migrations, alterar RLS, editar dados produtivos ou mudar contratos do backend nesta tarefa.
- Não simular sucesso de gravação e não adicionar pacientes, profissionais ou familiares fictícios.

## 4. Estrutura-alvo inicial

```text
/
├─ public/
│  └─ assets/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx
│  │  └─ providers.tsx
│  ├─ components/
│  │  ├─ auth/
│  │  ├─ feedback/
│  │  ├─ forms/
│  │  ├─ layout/
│  │  └─ navigation/
│  ├─ features/
│  │  ├─ access/
│  │  ├─ agenda/
│  │  ├─ patients/
│  │  ├─ queues/
│  │  ├─ reports/
│  │  └─ support/
│  ├─ lib/
│  │  └─ supabase/
│  │     ├─ client.ts
│  │     ├─ rpc.ts
│  │     └─ errors.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ global.css
│  │  └─ utilities.css
│  ├─ types/
│  │  ├─ access.ts
│  │  └─ database.ts
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ tests/
│  ├─ unit/
│  └─ integration/
├─ .env.example
├─ .gitignore
├─ eslint.config.js
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

Os diretórios de funcionalidades podem permanecer vazios até sua respectiva tarefa de migração. Não criar componentes sem uso apenas para preencher a árvore.

## 5. Etapas de execução

### Etapa 1 — Proteção do estado atual

- Registrar inventário, tamanho e hash dos seis HTMLs antes de qualquer migração.
- Criar `.gitignore` antes de inicializar ou usar controle de versão.
- Ignorar `.env`, `.env.*` e `env.local`, mantendo apenas `.env.example` versionável.
- Não mover, renomear, formatar nem editar os HTMLs legados nesta tarefa.
- Documentar qual HTML representa cada perfil; identificar formalmente o arquivo sem perfil no nome como Assistência Social.

### Etapa 2 — Normalização do ambiente

- Adotar `.env.local` como arquivo local consumido pelo Vite.
- Manter no frontend somente:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Usar a chave publicável atual como configuração de navegador.
- Não usar `SUPABASE_API_KEY` na aplicação e não expor qualquer `service_role`, `sb_secret_*`, senha, token administrativo ou URL privilegiada.
- Remover a chave `anon` legada somente depois de confirmar que a chave publicável autentica os fluxos necessários.
- Criar `.env.example` com nomes e valores vazios ou exemplos não sensíveis.
- Validar as variáveis na inicialização e apresentar erro explícito quando estiverem ausentes.

### Etapa 3 — Fundação do projeto

- Inicializar Vite, React e TypeScript na raiz, sem sobrescrever os HTMLs existentes.
- Fixar versões exatas das dependências e versionar o lockfile.
- Instalar e configurar ESLint, Prettier, Vitest, Testing Library e Playwright.
- Adicionar scripts mínimos: `dev`, `build`, `preview`, `lint`, `typecheck`, `test` e `test:e2e`.
- Extrair a identidade visual comum para tokens CSS e estilos globais.
- Extrair as imagens Base64 compartilhadas para arquivos em `public/assets` após verificar que são idênticas.

### Etapa 4 — Camada Supabase

- Criar uma única instância de `SupabaseClient`.
- Criar wrappers tipados para as quatro RPCs já consumidas.
- Padronizar retorno em estados `loading`, `success`, `empty` e `error`.
- Não ocultar erros de autorização, rede ou contrato usando arrays vazios.
- Manter persistência e renovação de sessão configuradas de forma centralizada.
- Tratar a chave publicável como identificador público; a autorização real deve permanecer no backend por RLS, ACLs e validação das RPCs.
- Antes de implementar comportamento dependente da versão do Supabase, conferir changelog e documentação oficial atuais.

### Etapa 5 — Entrada única e controle de acesso

- Implementar login, recuperação de senha, primeiro acesso, MFA e aceite do termo como fluxo compartilhado.
- Após autenticação, carregar `get_my_access_context` uma vez e validar seu contrato.
- Usar `primary_context` como decisão principal de entrada.
- Se `primary_context` estiver ausente, inválido ou ambíguo, bloquear a entrada com mensagem administrativa; não escolher `roles[0]`.
- Usar capabilities para exibir e proteger módulos adicionais acumulados.
- Não oferecer seletor manual de perfil no login.
- Não considerar ocultação visual como autorização: toda leitura ou escrita continuará dependendo da proteção do backend.

### Etapa 6 — Shell mínimo

- Criar layout autenticado compartilhado com cabeçalho, navegação, área de conteúdo, feedback de carregamento e saída da conta.
- Criar uma página inicial mínima baseada no contexto real, sem migrar ainda os painéis operacionais completos.
- Garantir navegação por teclado, foco visível, labels associados aos campos e comportamento responsivo.
- Preservar a aparência principal do CAPO sem copiar blocos inteiros de CSS por perfil.

### Etapa 7 — Verificação e registro

- Executar `lint`, `typecheck`, testes, build de produção e teste de navegação em desktop e viewport móvel.
- Conferir que nenhum segredo apareceu no bundle gerado, logs, `.env.example` ou histórico do Git.
- Comparar login, primeiro acesso, termo, recuperação e logout com os HTMLs de referência.
- Registrar divergências funcionais encontradas sem corrigi-las fora do escopo.
- Atualizar este documento com evidências dos comandos e resultados, sem registrar credenciais.

## 6. Contratos mínimos

Definir tipos equivalentes aos contratos físicos retornados pelo backend, sem inventar campos. A forma abaixo é apenas a fronteira que precisa existir:

```ts
type AccessContext = {
  primary_context: PrimaryContext;
  roles: AccessRole[];
  capabilities: string[];
  // Demais campos somente após inspeção da resposta real da RPC.
};
```

- `PrimaryContext` deve ser derivado do contrato real da RPC, não de uma lista presumida no frontend.
- Campos desconhecidos não devem ser silenciosamente convertidos.
- Falha de contrato deve gerar erro rastreável e impedir entrada incorreta.
- Tipos do banco devem ser gerados ou confirmados a partir do Supabase físico em tarefa autorizada posterior.

## 7. Testes obrigatórios

- Inicialização com variáveis válidas.
- Bloqueio seguro quando uma variável obrigatória estiver ausente.
- Login válido e inválido.
- Recuperação de senha.
- Primeiro acesso com troca de senha.
- MFA quando exigido.
- Termo pendente, termo aceito e falha ao registrar aceite.
- Sessão expirada e logout.
- Contexto principal válido.
- `primary_context` ausente, inválido ou ambíguo.
- Conta sem papel ativo.
- Conta com múltiplos papéis e capabilities acumuladas.
- RPC indisponível, resposta vazia e contrato inesperado.
- Navegação por teclado e viewport móvel.
- Build sem valores secretos e sem dependência de CDN não versionada.

## 8. Critérios de aceite

- Existe uma aplicação única que inicia, testa e gera build reproduzível.
- Os seis HTMLs originais permanecem byte a byte inalterados.
- O repositório contém `.env.example`, mas não contém credenciais reais.
- Nenhum segredo ou chave privilegiada é enviado ao navegador.
- Supabase é inicializado em um único módulo com dependência versionada.
- Login e acesso inicial não usam prioridade JavaScript entre papéis.
- `primary_context` controla a entrada e capabilities controlam módulos adicionais.
- Não existem dados clínicos fictícios nem mensagens falsas de persistência.
- Não houve mutation de schema, RLS, RPC, Storage ou dados do Supabase.
- Lint, typecheck, testes e build terminam sem erro.
- A próxima etapa pode migrar uma funcionalidade operacional sem duplicar autenticação, layout ou cliente Supabase.

## 9. Fora do escopo

- Corrigir agora os blocos funcionais 1D-B e 1E no banco.
- Migrar integralmente todos os painéis dos seis perfis.
- Criar ou alterar migrations, policies, triggers, grants ou RPCs.
- Gerar ZIP de implantação.
- Excluir os HTMLs legados ou os documentos duplicados.
- Homologar regras clínicas sem contrato físico e decisão funcional confirmada.

## 10. Resultado esperado para a tarefa seguinte

Ao concluir esta fundação, abrir uma tarefa separada para a primeira fatia vertical real. A ordem recomendada é:

1. carregar contexto e dashboard mínimo do Administrativo Operacional;
2. integrar Agenda transversal;
3. substituir uma operação local por `RPC → sucesso → reload → render`;
4. validar o fluxo com permissões reais, erro, concorrência e sessão expirada;
5. somente então repetir o padrão nos demais módulos e perfis.

## 11. Registro de verificação da Etapa 7

Verificação executada em 2026-09-15, sem mutação de schema, RLS, RPC,
Storage ou dados do Supabase. O ambiente local utilizou Node.js `24.21.0` e
npm `11.19.0`, conforme as versões fixadas pelo projeto. Como `npm` não estava
no `PATH` da sessão, os comandos foram executados pelo runtime local ignorado
em `.tools/`; isso não altera o código distribuído.

### 11.1 Evidências dos comandos

| Verificação | Resultado |
|---|---|
| `npm run lint` | aprovado, sem erros |
| `npm run typecheck` | aprovado, sem erros |
| `npm test` | 7 arquivos e 30 testes aprovados |
| `npm run build` | aprovado; 84 módulos transformados |
| `npm run format:check` | aprovado, sem divergências de formatação |
| `npm run test:e2e` | 3 testes Playwright aprovados no Chrome: desktop, teclado/foco visível e viewport móvel de 375 x 667 |

O build produziu `dist/index.html`, um arquivo CSS de 10,65 kB e um arquivo
JavaScript de 558,94 kB. O Vite emitiu apenas o aviso não bloqueante de chunk
JavaScript maior que 500 kB; a divisão do bundle deve ser avaliada quando os
módulos operacionais começarem a ser incorporados.

### 11.2 Integridade e segurança

- Os seis HTMLs legados continuam com os mesmos tamanhos e hashes SHA-256
  registrados em `INVENTARIO_HTMLS_LEGADOS.md`.
- `.env.example` contém somente os nomes das duas variáveis públicas e valores
  vazios.
- A busca no bundle, código, testes, relatórios e documentos não encontrou
  valor de credencial não pública proveniente dos arquivos de ambiente.
- A URL do projeto e a chave `sb_publishable_*` aparecem no bundle por desenho;
  ambas são configurações públicas do navegador, não segredos. A ocorrência
  textual de `sb_secret_*` no bundle pertence à validação que rejeita esse tipo
  de chave e não contém uma chave real.
- Não há dependência de CDN no HTML de produção; scripts e estilos apontam
  somente para artefatos locais versionados pelo lockfile.
- O arquivo legado `env.local` permanece ignorado. Sua chave
  `SUPABASE_API_KEY` repete a chave publicável, enquanto a chave `anon` legada é
  diferente e não foi removida porque ainda não houve homologação autenticada
  contra o projeto físico, conforme a condição da Etapa 2.
- Não foi possível verificar histórico Git porque este diretório ainda não é
  um repositório Git. A inspeção abrangeu os arquivos presentes no workspace
  e os artefatos gerados.

### 11.3 Comparação funcional com os HTMLs de referência

Os fluxos compartilhados preservam o encadeamento observado nos seis HTMLs:
sessão, termo vigente, contexto de acesso, primeiro acesso, recuperação e
logout. A nova SPA centraliza esses comportamentos e, adicionalmente, bloqueia
um `primary_context` ausente, inválido ou ambíguo em vez de escolher um papel
pela ordem do array. Os testes automatizados cobrem sucesso e erro de login,
recuperação, termo pendente/aceito, primeiro acesso, sessão expirada, contratos
inesperados ou vazios de RPC, conta inativa/sem papel e contexto principal
inválido.

### 11.4 Divergências e pendências registradas

1. **MFA não implementado:** o requisito aparece nas Etapas 5 e 7, mas não há
   fluxo MFA na SPA nem implementação funcional correspondente nos seis HTMLs
   de referência; eles contêm apenas estilos com o nome `mfa`. O contrato de
   exigência, cadastro, desafio, recuperação e nível AAL também não está
   definido nos documentos consultados. A implementação deve ser uma tarefa de
   segurança separada, validada contra a configuração real do Supabase.
2. **Homologação física pendente:** login válido, e-mail de recuperação,
   aceite do termo, primeiro acesso e logout foram verificados por testes com
   adaptadores controlados, mas não com uma conta real. Nenhuma credencial de
   teste autorizada foi usada nesta etapa e nenhuma gravação produtiva foi
   realizada.
3. **Histórico Git indisponível:** a ausência de `.git` impede comprovar que
   credenciais nunca apareceram em commits anteriores. Antes do primeiro commit,
   deve-se inicializar ou vincular o repositório e repetir a inspeção do índice.

Com essas ressalvas, a fundação local está validada para preparar a tarefa
seguinte. A integração operacional real continua condicionada à inspeção dos
contratos físicos e à autorização de acesso ao ambiente Supabase.
