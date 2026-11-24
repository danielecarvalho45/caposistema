-- VERDE 24/11/2026: anexos PDF e compartilhamento temporário externo do Transporte.
-- Somente o Gestor/Titular e AO criam/revogam links; destinatário não recebe login CAPO.
-- PDF e anexos permanecem no bucket PRIVADO capo-documents.
create table if not exists public.transport_document_attachments (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.transport_requests(id) on delete cascade,
 storage_path text not null unique,
 display_name text not null check(length(display_name) between 1 and 160),
 uploaded_at timestamptz not null default now(),
 uploaded_by uuid not null references public.user_accounts(id)
);
alter table public.transport_document_attachments enable row level security;
revoke all on public.transport_document_attachments from public,anon,authenticated;
create table if not exists public.transport_document_shares (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.transport_requests(id) on delete cascade,
 token_hash text not null unique,
 pin_hash text not null,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 created_by uuid not null references public.user_accounts(id),
 revoked_at timestamptz,
 failed_attempts int not null default 0,
 last_failed_at timestamptz,
 accessed_at timestamptz,
 access_count int not null default 0
);
create index if not exists transport_document_shares_request_idx on public.transport_document_shares(request_id);
alter table public.transport_document_shares enable row level security;
revoke all on public.transport_document_shares from public,anon,authenticated;
CREATE OR REPLACE FUNCTION private.capo_storage_document_access(p_name text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'storage'
AS $function$
declare
  v_transport_id uuid;
  v_dentistry_id uuid;
  v_nutrition_id uuid;
  v_professional_id uuid := public.capo_effective_professional_id();
begin
  if auth.uid() is null then
    return false;
  end if;

  v_transport_id := public.capo_storage_path_uuid(p_name,'transport');
  v_dentistry_id := public.capo_storage_path_uuid(p_name,'dentistry');
  v_nutrition_id := public.capo_storage_path_uuid(p_name,'nutrition');

  if p_action='insert' then
    if v_transport_id is not null then
      return (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
        and exists (
          select 1
          from public.transport_requests tr
          where tr.id=v_transport_id
            and public.capo_patient_visible_in_current_context(tr.patient_id)
            and tr.status in ('solicitado','confirmado')
        );
    end if;

    if v_dentistry_id is not null then
      return exists (
        select 1
        from public.referrals r
        where r.id=v_dentistry_id
          and lower(r.destination)=any(array[
            'odontologia',
            'odontologia - prefeitura',
            'odontologia - secretaria municipal de saúde',
            'odontologia - secretaria municipal de saude'
          ])
          and r.requesting_professional_id=v_professional_id
          and public.is_authorized_external_dentistry_issuer(v_professional_id)
          and public.capo_patient_visible_in_current_context(r.patient_id)
      );
    end if;

    if v_nutrition_id is not null then
      return exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id=v_nutrition_id
          and d.professional_id=v_professional_id
          and public.nutrition_professional_has_patient_scope(v_professional_id,d.patient_id)
          and public.capo_patient_visible_in_current_context(d.patient_id)
      );
    end if;

    return false;
  end if;

  if p_action='read' then
    if v_transport_id is not null then
      return exists (
        select 1
        from public.transport_requests tr
        where tr.id=v_transport_id
          and public.capo_patient_visible_in_current_context(tr.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              public.has_app_role('profissional')
              and exists (
                select 1
                from public.get_effective_professional_capabilities(v_professional_id) c(capability_code)
                where c.capability_code='preencher_solicitacao_transporte'
              )
              and exists (
                select 1
                from public.social_followup_cycles sfc
                where sfc.patient_id=tr.patient_id
                  and sfc.professional_id=v_professional_id
                  and sfc.status='ativo'
              )
            )
          )
      );
    end if;

    if v_dentistry_id is not null then
      return exists (
        select 1
        from public.referrals r
        where r.id=v_dentistry_id
          and public.capo_patient_visible_in_current_context(r.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              r.requesting_professional_id=v_professional_id
              and public.is_authorized_external_dentistry_issuer(v_professional_id)
            )
          )
      );
    end if;

    if v_nutrition_id is not null then
      return exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id=v_nutrition_id
          and public.capo_patient_visible_in_current_context(d.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('coordenador')
            or d.professional_id=v_professional_id
            or (
              public.has_app_role('administrativo_operacional')
              and exists (
                select 1
                from public.nutrition_document_deliveries dl
                where dl.document_id=d.id
                  and dl.mode='administrativo'
              )
            )
          )
      );
    end if;

    return false;
  end if;

  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_transport_share_for_interface(p_request_id uuid, p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare v_user uuid;v_request public.transport_requests%rowtype;v_token text;v_pin text;v_expire timestamptz;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) or
 not(public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
  raise exception 'Acesso restrito ao Administrativo e Gestor.' using errcode='42501';
 end if;
 select id into v_user from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
 if v_user is null then raise exception 'Conta inativa.' using errcode='42501';end if;
 select * into v_request from public.transport_requests where id=p_request_id for update;
 if v_request.id is null then raise exception 'Solicitação não encontrada.';end if;
 perform public.capo_assert_patient_write_context(v_request.patient_id);
 if v_request.status not in ('confirmado','realizado') or
 v_request.request_pdf_path is null or v_request.pdf_prepared_at is null then
  raise exception 'Confirme e prepare o PDF oficial antes de compartilhar.';
 end if;
 if p_days not between 1 and 7 then raise exception 'Validade permitida: 1 a 7 dias.';end if;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 v_pin:=lpad((floor(random()*100000000))::int::text,8,'0');
 v_expire:=clock_timestamp()+make_interval(days=>p_days);
 update public.transport_document_shares set revoked_at=clock_timestamp()
 where request_id=p_request_id and revoked_at is null;
 insert into public.transport_document_shares(request_id,token_hash,pin_hash,expires_at,created_by)
 values(p_request_id,encode(extensions.digest(v_token,'sha256'),'hex'),
 encode(extensions.digest(v_pin||':'||v_token,'sha256'),'hex'),v_expire,v_user);
 return jsonb_build_object('token',v_token,'pin',v_pin,'expires_at',v_expire);
end;$function$
;

CREATE OR REPLACE FUNCTION public.list_transport_attachments_for_interface(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_patient uuid;v_result jsonb;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
 or not(public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) 
 or not exists(select 1 from public.user_accounts where auth_user_id=auth.uid() and is_active) then
  raise exception 'Acesso não autorizado.' using errcode='42501';
 end if;
 select patient_id into v_patient from public.transport_requests where id=p_request_id;
 if v_patient is null then raise exception 'Solicitação não encontrada.';end if;
 perform public.capo_assert_patient_read_context(v_patient);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',display_name,'storage_path',storage_path,'uploaded_at',uploaded_at)
 order by uploaded_at),'[]'::jsonb) into v_result
 from public.transport_document_attachments where request_id=p_request_id;
 return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.open_transport_share_for_edge(p_token text, p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare v_share public.transport_document_shares%rowtype;v_pdf text;v_attachments jsonb;
begin
 -- Recurso exclusivo do Edge Function com service_role; nunca expor pelo navegador.
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
 and auth.role() is distinct from 'service_role' then
  raise exception 'Acesso negado.' using errcode='42501';
 end if;
 if p_token is null or length(p_token)<>64 or p_token !~ '^[a-f0-9]{64}$'
 or p_pin is null or p_pin !~ '^[0-9]{8}$' then return null;end if;
 select * into v_share from public.transport_document_shares
 where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if v_share.id is null or v_share.revoked_at is not null or v_share.expires_at<=clock_timestamp() then return null;end if;
 if v_share.failed_attempts>=5 and v_share.last_failed_at>clock_timestamp()-interval '15 minutes' then return null;end if;
 if v_share.pin_hash<>encode(extensions.digest(p_pin||':'||p_token,'sha256'),'hex') then
  update public.transport_document_shares
   set failed_attempts=case when last_failed_at<clock_timestamp()-interval '15 minutes' then 1 else failed_attempts+1 end,
   last_failed_at=clock_timestamp() where id=v_share.id;
  return null;
 end if;
 select request_pdf_path into v_pdf from public.transport_requests
 where id=v_share.request_id and request_pdf_path is not null and pdf_prepared_at is not null
 and status not in ('cancelado');
 if v_pdf is null then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',display_name,'path',storage_path)
 order by uploaded_at),'[]'::jsonb) into v_attachments
 from public.transport_document_attachments where request_id=v_share.request_id;
 update public.transport_document_shares set failed_attempts=0,accessed_at=clock_timestamp(),access_count=access_count+1
 where id=v_share.id;
 return jsonb_build_object('documents',jsonb_build_array(jsonb_build_object('name','Solicitação oficial de Transporte.pdf','path',v_pdf))||v_attachments,
 'expires_at',v_share.expires_at);
