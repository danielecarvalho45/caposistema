-- CAPO 25/11/2026: somente preferência facultativa de remarcação pelo link já existente.
-- Não altera a RPC original de dois argumentos nem os fluxos da família ou da agenda.
ALTER TABLE public.appointment_confirmation_links
  ADD COLUMN IF NOT EXISTS reschedule_preference text;

ALTER TABLE public.appointment_confirmation_links
  ADD CONSTRAINT appointment_confirmation_reschedule_preference_check
  CHECK (reschedule_preference IS NULL OR reschedule_preference IN (
    'proxima_disponivel','apos_15_dias','nao_remarcar'
  ));

-- Sobrecarga EXATA de 3 argumentos, sem DEFAULT: chamadas legadas com 2 args
-- continuam utilizando a função anterior, inalterada.
CREATE OR REPLACE FUNCTION public.respond_appointment_confirmation_link(
  p_token_hash text, p_decision text, p_preference text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $capo$
DECLARE
  v_result jsonb;
  v_link_id uuid;
  v_appointment_id uuid;
  v_label text;
BEGIN
  IF coalesce(auth.jwt()->>'role','') <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE='42501';
  END IF;
  IF p_decision <> 'nao_comparecera'
     OR p_preference IS NULL
     OR p_preference NOT IN ('proxima_disponivel','apos_15_dias','nao_remarcar') THEN
    RETURN jsonb_build_object('success',false,'reason','invalid_preference');
  END IF;

  -- A rotina já homologada executa o cancelamento e cria a notificação.
  -- A preferência só é persistida se toda essa operação tiver êxito.
  v_result := public.respond_appointment_confirmation_link(p_token_hash,p_decision);
  IF coalesce((v_result->>'success')::boolean,false) IS NOT TRUE
     OR coalesce((v_result->>'already_recorded')::boolean,false) IS TRUE THEN
    RETURN v_result;
  END IF;

  SELECT l.id,l.appointment_id INTO v_link_id,v_appointment_id
  FROM public.appointment_confirmation_links l
  WHERE l.token_hash=p_token_hash
    AND l.decision='nao_comparecera'
  FOR UPDATE;
  IF v_link_id IS NULL THEN
    RAISE EXCEPTION 'Resposta do link não localizada.' USING ERRCODE='22023';
  END IF;

  UPDATE public.appointment_confirmation_links
    SET reschedule_preference=p_preference
  WHERE id=v_link_id;

  v_label := CASE p_preference
    WHEN 'proxima_disponivel' THEN 'Próxima consulta disponível'
    WHEN 'apos_15_dias' THEN 'Daqui a 15 dias ou após esse período'
    ELSE 'Não desejo remarcar'
  END;

  UPDATE public.notifications
    SET message=concat_ws(E'\n',nullif(message,''),
      'Preferência informada pelo paciente: '||v_label||'.')
  WHERE notification_type='appointment_patient_reschedule'
    AND entity_type='patient_appointments'
    AND entity_id=v_appointment_id
    AND resolved_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação administrativa não localizada; resposta revertida.' USING ERRCODE='22023';
  END IF;

  RETURN v_result||jsonb_build_object('reschedule_preference',p_preference);
END;
$capo$;

REVOKE ALL ON FUNCTION public.respond_appointment_confirmation_link(text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_appointment_confirmation_link(text,text,text)
  TO service_role;
