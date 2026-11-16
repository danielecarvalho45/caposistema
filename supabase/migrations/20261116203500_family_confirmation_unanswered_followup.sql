-- CAPO: mesmo prazo de contato manual das confirmações comuns
-- (uma hora da emissão, dentro das 24h anteriores, nunca cancela por ausência).
ALTER TABLE public.family_psychology_confirmation_links
 ADD COLUMN IF NOT EXISTS no_response_alert_at timestamptz;

CREATE OR REPLACE FUNCTION public.capo_notify_unanswered_family_confirmation_links()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_row record; v_count integer:=0;
BEGIN
 FOR v_row IN
  SELECT l.id,l.appointment_id,a.source_patient_id,fm.full_name
  FROM public.family_psychology_confirmation_links l
  JOIN public.family_psychology_appointments a ON a.id=l.appointment_id
  JOIN public.family_members fm ON fm.id=a.family_member_id
  WHERE l.decision IS NULL AND l.revoked_at IS NULL
    AND l.no_response_alert_at IS NULL
    AND l.issued_at<=clock_timestamp()-interval '1 hour'
    AND a.attendance_status='agendado'
    AND a.appointment_date>clock_timestamp()
    AND a.appointment_date<=clock_timestamp()+interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.notification_type='appointment_confirmation_unanswered'
      AND n.entity_type='family_psychology_appointments' AND n.entity_id=a.id
    )
  FOR UPDATE OF l SKIP LOCKED
 LOOP
  INSERT INTO public.notifications(
   notification_type,title,message,target_role,priority,status,
   patient_id,entity_type,entity_id
  ) VALUES (
   'appointment_confirmation_unanswered','Familiar aguardando confirmação',
   format('%s ainda não respondeu ao lembrete. Contate o Familiar/Cuidador; o horário permanece reservado.',v_row.full_name),
   'administrativo_operacional','normal','pendente',
   v_row.source_patient_id,'family_psychology_appointments',v_row.appointment_id
  );
  UPDATE public.family_psychology_confirmation_links
  SET no_response_alert_at=clock_timestamp() WHERE id=v_row.id;
  v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END;
$fn$;
REVOKE ALL ON FUNCTION public.capo_notify_unanswered_family_confirmation_links()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capo_notify_unanswered_family_confirmation_links()
 TO service_role;

-- Remover a pendência de contato manual quando houver resposta real.
DO $migration$
DECLARE v_definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO v_definition
 FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname='respond_family_psychology_confirmation_link';
 IF v_definition IS NULL
   OR v_definition NOT LIKE '%RETURN jsonb_build_object(' || '''success'',true%' THEN
   RAISE EXCEPTION 'RPC de resposta familiar não localizada.';
 END IF;
 v_definition:=replace(v_definition,
   'RETURN jsonb_build_object(' || '''success'',true',
   'UPDATE public.notifications SET status=' || '''resolvida''' ||
   ',resolved_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp())' ||
   ' WHERE notification_type=' || '''appointment_confirmation_unanswered''' ||
   ' AND entity_type=' || '''family_psychology_appointments''' ||
   ' AND entity_id=v_appointment.id AND resolved_at IS NULL;' || chr(10) ||
   ' RETURN jsonb_build_object(' || '''success'',true');
 EXECUTE v_definition;
END $migration$;
-- O job separado não modifica a rotina existente de pacientes comuns.
DO $migration$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM cron.job
   WHERE jobname='capo-notificar-confirmacoes-familiares-sem-resposta'
 ) THEN
  PERFORM cron.schedule(
   'capo-notificar-confirmacoes-familiares-sem-resposta',
   '*/15 * * * *',
   'select public.capo_notify_unanswered_family_confirmation_links()'
  );
 END IF;
END $migration$;
