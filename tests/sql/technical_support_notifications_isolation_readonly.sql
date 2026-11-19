-- Ensaio exclusivamente de leitura: isolamento de chamado real entre manuteste e solicitante.
begin read only;
do $test$
declare v_ticket uuid; v_test_auth uuid; v_real_auth uuid; v_current boolean; v_missing text[];
begin
 select tsr.id, request_auth.auth_user_id into v_ticket,v_real_auth
 from public.technical_support_requests tsr
 join public.user_accounts request_auth on request_auth.id=tsr.requester_account_id
 where coalesce(request_auth.is_homologation_account,false)=false
 order by tsr.created_at desc limit 1;
 select auth_user_id into v_test_auth from public.user_accounts where username='manuteste' and is_homologation_account=true and is_active=true;
 if v_ticket is null or v_test_auth is null or v_real_auth is null then
   raise exception 'Cenário de conferência não encontrado.'; end if;
 perform set_config('request.jwt.claim.sub',v_test_auth::text,true);
 select private.capo_support_ticket_visible_in_context(v_ticket) into v_current;
 if v_current is distinct from false then raise exception 'REGRESSÃO: manuteste vê chamado real.'; end if;
 perform set_config('request.jwt.claim.sub',v_real_auth::text,true);
 select private.capo_support_ticket_visible_in_context(v_ticket) into v_current;
 if v_current is distinct from true then raise exception 'REGRESSÃO: solicitante real não vê chamado real.'; end if;
 select array_agg(proname::text) into v_missing from pg_proc
 where pronamespace='public'::regnamespace
 and proname in (
 'get_my_notifications_for_interface','get_my_notifications_by_state_for_interface',
 'get_my_notifications_by_category_for_interface','update_my_notification_for_interface',
 'get_technical_support_requests_for_interface','get_technical_support_requests_detailed_for_interface',
 'get_technical_support_history_for_interface','process_technical_support_request_for_interface',
 'submit_technical_support_test_for_interface')
 and position('private.capo_support_ticket_visible_in_context' in pg_get_functiondef(oid))=0;
 if v_missing is not null then raise exception 'RPC sem filtro de contexto: %',v_missing; end if;
end $test$;
rollback;
