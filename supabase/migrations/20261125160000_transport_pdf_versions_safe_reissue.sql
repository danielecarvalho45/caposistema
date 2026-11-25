-- CAPO 25/11/2026 | VERDE: versionamento seguro de PDFs já emitidos de Transporte.
-- A versão anterior permanece no Storage; somente solicitações confirmadas,
-- não encaminhadas e sem encerramento podem receber nova versão.
create table if not exists public.transport_pdf_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.transport_requests(id) on delete restrict,
  previous_path text not null,
  previous_generated_at timestamptz,
  previous_generated_by uuid references public.user_accounts(id),
  previous_signed_at timestamptz,
  previous_signed_by uuid references public.user_accounts(id),
  previous_prepared_at timestamptz,
  previous_prepared_by uuid references public.user_accounts(id),
  superseded_at timestamptz not null default clock_timestamp(),
  superseded_by uuid not null references public.user_accounts(id),
  replacement_path text not null,
  unique(request_id, previous_path)
);
create index if not exists idx_transport_pdf_versions_request on public.transport_pdf_versions(request_id,superseded_at desc);
alter table public.transport_pdf_versions enable row level security;
revoke all on table public.transport_pdf_versions from public,anon,authenticated;

create or replace function public.reissue_transport_pdf_for_interface(p_request_id uuid, p_storage_path text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','storage','pg_temp'
as $reissue$
declare
 v_account_id uuid;
 v_request public.transport_requests%rowtype;
 v_path text := btrim(coalesce(p_storage_path,''));
 v_now timestamptz := clock_timestamp();
 v_id uuid;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Somente Gestor/Titular ou Administrativo Operacional autenticado pode atualizar o PDF.' using errcode='42501';
 end if;
 select id into v_account_id from public.user_accounts where auth_user_id=auth.uid() and is_active=true limit 1;
 if v_account_id is null then raise exception 'Conta inativa.' using errcode='42501'; end if;

 select * into v_request from public.transport_requests where id=p_request_id for update;
 if not found then raise exception 'Solicitação de Transporte não encontrada.' using errcode='22023'; end if;
 perform public.capo_assert_patient_write_context(v_request.patient_id);
 if v_request.status <> 'confirmado'
   or v_request.external_forwarded_at is not null
   or v_request.completed_at is not null or v_request.cancelled_at is not null then
   raise exception 'A nova versão só pode ser emitida em solicitação confirmada e ainda não encaminhada.' using errcode='22023';
 end if;
 if v_request.request_pdf_path is null or v_request.request_pdf_generated_at is null
    or v_request.request_pdf_signed_at is null or v_request.pdf_prepared_at is null then
   raise exception 'Para reemitir, o PDF anterior deve estar gerado e confirmado.' using errcode='22023';
 end if;
 if v_request.pdf_details_confirmed_at is null or v_request.periodicity not in ('unica','semanal','quinzenal')
   or nullif(btrim(coalesce(v_request.boarding_address,'')),'') is null then
   raise exception 'Confirme os dados de embarque e periodicidade antes de reemitir.' using errcode='22023';
 end if;
 if v_path=v_request.request_pdf_path or public.capo_storage_path_uuid(v_path,'transport') is distinct from p_request_id
    or lower(storage.extension(v_path))<>'pdf' then
   raise exception 'Caminho da nova versão PDF inválido.' using errcode='22023';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='capo-documents' and name=v_path) then
   raise exception 'O novo PDF não foi encontrado no armazenamento privado.' using errcode='22023';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='capo-documents' and name=v_request.request_pdf_path) then
   raise exception 'O PDF anterior não está disponível; reemissão bloqueada para preservar histórico.' using errcode='22023';
 end if;

 insert into public.transport_pdf_versions(
   request_id,previous_path,previous_generated_at,previous_generated_by,
   previous_signed_at,previous_signed_by,previous_prepared_at,previous_prepared_by,
   superseded_at,superseded_by,replacement_path
 ) values(
   p_request_id,v_request.request_pdf_path,v_request.request_pdf_generated_at,v_request.request_pdf_generated_by,
   v_request.request_pdf_signed_at,v_request.request_pdf_signed_by,v_request.pdf_prepared_at,v_request.pdf_prepared_by,
   v_now,v_account_id,v_path
 ) returning id into v_id;

 -- Invalidar quaisquer links emitidos para a versão anterior.
 update public.transport_document_shares set revoked_at=v_now
 where request_id=p_request_id and revoked_at is null;

 -- A versão nova precisa ser confirmada novamente pela rotina homologada.
 update public.transport_requests set
   request_pdf_path=v_path, request_pdf_generated_at=v_now, request_pdf_generated_by=v_account_id,
   request_pdf_signed_at=null,request_pdf_signed_by=null,
   pdf_prepared_at=null,pdf_prepared_by=null,updated_at=v_now
 where id=p_request_id;

 return jsonb_build_object('success',true,'request_id',p_request_id,'archive_id',v_id,
   'previous_path',v_request.request_pdf_path,'new_path',v_path,
   'requires_pdf_confirmation',true);
end;
$reissue$;

create or replace function public.list_transport_pdf_versions_for_interface(p_request_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $history$
declare v_patient uuid; v_versions jsonb;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
   or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
   or not exists(select 1 from public.user_accounts where auth_user_id=auth.uid() and is_active=true) then
   raise exception 'Acesso administrativo autenticado obrigatório.' using errcode='42501';
 end if;
 select patient_id into v_patient from public.transport_requests where id=p_request_id;
 if v_patient is null then raise exception 'Solicitação não localizada.' using errcode='22023'; end if;
 perform public.capo_assert_patient_read_context(v_patient);
 select coalesce(jsonb_agg(jsonb_build_object(
   'version_id',v.id,'previous_path',v.previous_path,'generated_at',v.previous_generated_at,
   'signed_at',v.previous_signed_at,'superseded_at',v.superseded_at,
   'replacement_path',v.replacement_path
 ) order by v.superseded_at desc),'[]'::jsonb) into v_versions
 from public.transport_pdf_versions v where v.request_id=p_request_id;
 return v_versions;
end;
$history$;
revoke all on function public.reissue_transport_pdf_for_interface(uuid,text) from public,anon;
revoke all on function public.list_transport_pdf_versions_for_interface(uuid) from public,anon;
grant execute on function public.reissue_transport_pdf_for_interface(uuid,text) to authenticated;
grant execute on function public.list_transport_pdf_versions_for_interface(uuid) to authenticated;
