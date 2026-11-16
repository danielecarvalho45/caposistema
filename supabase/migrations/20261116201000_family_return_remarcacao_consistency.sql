-- CAPO: permitir remarcação transacional de um retorno antes do registro antigo
-- mudar para 'remarcado'; evitar duplicação de retornos diretamente na RPC.
DROP INDEX IF EXISTS public.family_psychology_return_source_unique;
DO $migration$
DECLARE v_definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO v_definition FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='create_family_psychology_return_for_interface';
 IF v_definition IS NULL THEN
   RAISE EXCEPTION 'RPC de retorno de familiar não encontrada.';
 END IF;
 IF v_definition NOT LIKE '%PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);%' THEN
   RAISE EXCEPTION 'Contrato de retorno mudou; revisão manual exigida.';
 END IF;
 v_definition:=replace(v_definition,
 'PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);',
 $line$IF EXISTS (
    SELECT 1 FROM public.family_psychology_appointments previous_return
    WHERE previous_return.return_from_id=v_old.id
      AND previous_return.attendance_status NOT IN ('cancelado','remarcado')
  ) THEN
    RAISE EXCEPTION 'Já existe retorno ativo vinculado a este atendimento.' USING errcode='22023';
  END IF;
  PERFORM public.capo_assert_patient_write_context(v_old.source_patient_id);$line$);
 EXECUTE v_definition;
END $migration$;
