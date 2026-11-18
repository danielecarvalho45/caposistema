-- CAPO: suíte interna de isolamento lógico sem INSERT/UPDATE/DELETE.
-- EXECUTAR com acesso de manutenção autorizado; os contextos de auth.uid()
-- são simulados apenas na transação local da própria instrução.
DO $audit$
DECLARE
  v_test_user uuid;
  v_real_user uuid;
  v_real_patient uuid;
  v_test_patient uuid;
  v_real_prof uuid;
  v_test_prof uuid;
  v_options jsonb;
  v_total integer;
  v_test_total integer;
  v_family_total integer;
  v_denied boolean;
  v_notification record;
  v_source_patient uuid;
  v_is_test boolean;
BEGIN
  SELECT auth_user_id INTO v_test_user FROM public.user_accounts
    WHERE username='manuteste' AND is_active AND is_homologation_account LIMIT 1;
  SELECT ua.auth_user_id INTO v_real_user
    FROM public.user_accounts ua
    JOIN public.user_roles ur ON ur.user_account_id=ua.id
    JOIN public.app_roles ar ON ar.id=ur.role_id
    WHERE ua.is_active AND NOT ua.is_homologation_account AND ar.code='administrador'
    LIMIT 1;
  SELECT id INTO v_real_patient FROM public.patients WHERE NOT is_test LIMIT 1;
  SELECT id INTO v_test_patient FROM public.patients WHERE is_test LIMIT 1;
  SELECT id INTO v_real_prof FROM public.professionals
    WHERE status='ativo' AND is_professional AND NOT is_homologation_profile LIMIT 1;
  SELECT simulated_professional_id INTO v_test_prof
    FROM public.homologation_contexts hc
    JOIN public.user_accounts ua ON ua.id=hc.actor_account_id
    WHERE ua.username='manuteste';
  IF v_test_user IS NULL OR v_real_user IS NULL OR v_real_patient IS NULL OR
     v_test_patient IS NULL OR v_real_prof IS NULL OR v_test_prof IS NULL THEN
    RAISE EXCEPTION 'Pré-condições do teste não atendidas';
  END IF;

  PERFORM set_config('request.jwt.claim.sub',v_test_user::text,true);
  IF public.capo_patient_visible_in_current_context(v_real_patient) THEN
    RAISE EXCEPTION 'VAZAMENTO: paciente real visível ao manuteste';
  END IF;
  IF NOT public.capo_patient_visible_in_current_context(v_test_patient) THEN
    RAISE EXCEPTION 'REGRESSÃO: teste não vê paciente de homologação';
  END IF;
  IF private.capo_professional_visible_in_current_context(v_real_prof) THEN
    RAISE EXCEPTION 'VAZAMENTO: profissional real visível no teste';
  END IF;
  IF NOT private.capo_professional_visible_in_current_context(v_test_prof) THEN
    RAISE EXCEPTION 'REGRESSÃO: profissional simulado invisível';
  END IF;

  v_options := public.get_homologation_options_for_interface();
  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_options->'professionals');
  SELECT count(*) INTO v_test_total FROM jsonb_array_elements(v_options->'professionals') item
   WHERE item->>'is_homologation_stub'='true';
  IF v_total<>v_test_total THEN RAISE EXCEPTION 'Catálogo com profissional real'; END IF;

  v_denied:=false;
  BEGIN
    PERFORM public.get_agenda_configuration_for_interface(v_real_prof);
  EXCEPTION WHEN insufficient_privilege THEN v_denied:=true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Configuração de profissional real exposta no teste'; END IF;

  v_denied:=false;
  BEGIN
    PERFORM public.set_homologation_context_for_interface('profissional',v_real_prof,
       NULL,NULL,'Teste negativo do isolamento de perfil profissional');
  EXCEPTION WHEN sqlstate '22023' THEN v_denied:=true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Seleção de profissional real aceita no teste'; END IF;

  v_denied:=false;
  BEGIN
    PERFORM public.create_agenda_period_for_interface(v_real_prof,
      '2026-11-19','2026-11-19','08:00'::time,'08:30'::time,
      'bloqueio','Teste negado',NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_denied:=true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Escrita de agenda real não foi recusada'; END IF;

  FOR v_notification IN SELECT n.patient_id,n.entity_type,n.entity_id
    FROM public.notifications n
    WHERE n.entity_type IN ('family_psychology_appointment','family_psychology_appointments')
  LOOP
    v_source_patient:=private.capo_notification_patient_id(
      v_notification.patient_id,v_notification.entity_type,v_notification.entity_id);
    IF v_source_patient IS NULL OR
       public.capo_patient_visible_in_current_context(v_source_patient) THEN
      RAISE EXCEPTION 'Notificação familiar real exposta ao teste';
    END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub',v_real_user::text,true);
  IF NOT public.capo_patient_visible_in_current_context(v_real_patient) OR
     public.capo_patient_visible_in_current_context(v_test_patient) THEN
    RAISE EXCEPTION 'Visibilidade incorreta em produção';
  END IF;
  IF NOT private.capo_professional_visible_in_current_context(v_real_prof) OR
     private.capo_professional_visible_in_current_context(v_test_prof) THEN
    RAISE EXCEPTION 'Profissionais incorretos em produção';
  END IF;

  SELECT count(*) INTO v_family_total
    FROM public.get_family_psychology_appointments_for_interface('2026-11-10','2026-11-18',NULL);
  IF v_family_total<>(
    SELECT count(*) FROM public.family_psychology_appointments fa
    JOIN public.professionals pr ON pr.id=fa.professional_id
    JOIN public.patients p ON p.id=fa.source_patient_id
    WHERE NOT pr.is_homologation_profile AND NOT p.is_test
      AND (fa.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date
       BETWEEN '2026-11-10' AND '2026-11-18'
  ) THEN RAISE EXCEPTION 'Agenda familiar de produção inconsistente'; END IF;
END $audit$;

-- Preservação estrutural e dados sem nomes ou identificadores pessoais.
SELECT
 (SELECT count(*) FROM public.patients WHERE NOT is_test) real_patients,
 (SELECT count(*) FROM public.patients WHERE is_test) test_patients,
 (SELECT count(*) FROM public.patient_appointments pa
   JOIN public.patients pt ON pt.id=pa.patient_id
   JOIN public.professionals pr ON pr.id=pa.professional_id
   WHERE pt.is_test IS DISTINCT FROM pr.is_homologation_profile) mixed_appointments,
 (SELECT count(*) FROM public.agenda_blocks WHERE is_active AND block_type='bloqueio') general_blocks,
 (SELECT count(*) FROM public.agenda_blocks WHERE is_active AND block_type='visita_domiciliar') home_visit_blocks;
