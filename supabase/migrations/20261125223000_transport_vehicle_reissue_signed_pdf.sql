alter table public.transport_requests add column if not exists vehicle_pdf_update_pending boolean not null default false;
do $x$
declare s text;
begin
 select pg_get_functiondef(oid) into s from pg_proc where proname='set_transport_vehicle_type_for_interface';
 s:=replace(s,'or v_request.request_pdf_path is not null','or (v_request.request_pdf_path is not null and (not v_admin or v_request.status<>''confirmado'' or v_request.request_pdf_signed_at is null or v_request.pdf_prepared_at is null))');
 s:=replace(s,'or v_request.pdf_prepared_at is not null','');
 s:=replace(s,'set vehicle_type=v_type, updated_at=clock_timestamp()','set vehicle_type=v_type, vehicle_pdf_update_pending=(vehicle_pdf_update_pending or (request_pdf_path is not null and vehicle_type is distinct from v_type)), updated_at=clock_timestamp()');
 execute s;
 select pg_get_functiondef(oid) into s from pg_proc where proname='reissue_transport_pdf_for_interface';
 execute replace(s,'pdf_prepared_at=null,pdf_prepared_by=null,updated_at=v_now','pdf_prepared_at=null,pdf_prepared_by=null,vehicle_pdf_update_pending=false,updated_at=v_now');
 select pg_get_functiondef(oid) into s from pg_proc where proname='get_transport_context_for_interface';
 execute replace(s,'''vehicle_type'',tr.vehicle_type','''vehicle_type'',tr.vehicle_type,''vehicle_pdf_update_pending'',tr.vehicle_pdf_update_pending');
end $x$;