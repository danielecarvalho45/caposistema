-- Serializar bloqueios de visita com o mesmo lock da RPC canônica
-- create_agenda_block_for_interface e manter lock adicional por data/profissional.
DO $migration$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_definition
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='manage_social_home_visits_for_interface';
  IF v_definition IS NULL THEN RAISE EXCEPTION 'RPC de visitas não localizada'; END IF;
  IF v_definition NOT LIKE '%pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_professional::text||p_date::text,0))%' THEN
    RAISE EXCEPTION 'Lock original não localizado; revisão manual necessária';
  END IF;
  v_definition:=replace(v_definition,
    'PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_professional::text||p_date::text,0));',
    'PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_config::text,0));' || chr(10) ||
    '   PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_professional::text||p_date::text,0));');
  EXECUTE v_definition;
END $migration$;
