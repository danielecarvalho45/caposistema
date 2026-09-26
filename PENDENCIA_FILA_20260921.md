# 🟡 PENDÊNCIA SQL — Fila / Pendências

O frontend integra `get_pending_items_for_interface` em modo somente leitura.
O trigger `notify_waiting_list()` é interno e não oferece ações de fila ao
navegador.

| Contrato necessário | Input mínimo | Output mínimo | Regra funcional | Perfis afetados |
|---|---|---|---|---|
| Abrir contexto de uma pendência | tipo, tabela/origem e `context_id` | rota/módulo e registro autorizado | resolver no backend o destino permitido sem expor tabelas arbitrárias | Administrativo Operacional |
| Assumir/tratar pendência | pendência e responsável | estado atual, responsável e histórico | validar capacidade e impedir dupla atribuição concorrente | Administrativo Operacional, Coordenação |
| Resolver pendência | pendência, resultado e observação mínima | estado concluído, autoria e data/hora | retirar automaticamente da fila somente após conclusão do fluxo real | Perfil responsável pelo fluxo |
| Atualizar lista de espera | item e transição autorizada | item atualizado e notificação derivada | trigger de notificação continua automático; frontend não chama trigger | Administrativo Operacional |

Até esses contratos estarem disponíveis no cliente tipado, a fila não oferece
botões que finjam tratamento ou resolução.


## Situação após confronto de 26/09/2026

Este arquivo permanece como **registro histórico de hipóteses de expansão da fila** e não como bloqueador da Tarefa 2.

O estado físico atual já possui contratos específicos para leitura e operações da lista de espera, incluindo:
- `get_waiting_list_for_interface`;
- `add_patient_to_waiting_list_for_interface`;
- `update_waiting_list_status_for_interface`;
- `complete_waiting_list_scheduling_for_interface`.

O Manual Técnico Integrado v5 define, para o Bloco 1/Pendências, 1D-B como corrigido/integrado e deixa como etapa restante somente a homologação real 1E. Portanto, não criar RPC genérica de “assumir pendência” ou “resolver pendência” apenas para satisfazer este registro histórico.

A fila deve encaminhar o trabalho ao fluxo real do módulo de origem quando houver rota/contrato comprovado. Qualquer nova ação genérica só poderá ser criada se documentação normativa vigente passar a exigi-la.

**Classificação atual:** histórico / não bloqueante para a Tarefa 2.
