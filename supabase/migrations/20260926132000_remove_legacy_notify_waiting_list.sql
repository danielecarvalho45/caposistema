-- Bloco 2B — limpeza da automação legada de fila.
-- A notificação de vaga vigente é gerada por
-- capo_notify_waiting_vacancy_from_appointment() em patient_appointments.
-- notify_waiting_list() dependia de estados inexistentes da waiting_list
-- e não possuía trigger ativo.

drop function if exists public.notify_waiting_list();
