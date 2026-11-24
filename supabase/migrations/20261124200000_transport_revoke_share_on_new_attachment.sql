-- Proteção adicional: nova documentação revoga links anteriores.
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
 -- Invalidate outstanding external shares when new documents are added.
 update public.transport_document_shares set revoked_at=clock_timestamp()
 where request_id=p_request_id and revoked_at is null;
 return jsonb_build_object('success',true,'request_id',p_request_id);
end;$function$
