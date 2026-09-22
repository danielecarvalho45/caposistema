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
