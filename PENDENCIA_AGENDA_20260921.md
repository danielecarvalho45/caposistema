# 🟡 PENDÊNCIA SQL — Agenda / Agendamento

O frontend já integra `get_agenda_for_interface` e oferece leitura real em
Dia, Semana e Mês. Os writers abaixo não existem nos contratos locais e não
foram inferidos nem criados.

| Contrato necessário | Input mínimo | Output mínimo | Regra funcional | Perfis afetados |
|---|---|---|---|---|
| Consultar horários disponíveis | especialidade, profissional, data, tipo de atendimento | horários autorizados e disponibilidade | retornar somente slots válidos, considerando agenda, bloqueios e exceções | Gestor, Coordenador, Administrativo Operacional, Profissional |
| Criar agendamento | paciente, especialidade, profissional, slot, tipo, origem e observação administrativa opcional | agendamento criado e estado atual | validar permissão e disponibilidade atomicamente; não criar ciclo automaticamente | Gestor/Administrativo autorizados |
| Registrar presença ou falta | agendamento, resultado e observação mínima quando exigida | agendamento atualizado e pendência derivada | falta alimenta Faltosos, nunca Busca Ativa | Profissional e operação autorizada |
| Criar retorno/remarcar | agendamento de origem, novo slot e motivo/origem | novo vínculo de agendamento e estado do anterior | preservar histórico e evitar duplicidade | Profissional e Administrativo autorizados |
| Gerenciar bloqueios/exceções | profissional, período, tipo, justificativa e orientação de remanejamento | alteração registrada e agenda afetada | alteração própria e solicitação estrutural à Coordenação são fluxos distintos | Profissional, Coordenador, Gestor |

Até a disponibilização desses contratos pelo CHAT SQL/Supabase, a interface
permanece somente leitura e não simula persistência.
