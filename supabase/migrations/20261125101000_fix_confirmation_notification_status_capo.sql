-- CAPO | Correção cirúrgica 25/11/2026
-- Altera exclusivamente status='resolvida' para status='resolvido'
-- nos encerramentos das notificações dos fluxos de confirmação e remarcação.
-- Preserva função original, assinatura, SECURITY DEFINER, search_path, grants e triggers.
DO $capo_fix$
DECLARE
  v_sig text;
  v_original text;
  v_patched text;
  v_count integer;
BEGIN
  FOREACH v_sig IN ARRAY ARRAY[
    'public.capo_close_unanswered_on_manual_confirmation()',
    'public.respond_appointment_confirmation_link(text,text)',
    'public.respond_family_psychology_confirmation_link(text,text)',
    'public.rebook_patient_link_cancellation_for_interface(uuid,uuid,timestamp with time zone,text)',
    'public.rebook_family_link_cancellation_for_interface(uuid,timestamp with time zone)'
  ] LOOP
    SELECT pg_get_functiondef(to_regprocedure(v_sig)) INTO v_original;
    IF v_original IS NULL THEN
      RAISE EXCEPTION 'CAPO: função ausente: %', v_sig;
    END IF;
    v_count := (length(v_original)-length(replace(v_original, 'status=''resolvida''', ''))) / length('status=''resolvida''');
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'CAPO: esperado exatamente um valor incompatível em %, encontrado %', v_sig, v_count;
    END IF;
    v_patched := replace(v_original, 'status=''resolvida''', 'status=''resolvido''');
    EXECUTE v_patched;
  END LOOP;
END
$capo_fix$;