-- CAPO: verificação somente leitura da substituição de bloqueio geral e grupos da Psicologia.
-- Sem login simulado, INSERT, UPDATE, DELETE ou alteração de agendas.
WITH contract AS (
 SELECT proname, pg_get_functiondef(p.oid) src
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND proname IN (
  'create_agenda_period_for_interface',
  'get_psychology_group_sessions_for_interface',
  'book_psychology_group_participant_for_interface',
  'manage_social_home_visits_for_interface'
 )
)
SELECT
  (SELECT src LIKE '%planned.value->>%' AND src LIKE '%v_replaced_count:=v_replaced_rows%'
     FROM contract WHERE proname='create_agenda_period_for_interface') replace_once_per_date,
  (SELECT src LIKE '%gr.agenda_block_id=ab.id%'
     FROM contract WHERE proname='create_agenda_period_for_interface') preserve_group_schedule,
  (SELECT src LIKE '%requires_remanejamento%'
       AND src LIKE '%family_psychology_appointments%'
       AND src LIKE '%patient_appointments%'
     FROM contract WHERE proname='create_agenda_period_for_interface') affected_patients_guarded,
  (SELECT src LIKE '%''blocked'',EXISTS%'
     FROM contract WHERE proname='get_psychology_group_sessions_for_interface') blocked_group_exposed,
  (SELECT src LIKE '%A sessão em grupo está bloqueada%'
     FROM contract WHERE proname='book_psychology_group_participant_for_interface') blocked_group_booking_denied,
  (SELECT src LIKE '%private.capo_professional_visible_in_current_context%'
     FROM contract WHERE proname='get_psychology_group_sessions_for_interface') group_read_isolated,
  (SELECT src LIKE '%private.capo_professional_visible_in_current_context%'
     FROM contract WHERE proname='book_psychology_group_participant_for_interface') group_write_isolated,
  (SELECT md5(src) FROM contract WHERE proname='manage_social_home_visits_for_interface') home_visits_definition_hash,
  (SELECT count(*) FROM public.agenda_blocks WHERE is_active AND block_type='visita_domiciliar') active_visit_blocks,
  (SELECT count(*) FROM public.agenda_blocks WHERE is_active AND block_type='bloqueio') active_general_blocks;
