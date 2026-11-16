-- CAPO: dados operacionais de tipo de consulta e resposta pelo link
-- nos cartões autorizados que já alimentam a grade oficial.
DO $migration$
DECLARE v_definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO v_definition FROM pg_proc
 WHERE pronamespace='public'::regnamespace
 AND proname='get_family_psychology_agenda_cards_for_interface';
 IF v_definition IS NULL OR v_definition NOT LIKE '%' || '''last_notice_result''' || '%' THEN
   RAISE EXCEPTION 'Contrato atual de cartões de familiares não localizado.';
 END IF;
 v_definition:=replace(v_definition,
  '''last_notice_result'',(',
  '''appointment_kind'',(
     select fa.appointment_kind from public.family_psychology_appointments fa
     where fa.id=a.appointment_id),
   ''confirmation_decision'',(
     select l.decision from public.family_psychology_confirmation_links l
     where l.appointment_id=a.appointment_id and l.revoked_at is null
     order by l.issued_at desc,l.id desc limit 1),
   ''last_notice_result'',(');
 EXECUTE v_definition;
END $migration$;