end;$function$
;

CREATE OR REPLACE FUNCTION public.register_transport_attachment_for_interface(p_request_id uuid, p_storage_path text, p_display_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'storage', 'pg_temp'
AS $function$
declare v_user uuid;v_request public.transport_requests%rowtype;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) or
 not(public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
  raise exception 'Sem permissão para anexar documentos.' using errcode='42501';
 end if;
 select id into v_user from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
 if v_user is null then raise exception 'Conta inativa.' using errcode='42501';end if;
 select * into v_request from public.transport_requests where id=p_request_id for update;
 if v_request.id is null then raise exception 'Solicitação não encontrada.';end if;
 perform public.capo_assert_patient_write_context(v_request.patient_id);
 if v_request.status not in ('solicitado','confirmado') or v_request.external_forwarded_at is not null then
  raise exception 'Anexos permitidos apenas antes do encaminhamento externo.';
 end if;
 if p_storage_path not like 'transport/'||p_request_id::text||'/anexos/%'
  or p_storage_path !~ '^transport/[0-9a-f-]{36}/anexos/[0-9a-f-]{36}[.]pdf$'
  or lower(storage.extension(p_storage_path))<>'pdf' then
  raise exception 'Caminho de anexo PDF inválido.';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='capo-documents' and name=p_storage_path) then
  raise exception 'O arquivo ainda não está no armazenamento seguro.';
 end if;
 if length(trim(p_display_name))<1 or length(trim(p_display_name))>160 then
  raise exception 'Nome de documento inválido.';
 end if;
 if (select count(*) from public.transport_document_attachments where request_id=p_request_id)>=10 then
  raise exception 'Limite de 10 documentos complementares por solicitação.';
 end if;
 insert into public.transport_document_attachments(request_id,storage_path,display_name,uploaded_by)
 values(p_request_id,p_storage_path,btrim(p_display_name),v_user);
 return jsonb_build_object('success',true,'request_id',p_request_id);
