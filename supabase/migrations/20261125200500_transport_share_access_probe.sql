-- Verificação de link de Transporte sem abrir documento nem contar acesso.
create or replace function public.probe_transport_direct_share_for_edge(p_token text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','pg_temp'
as $function$
declare
  v_share public.transport_document_shares%rowtype;
  v_request public.transport_requests%rowtype;
  v_count integer;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status','invalid'); end if;
  select * into v_share from public.transport_document_shares
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and access_mode='direct_24h';
  if v_share.id is null then return jsonb_build_object('status','invalid'); end if;
  if v_share.revoked_at is not null then return jsonb_build_object('status','revoked'); end if;
  if v_share.expires_at<=clock_timestamp() then return jsonb_build_object('status','expired'); end if;
  select * into v_request from public.transport_requests where id=v_share.request_id;
  if v_request.id is null or v_request.request_pdf_path is null
    or v_request.pdf_prepared_at is null or v_request.status='cancelado' then
    return jsonb_build_object('status','unavailable'); end if;
  select count(*) into v_count from public.transport_document_attachments
    where request_id=v_share.request_id;
  return jsonb_build_object('status','ok','document_count',1+v_count,
    'expires_at',v_share.expires_at);
end; $function$;
revoke all on function public.probe_transport_direct_share_for_edge(text) from public,anon,authenticated;
grant execute on function public.probe_transport_direct_share_for_edge(text) to service_role;
