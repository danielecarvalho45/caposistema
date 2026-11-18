-- CAPO 18/11/2026: extensão de teste de isolamento — nenhuma escrita.
-- O DO usa identidade JWT somente na transação da própria consulta.
DO $audit$
DECLARE
 v_test_user uuid; v_real_user uuid; v_real_prof uuid;
 v_logs jsonb; v_item jsonb; v_patient_id uuid; v_test boolean;
 v_actor_id uuid; v_actor_hom boolean; v_denied boolean:=false;
BEGIN
 SELECT auth_user_id INTO v_test_user FROM public.user_accounts
 WHERE username='manuteste' AND is_active LIMIT 1;
 SELECT ua.auth_user_id INTO v_real_user FROM public.user_accounts ua
 JOIN public.user_roles ur ON ur.user_account_id=ua.id
 JOIN public.app_roles ar ON ar.id=ur.role_id
 WHERE NOT ua.is_homologation_account AND ua.is_active AND ar.code='administrador' LIMIT 1;
 SELECT id INTO v_real_prof FROM public.professionals
 WHERE is_professional AND status='ativo' AND NOT is_homologation_profile LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',v_test_user::text,true);
 BEGIN
   PERFORM count(*) FROM public.get_available_appointment_slots(v_real_prof,'2026-11-19');
 EXCEPTION WHEN insufficient_privilege THEN v_denied:=true;
 END;
 IF NOT v_denied THEN RAISE EXCEPTION 'Homologação consultou horário real'; END IF;
 PERFORM set_config('request.jwt.claim.sub',v_real_user::text,true);
 v_logs:=public.get_audit_logs_for_interface(p_limit=>100);
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_logs->'items') LOOP
   v_patient_id:=nullif(v_item->>'patient_id','')::uuid;
   IF v_patient_id IS NOT NULL THEN
     SELECT is_test INTO v_test FROM public.patients WHERE id=v_patient_id;
     IF v_test IS DISTINCT FROM false THEN
       RAISE EXCEPTION 'Auditoria real inclui paciente de homologação';
     END IF;
   ELSE
     v_actor_id:=nullif(v_item->>'actor_account_id','')::uuid;
     IF v_actor_id IS NOT NULL THEN
       SELECT is_homologation_account INTO v_actor_hom FROM public.user_accounts WHERE id=v_actor_id;
       IF v_actor_hom THEN RAISE EXCEPTION 'Auditoria real inclui evento da conta manuteste'; END IF;
     END IF;
   END IF;
 END LOOP;
END $audit$;
