# Tarefa 06 — Encaminhamentos interprofissionais

## Resultado

O fluxo interprofissional foi fechado no banco e integrado à rota
`/encaminhamentos` da SPA. A implementação mantém o Administrativo como ponto de
triagem, registra origem e especialidade solicitada, exige um destinatário real
da especialidade antes da aprovação e permite ao destinatário registrar o
atendimento e a contrarreferência.

Estado: **AMARELO / HOMOLOGAÇÃO REAL E VÍNCULOS DE CONTA PENDENTES**.

## Contrato implantado

- `origin_specialty_id` registra a origem assistencial.
- `requested_specialty_id` registra o destino pedido antes da triagem.
- `target_specialty_id` e `target_professional_id` são materializados na
  aprovação administrativa.
- `referral_events` mantém criação, aprovação, início, providências, conclusão,
  recusa e cancelamento.
- Enviados são visíveis ao solicitante; recebidos, ao destinatário; Administração
  e Coordenação possuem a leitura institucional prevista.
- Ações são restritas ao solicitante, ao destinatário e ao Administrativo de
  acordo com o estado.
- Atribuição notifica o destinatário; aprovação, início, recusa, cancelamento e
  conclusão notificam o solicitante pelo fluxo canônico.
- A capacidade `encaminhamento_interprofissional` foi habilitada nas cinco
  especialidades assistenciais ativas, sem autorização por nome de pessoa.
- Tabelas permanecem sem acesso direto do cliente; a interface usa RPCs
  `SECURITY DEFINER` com validação de sessão, termo, papel, escopo do paciente e
  transições.

## Migrations

- `20260916152126_complete_interprofessional_referral_workflow`
- `20260916152438_fix_interprofessional_referral_appointment_source`
- `20260916182745_index_referral_event_actor`

A segunda migration corrige a fonte de agenda para a tabela física canônica
`patient_appointments`, descoberta pelo primeiro ensaio transacional. A terceira
adiciona o índice de apoio da chave estrangeira indicado pelo consultor de
desempenho do Supabase.

## Homologação executada

Foi usado exclusivamente o paciente de homologação em uma transação revertida.
O ensaio criou um ciclo efêmero e percorreu:

1. criação por Nutrição para Clínica Geral;
2. aprovação e atribuição pelo Administrativo;
3. abertura pelo destinatário;
4. registro de providência;
5. conclusão com contrarreferência;
6. leitura da caixa de recebidos e dos cinco eventos.

Após `ROLLBACK`, foram confirmados zero encaminhamentos, zero eventos, zero
ciclos do paciente de teste e contexto de homologação desabilitado.

## Pendência real

Os seis profissionais assistenciais ativos ainda não possuem `user_accounts`
vinculadas. Por segurança, profissionais sem conta ativa não aparecem como
destinatários, pois não poderiam receber a notificação individual nem operar a
caixa de recebidos. A homologação real depende da criação/vinculação dessas
contas e de um paciente real com ciclo aberto.

## Interface

- rota `/encaminhamentos` e entrada de navegação autorizada;
- filtros Todos, Enviados e Recebidos, além de situação;
- pesquisa de paciente no contrato real;
- seleção de especialidade ativa;
- triagem e atribuição somente a profissional ativo com conta vinculada;
- detalhe, última providência e histórico persistido;
- estados de carregamento, vazio, erro e indisponibilidade de destinatário.
