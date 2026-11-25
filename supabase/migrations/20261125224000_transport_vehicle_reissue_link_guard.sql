do $x$
declare s text;
begin
 select pg_get_functiondef(oid) into s from pg_proc where proname='set_transport_vehicle_type_for_interface';
 s:=replace(s,'update public.transport_requests'||chr(10)||'    set vehicle_type=',
 'if v_request.request_pdf_path is not null and v_request.vehicle_type is distinct from v_type then'||chr(10)||
 '    update public.transport_document_shares set revoked_at=clock_timestamp() where request_id=p_request_id and revoked_at is null;'||chr(10)||
 '  end if;'||chr(10)||'  update public.transport_requests'||chr(10)||'    set vehicle_type=');
 execute s;
 select pg_get_functiondef(oid) into s from pg_proc where proname='create_transport_direct_share_for_interface';
 execute replace(s,'v_request.request_pdf_path is null or v_request.pdf_prepared_at is null','v_request.request_pdf_path is null or v_request.pdf_prepared_at is null or v_request.vehicle_pdf_update_pending');
 select pg_get_functiondef(oid) into s from pg_proc where proname='get_transport_direct_share_for_interface';
 execute replace(s,'v_request.request_pdf_path is not null and v_request.pdf_prepared_at is not null','v_request.request_pdf_path is not null and v_request.pdf_prepared_at is not null and not v_request.vehicle_pdf_update_pending');
 select pg_get_functiondef(oid) into s from pg_proc where proname='probe_transport_direct_share_for_edge';
 execute replace(s,'v_request.pdf_prepared_at is null or v_request.status=''cancelado''','v_request.pdf_prepared_at is null or v_request.status=''cancelado'' or v_request.vehicle_pdf_update_pending');
 select pg_get_functiondef(oid) into s from pg_proc where proname='open_transport_direct_share_for_edge';
 execute replace(s,'pdf_prepared_at is not null and status not in (''cancelado'')','pdf_prepared_at is not null and status not in (''cancelado'') and not vehicle_pdf_update_pending');
end $x$;