-- CAPO: impedir novos cadastros/edições sem contato válido (principal ou alternativo).
-- O banco possui cadastros históricos ainda incompletos; NOT VALID preserva
-- essas linhas sem reescrita, mas exige contato válido em INSERT/UPDATE futuros.
-- Regra de segurança complementar à validação em PatientsPage.tsx.
-- Idempotente porque a restrição foi aplicada ao Supabase oficial anteriormente.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.patients'::regclass
      AND conname='capo_patient_contact_required'
  ) THEN
    ALTER TABLE public.patients
    ADD CONSTRAINT capo_patient_contact_required
    CHECK (
      (
        nullif(btrim(phone), '') IS NOT NULL
        OR nullif(btrim(phone_secondary), '') IS NOT NULL
      )
      AND (
        nullif(btrim(phone), '') IS NULL
        OR length(regexp_replace(phone, '[^0-9]', '', 'g')) IN (10, 11)
        OR (
          length(regexp_replace(phone, '[^0-9]', '', 'g')) IN (12, 13)
          AND left(regexp_replace(phone, '[^0-9]', '', 'g'), 2) = '55'
        )
      )
      AND (
        nullif(btrim(phone_secondary), '') IS NULL
        OR length(regexp_replace(phone_secondary, '[^0-9]', '', 'g')) IN (10, 11)
        OR (
          length(regexp_replace(phone_secondary, '[^0-9]', '', 'g')) IN (12, 13)
          AND left(regexp_replace(phone_secondary, '[^0-9]', '', 'g'), 2) = '55'
        )
      )
    ) NOT VALID;
  END IF;
END $migration$;
