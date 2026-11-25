-- CAPO Transporte: modalidade de link direto com validade fixa de 24 horas.
-- Links antigos com PIN permanecem como modalidade "pin", sem migração ou exposição.
alter table public.transport_document_shares
  add column if not exists access_mode text not null default 'pin';
alter table public.transport_document_shares
  drop constraint if exists transport_document_shares_access_mode_check;
alter table public.transport_document_shares
  add constraint transport_document_shares_access_mode_check
  check (access_mode in ('pin','direct_24h'));

create or replace function public.create_transport_direct_share_for_interface(p_request_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','pg_temp'
as $function$
declare
  v_user uuid;
  v_request public.transport_requests%rowtype;
  v_token text;
  v_expire timestamptz;
begin
  if auth.uid() is null
    or not coalesce(public.has_accepted_current_legal_term(), false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Acesso restrito ao Administrativo e Gestor.' using errcode='42501';
  end if;
  select id into v_user from public.user_accounts
  where auth_user_id=auth.uid() and is_active limit 1;
  if v_user is null then raise exception 'Conta inativa.' using errcode='42501'; end if;

  select * into v_request from public.transport_requests
    where id=p_request_id for update;
  if v_request.id is null then raise exception 'Solicitação não encontrada.'; end if;
  perform public.capo_assert_patient_write_context(v_request.patient_id);
  if v_request.status not in ('confirmado','realizado')
     or v_request.request_pdf_path is null or v_request.pdf_prepared_at is null then
    raise exception 'Confirme o PDF oficial antes de compartilhar.';
  end if;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expire:=clock_timestamp()+interval '24 hours';
  update public.transport_document_shares
     set revoked_at=clock_timestamp()
   where request_id=p_request_id and revoked_at is null;
  insert into public.transport_document_shares
    (request_id,token_hash,pin_hash,expires_at,created_by,access_mode)
  values
    (p_request_id,encode(extensions.digest(v_token,'sha256'),'hex'),
     encode(extensions.digest(extensions.gen_random_bytes(32),'sha256'),'hex'),
     v_expire,v_user,'direct_24h');

  return jsonb_build_object('token',v_token,'expires_at',v_expire,'access_mode','direct_24h');
end;
$function$;

create or replace function public.open_transport_direct_share_for_edge(p_token text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','extensions','pg_temp'
as $function$
declare
  v_share public.transport_document_shares%rowtype;
  v_pdf text;
  v_attachments jsonb;
begin
  -- Chamável somente pela Edge Function com service_role, nunca pelo navegador.
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;

  select * into v_share from public.transport_document_shares
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and access_mode='direct_24h'
    for update;
  if v_share.id is null or v_share.revoked_at is not null
     or v_share.expires_at<=clock_timestamp() then return null; end if;

  select request_pdf_path into v_pdf from public.transport_requests
    where id=v_share.request_id and request_pdf_path is not null
      and pdf_prepared_at is not null and status not in ('cancelado');
  if v_pdf is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object('name',display_name,'path',storage_path)
     order by uploaded_at),'[]'::jsonb) into v_attachments
    from public.transport_document_attachments
    where request_id=v_share.request_id;

  update public.transport_document_shares
    set accessed_at=clock_timestamp(),access_count=access_count+1
    where id=v_share.id;
  return jsonb_build_object('documents',
    jsonb_build_array(jsonb_build_object('name','Solicitação oficial de Transporte.pdf','path',v_pdf))||v_attachments,
    'expires_at',v_share.expires_at);
end;
$function$;

revoke all on function public.create_transport_direct_share_for_interface(uuid) from public, anon;
grant execute on function public.create_transport_direct_share_for_interface(uuid) to authenticated;
revoke all on function public.open_transport_direct_share_for_edge(text) from public, anon, authenticated;
grant execute on function public.open_transport_direct_share_for_edge(text) to service_role;