end;$function$
;

CREATE OR REPLACE FUNCTION public.revoke_transport_share_for_interface(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_patient uuid;v_count integer;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) or
 not(public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) or
 not exists(select 1 from public.user_accounts where auth_user_id=auth.uid() and is_active) then
  raise exception 'Acesso negado.' using errcode='42501';
 end if;
 select patient_id into v_patient from public.transport_requests where id=p_request_id;
 if v_patient is null then raise exception 'Solicitação não encontrada.';end if;
 perform public.capo_assert_patient_write_context(v_patient);
 update public.transport_document_shares set revoked_at=clock_timestamp()
 where request_id=p_request_id and revoked_at is null;
 get diagnostics v_count=row_count;
 return jsonb_build_object('success',true,'revoked',v_count);
end;$function$
;
revoke all on function public.register_transport_attachment_for_interface(uuid,text,text) from public,anon;
grant execute on function public.register_transport_attachment_for_interface(uuid,text,text) to authenticated;
revoke all on function public.list_transport_attachments_for_interface(uuid) from public,anon;
grant execute on function public.list_transport_attachments_for_interface(uuid) to authenticated;
revoke all on function public.create_transport_share_for_interface(uuid,integer) from public,anon;
grant execute on function public.create_transport_share_for_interface(uuid,integer) to authenticated;
revoke all on function public.revoke_transport_share_for_interface(uuid) from public,anon;
grant execute on function public.revoke_transport_share_for_interface(uuid) to authenticated;
revoke all on function public.open_transport_share_for_edge(text,text) from public,anon,authenticated;
grant execute on function public.open_transport_share_for_edge(text,text) to service_role;
