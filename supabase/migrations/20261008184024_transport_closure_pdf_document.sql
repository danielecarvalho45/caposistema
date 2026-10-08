alter table public.transport_requests
  add column if not exists closure_pdf_path text,
  add column if not exists closure_pdf_generated_at timestamptz,
  add column if not exists closure_pdf_generated_by uuid references public.user_accounts(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.transport_requests'::regclass
      and conname='transport_requests_closure_pdf_consistency'
  ) then
    alter table public.transport_requests
      add constraint transport_requests_closure_pdf_consistency
      check (
        (closure_pdf_path is null and closure_pdf_generated_at is null and closure_pdf_generated_by is null)
        or
        (closure_pdf_path is not null and closure_pdf_generated_at is not null and closure_pdf_generated_by is not null)
      );
  end if;
end $$;

create or replace function public.complete_transport_request_with_closure_pdf_for_interface(
  p_request_id uuid,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','storage','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_patient_id uuid;
  v_status text;
  v_forwarded timestamptz;
  v_path text := btrim(coalesce(p_storage_path,''));
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Administrativo Operacional ou Gestor/Titular pode concluir transporte.' using errcode='42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;

  select tr.patient_id,tr.status,tr.external_forwarded_at
    into v_patient_id,v_status,v_forwarded
  from public.transport_requests tr
  where tr.id=p_request_id
  for update;
  if v_status is null then raise exception 'Solicitação de transporte não encontrada.' using errcode='22023'; end if;

  perform public.capo_assert_patient_write_context(v_patient_id);

  if v_status<>'confirmado' then raise exception 'Somente solicitação confirmada pode ser concluída.' using errcode='22023'; end if;
  if v_forwarded is null then raise exception 'Registre o encaminhamento externo antes da conclusão.' using errcode='22023'; end if;
  if public.capo_storage_path_uuid(v_path,'transport') is distinct from p_request_id then raise exception 'Caminho do PDF de encerramento de transporte inválido.' using errcode='22023'; end if;
  if lower(storage.extension(v_path))<>'pdf' then raise exception 'Somente arquivo PDF é permitido.' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='capo-documents' and o.name=v_path) then
    raise exception 'PDF de encerramento não localizado no armazenamento seguro.' using errcode='22023';
  end if;

  update public.transport_requests
     set status='realizado',
         completed_at=v_now,
         completed_by=v_account_id,
         closure_pdf_path=v_path,
         closure_pdf_generated_at=v_now,
         closure_pdf_generated_by=v_account_id,
         updated_at=v_now
   where id=p_request_id;

  return jsonb_build_object(
    'success',true,'request_id',p_request_id,'action','complete','status','realizado',
    'completed_at',v_now,'closure_pdf_path',v_path,
    'closure_pdf_generated_at',v_now,'closure_pdf_generated_by',v_account_id
  );
end;
$function$;

revoke all on function public.complete_transport_request_with_closure_pdf_for_interface(uuid,text) from public, anon;
grant execute on function public.complete_transport_request_with_closure_pdf_for_interface(uuid,text) to authenticated, service_role;

create or replace function public.get_transport_document_for_interface(p_request_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_request public.transport_requests%rowtype;
  v_allowed boolean := false;
  v_social boolean := false;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;

  select * into v_request from public.transport_requests tr where tr.id=p_request_id;
  if v_request.id is null then raise exception 'Solicitação de transporte não encontrada.' using errcode='22023'; end if;
  perform public.capo_assert_patient_read_context(v_request.patient_id);

  v_social :=
    v_professional_id is not null
    and public.has_app_role('profissional')
    and exists(select 1 from public.get_effective_professional_capabilities(v_professional_id) c where c.capability_code='preencher_solicitacao_transporte')
    and exists(select 1 from public.social_followup_cycles sfc where sfc.patient_id=v_request.patient_id and sfc.professional_id=v_professional_id and sfc.status='ativo');

  v_allowed := public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador')
    or v_social;
  if not v_allowed then raise exception 'Perfil sem autorização para acessar o documento de transporte.' using errcode='42501'; end if;

  return jsonb_build_object(
    'request_id',v_request.id,
    'patient_id',v_request.patient_id,
    'request_pdf_path',v_request.request_pdf_path,
    'request_pdf_generated_at',v_request.request_pdf_generated_at,
    'pdf_prepared_at',v_request.pdf_prepared_at,
    'pdf_available',(v_request.request_pdf_path is not null and v_request.request_pdf_generated_at is not null),
    'closure_pdf_path',v_request.closure_pdf_path,
    'closure_pdf_generated_at',v_request.closure_pdf_generated_at,
    'closure_pdf_available',(v_request.closure_pdf_path is not null and v_request.closure_pdf_generated_at is not null)
  );
end;
$function$;
