-- CAPO Transporte — reutilização segura de links diretos de 24 horas (25/11/2026).
-- Token legível apenas em esquema privado, acesso exclusivamente via RPC autorizada.
-- Links emitidos ANTES desta migração não serão revogados nem expostos.
create schema if not exists capo_private;
revoke all on schema capo_private from public, anon, authenticated;
create table if not exists capo_private.transport_share_tokens (
  share_id uuid primary key references public.transport_document_shares(id) on delete cascade,
  token text not null check (token ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table capo_private.transport_share_tokens enable row level security;
revoke all on capo_private.transport_share_tokens from public, anon, authenticated;
create index if not exists transport_document_shares_request_direct_idx
  on public.transport_document_shares(request_id, created_at desc)
  where access_mode = 'direct_24h';

create or replace function public.get_transport_direct_share_for_interface(p_request_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','capo_private','pg_temp'
as $function$
declare
  v_user uuid;
  v_request public.transport_requests%rowtype;
  v_token text;
  v_expires timestamptz;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Acesso restrito ao Administrativo e Gestor.' using errcode='42501';
  end if;
  select id into v_user from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
  if v_user is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
  select * into v_request from public.transport_requests where id=p_request_id;
  if v_request.id is null then raise exception 'Solicitação não encontrada.'; end if;
  perform public.capo_assert_patient_write_context(v_request.patient_id);
  select t.token,s.expires_at into v_token,v_expires
    from public.transport_document_shares s
    join capo_private.transport_share_tokens t on t.share_id=s.id
   where s.request_id=p_request_id and s.access_mode='direct_24h'
     and s.revoked_at is null and s.expires_at>clock_timestamp()
     and v_request.status in ('confirmado','realizado') 
     and v_request.request_pdf_path is not null and v_request.pdf_prepared_at is not null
   order by s.created_at desc limit 1;
  if v_token is null then return null; end if;
  return jsonb_build_object('token',v_token,'expires_at',v_expires,'reused',true);
end;
$function$;

create or replace function public.create_transport_direct_share_for_interface(p_request_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','capo_private','pg_temp'
as $function$
declare
  v_user uuid;
  v_request public.transport_requests%rowtype;
  v_token text;
  v_expire timestamptz;
  v_share_id uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
     or not(public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Acesso restrito ao Administrativo e Gestor.' using errcode='42501';
  end if;
  select id into v_user from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
  if v_user is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
  select * into v_request from public.transport_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Solicitação não encontrada.'; end if;
  perform public.capo_assert_patient_write_context(v_request.patient_id);
  if v_request.status not in ('confirmado','realizado') or
     v_request.request_pdf_path is null or v_request.pdf_prepared_at is null then
    raise exception 'Confirme e prepare o PDF oficial antes de compartilhar.';
  end if;
  -- Retornar o MESMO link, com prazo original, mesmo após reabrir a interface.
  select t.token,s.expires_at into v_token,v_expire
    from public.transport_document_shares s
    join capo_private.transport_share_tokens t on t.share_id=s.id
   where s.request_id=p_request_id and s.access_mode='direct_24h'
     and s.revoked_at is null and s.expires_at>clock_timestamp()
   order by s.created_at desc limit 1;
  if v_token is not null then
    return jsonb_build_object('token',v_token,'expires_at',v_expire,'reused',true);
  end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expire:=clock_timestamp()+interval '24 hours';
  -- Preservar links antigos (PIN e diretos sem token recuperável) até o vencimento;
  -- novas emissões após esta migração sempre reutilizam o mesmo token.
  insert into public.transport_document_shares(request_id,token_hash,pin_hash,expires_at,created_by,access_mode)
   values(p_request_id,encode(extensions.digest(v_token,'sha256'),'hex'),
    encode(extensions.digest(extensions.gen_random_bytes(32),'sha256'),'hex'),
    v_expire,v_user,'direct_24h') returning id into v_share_id;
  insert into capo_private.transport_share_tokens(share_id,token) values(v_share_id,v_token);
  return jsonb_build_object('token',v_token,'expires_at',v_expire,'reused',false);
end;
$function$;

-- Diferenciar códigos sem revelar documentos ou caminhos dos arquivos.
create or replace function public.open_transport_direct_share_for_edge(p_token text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','pg_temp'
as $function$
declare
  v_share public.transport_document_shares%rowtype;
  v_pdf text;
  v_attachments jsonb;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status','invalid');
  end if;
  select * into v_share from public.transport_document_shares
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and access_mode='direct_24h' for update;
  if v_share.id is null then return jsonb_build_object('status','invalid'); end if;
  if v_share.revoked_at is not null then return jsonb_build_object('status','revoked'); end if;
  if v_share.expires_at<=clock_timestamp() then return jsonb_build_object('status','expired'); end if;

  select request_pdf_path into v_pdf from public.transport_requests
    where id=v_share.request_id and request_pdf_path is not null
      and pdf_prepared_at is not null and status not in ('cancelado');
  if v_pdf is null then return jsonb_build_object('status','unavailable'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',display_name,'path',storage_path)
    order by uploaded_at),'[]'::jsonb) into v_attachments
    from public.transport_document_attachments where request_id=v_share.request_id;
  update public.transport_document_shares set accessed_at=clock_timestamp(),
    access_count=access_count+1 where id=v_share.id;
  return jsonb_build_object('status','ok','documents',
    jsonb_build_array(jsonb_build_object('name','Solicitação oficial de Transporte.pdf','path',v_pdf))||v_attachments,
    'expires_at',v_share.expires_at);
end;
$function$;

revoke all on function public.get_transport_direct_share_for_interface(uuid) from public,anon;
grant execute on function public.get_transport_direct_share_for_interface(uuid) to authenticated;
revoke all on function public.create_transport_direct_share_for_interface(uuid) from public,anon;
grant execute on function public.create_transport_direct_share_for_interface(uuid) to authenticated;
revoke all on function public.open_transport_direct_share_for_edge(text) from public,anon,authenticated;
grant execute on function public.open_transport_direct_share_for_edge(text) to service_role;
