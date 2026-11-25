-- CAPO: compatibilidade global do fluxo de remarcação solicitado por link.
-- Não altera consultas de pacientes, funções, agendas, ambientes ou permissões.
-- Preserva os valores já autorizados e acrescenta somente 'paciente_link'.
DO $capo$
DECLARE v_definition text;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO v_definition
 FROM pg_constraint
 WHERE conrelid='public.patient_appointments'::regclass
   AND conname='patient_appointments_reschedule_origin_check'
   AND contype='c';
 IF v_definition IS NULL THEN
   RAISE EXCEPTION 'Restrição original não localizada: manutenção interrompida.';
 END IF;
 IF v_definition NOT LIKE '%manual%'
    OR v_definition NOT LIKE '%bloqueio_agenda%'
    OR v_definition NOT LIKE '%alteracao_agenda%'
    OR v_definition NOT LIKE '%faltoso%' THEN
   RAISE EXCEPTION 'Restrição atual diferente do contrato auditado: manutenção interrompida.';
 END IF;
END
$capo$;

ALTER TABLE public.patient_appointments
  DROP CONSTRAINT patient_appointments_reschedule_origin_check;

ALTER TABLE public.patient_appointments
  ADD CONSTRAINT patient_appointments_reschedule_origin_check
  CHECK (
    reschedule_origin IS NULL
    OR reschedule_origin IN (
      'manual',
      'bloqueio_agenda',
      'alteracao_agenda',
      'faltoso',
      'paciente_link'
    )
  );
