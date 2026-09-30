create or replace function public.create_nutrition_document_for_management_interface(p_patient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_plan public.nutrition_plans%rowtype;
  v_revision integer;
  v_document_id uuid;
  v_now timestamptz := clock_timestamp();
  v_patient record;
  v_prof record;
  v_authorized boolean;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;

  v_authorized := public.has_app_role('administrador')
    or (public.has_app_role('administrativo_operacional') and public.has_app_role('administrador_tecnico'));
  if not v_authorized then
    raise exception 'Somente Gestor/Titular ou Administrativo Gestor autorizado pode gerar o PDF de plano já preenchido.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);

  select * into v_plan
  from public.nutrition_plans
  where patient_id=p_patient_id and status='current'
  for update;
  if v_plan.id is null then raise exception 'Plano alimentar atual não encontrado.' using errcode='22023'; end if;

  select p.full_name,p.patient_number,p.cms
    into v_patient
  from public.patients p
  where p.id=p_patient_id;

  select pr.full_name,pr.professional_registration
    into v_prof
  from public.professionals pr
  where pr.id=v_plan.professional_id;

  if v_prof.full_name is null then
    raise exception 'Nutricionista autora do plano não encontrada.' using errcode='22023';
  end if;

  select coalesce(max(d.revision_no),0)+1
    into v_revision
  from public.nutrition_plan_documents d
  where d.plan_id=v_plan.id;

  insert into public.nutrition_plan_documents(
    plan_id,patient_id,professional_id,revision_no,template_version,
    patient_name,patient_number,cms,author_name,author_registration,
    plan_snapshot,created_by,created_at
  )
  values(
    v_plan.id,p_patient_id,v_plan.professional_id,v_revision,'1',
    v_patient.full_name,v_patient.patient_number,v_patient.cms,
    v_prof.full_name,v_prof.professional_registration,
    jsonb_build_object(
      'breakfast',v_plan.breakfast,
      'lunch',v_plan.lunch,
      'snack',v_plan.snack,
      'dinner',v_plan.dinner,
      'hydration',v_plan.hydration,
      'nutritional_supplement',v_plan.nutritional_supplement,
      'other_guidance',v_plan.other_guidance,
      'plan_updated_at',v_plan.updated_at
    ),
    v_account_id,v_now
  )
  returning id into v_document_id;

  return jsonb_build_object(
    'success',true,
    'document_id',v_document_id,
    'plan_id',v_plan.id,
    'revision_no',v_revision,
    'professional_id',v_plan.professional_id,
    'created_at',v_now
  );
end;
$function$;

revoke all on function public.create_nutrition_document_for_management_interface(uuid) from public, anon;
grant execute on function public.create_nutrition_document_for_management_interface(uuid) to authenticated;

create or replace function public.register_nutrition_pdf_management_for_interface(
  p_document_id uuid,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','storage','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_doc public.nutrition_plan_documents%rowtype;
  v_path text := btrim(coalesce(p_storage_path,''));
  v_now timestamptz := clock_timestamp();
  v_authorized boolean;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;

  v_authorized := public.has_app_role('administrador')
    or (public.has_app_role('administrativo_operacional') and public.has_app_role('administrador_tecnico'));
  if not v_authorized then
    raise exception 'Perfil sem autorização para registrar PDF nutricional gerencial.' using errcode='42501';
  end if;

  select * into v_doc
  from public.nutrition_plan_documents
  where id=p_document_id
  for update;
  if v_doc.id is null then raise exception 'Documento nutricional não encontrado.' using errcode='22023'; end if;

  perform public.capo_assert_patient_write_context(v_doc.patient_id);

  if public.capo_storage_path_uuid(v_path,'nutrition') is distinct from p_document_id then
    raise exception 'Caminho do PDF nutricional inválido.' using errcode='22023';
  end if;
  if lower(storage.extension(v_path))<>'pdf' then
    raise exception 'Somente arquivo PDF é permitido.' using errcode='22023';
  end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id='capo-documents' and o.name=v_path
  ) then
    raise exception 'Arquivo PDF não localizado no armazenamento seguro.' using errcode='22023';
  end if;

  update public.nutrition_plan_documents
     set pdf_path=v_path,
         pdf_generated_at=v_now,
         pdf_generated_by=v_account_id
   where id=p_document_id;

  return jsonb_build_object(
    'success',true,
    'document_id',p_document_id,
    'pdf_path',v_path,
    'pdf_generated_at',v_now
  );
end;
$function$;

revoke all on function public.register_nutrition_pdf_management_for_interface(uuid,text) from public, anon;
grant execute on function public.register_nutrition_pdf_management_for_interface(uuid,text) to authenticated;

drop policy if exists capo_documents_nutrition_management_insert on storage.objects;
create policy capo_documents_nutrition_management_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id='capo-documents'
  and lower(storage.extension(name))='pdf'
  and public.capo_storage_path_uuid(name,'nutrition') is not null
  and (
    public.has_app_role('administrador')
    or (public.has_app_role('administrativo_operacional') and public.has_app_role('administrador_tecnico'))
  )
  and exists(
    select 1
    from public.nutrition_plan_documents d
    where d.id=public.capo_storage_path_uuid(name,'nutrition')
      and public.capo_patient_visible_in_current_context(d.patient_id)
  )
);

drop policy if exists capo_documents_nutrition_management_read on storage.objects;
create policy capo_documents_nutrition_management_read
on storage.objects
for select
to authenticated
using (
  bucket_id='capo-documents'
  and public.capo_storage_path_uuid(name,'nutrition') is not null
  and (
    public.has_app_role('administrador')
    or (public.has_app_role('administrativo_operacional') and public.has_app_role('administrador_tecnico'))
  )
  and exists(
    select 1
    from public.nutrition_plan_documents d
    where d.id=public.capo_storage_path_uuid(name,'nutrition')
      and public.capo_patient_visible_in_current_context(d.patient_id)
  )
);

create or replace function public.register_care_closure_decision_for_interface(
  p_closure_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_closure public.patient_care_closures%rowtype;
  v_now timestamptz := clock_timestamp();
  v_care_cycle_id uuid;
  v_other_pending integer := 0;
  v_recipient record;
  v_notified integer := 0;
  v_reason text := btrim(coalesce(p_reason,''));
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Titular pode registrar administrativamente uma decisão profissional de encerramento.' using errcode='42501';
  end if;
  if char_length(v_reason)<5 or char_length(v_reason)>1000 then
    raise exception 'O registro administrativo deve possuir entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  select * into v_closure
  from public.patient_care_closures
  where id=p_closure_id
  for update;

  if v_closure.id is null then raise exception 'Encerramento não encontrado.' using errcode='22023'; end if;
  perform public.capo_assert_patient_write_context(v_closure.patient_id);
  if v_closure.status<>'pendente' then raise exception 'Somente encerramento pendente pode receber este registro administrativo.' using errcode='22023'; end if;
  if v_closure.professional_id is null then
    raise exception 'É necessário existir profissional responsável antes do registro administrativo da decisão.' using errcode='22023';
  end if;

  update public.patient_care_closures
     set status='encerrado',
         closed_at=v_now,
         closed_by=v_account_id,
         closure_notes=case
           when nullif(btrim(coalesce(closure_notes,'')),'') is null
             then 'Registro administrativo de decisão profissional: '||v_reason
           else closure_notes||E'\nRegistro administrativo de decisão profissional: '||v_reason
         end,
         updated_at=v_now
   where id=p_closure_id;

  if v_closure.cycle_specialty_id is not null then
    select cs.care_cycle_id into v_care_cycle_id
    from public.patient_care_cycle_specialties cs
    where cs.id=v_closure.cycle_specialty_id
    for update;

    if v_care_cycle_id is null then
      raise exception 'Especialidade canônica do ciclo não encontrada para este encerramento.' using errcode='22023';
    end if;

    select count(*) into v_other_pending
    from public.patient_care_closures cc
    where cc.cycle_specialty_id=v_closure.cycle_specialty_id
      and cc.status='pendente'
      and cc.id<>p_closure_id;

    if v_other_pending=0 then
      update public.patient_care_cycle_specialties
         set status='encerrada',
             resolution_type='professional_closure',
             resolved_at=v_now,
             resolved_by=v_account_id,
             resolution_reason='Registro administrativo da decisão profissional: '||v_reason,
             updated_at=v_now
       where id=v_closure.cycle_specialty_id;
    else
      update public.patient_care_cycle_specialties
         set status='encerramento_pendente',
             resolution_type=null,
             resolved_at=null,
             resolved_by=null,
             resolution_reason=null,
             updated_at=v_now
       where id=v_closure.cycle_specialty_id;
    end if;

    update public.patient_care_cycles
       set status='encerramento_em_andamento',updated_at=v_now
     where id=v_care_cycle_id and status='ativo';

    for v_recipient in
      with active_professionals as (
        select cs.current_responsible_professional_id as professional_id
        from public.patient_care_cycle_specialties cs
        where cs.care_cycle_id=v_care_cycle_id
          and cs.status in ('ativa','encerramento_pendente')
          and cs.current_responsible_professional_id is not null
        union
        select pa.professional_id
        from public.patient_appointments pa
        where pa.care_cycle_id=v_care_cycle_id
          and pa.patient_id=v_closure.patient_id
          and pa.professional_id is not null
          and pa.attendance_status not in ('cancelado','remarcado')
      )
      select distinct ua.auth_user_id
      from active_professionals ap
      join public.professionals pr on pr.id=ap.professional_id and pr.status='ativo' and pr.is_professional=true
      join public.user_accounts ua on ua.professional_id=ap.professional_id and ua.is_active=true
      where ap.professional_id<>v_closure.professional_id and ua.auth_user_id is not null
    loop
      perform public.capo_criar_notificacao(
        null,v_recipient.auth_user_id,'care_specialty_closed',
        'Encerramento de outra especialidade',
        'Foi registrado administrativamente o encerramento já definido pelo profissional responsável. Sua atuação permanece independente.',
        'patient_care_closures',p_closure_id,'normal'
      );
      v_notified := v_notified + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'success',true,'closure_id',p_closure_id,'status','encerrado',
    'professional_id',v_closure.professional_id,'registered_by',v_account_id,
    'cycle_specialty_id',v_closure.cycle_specialty_id,'care_cycle_id',v_care_cycle_id,
    'specialty_fully_closed',coalesce(v_closure.cycle_specialty_id is not null and v_other_pending=0,false),
    'other_professionals_notified',v_notified,'closed_at',v_now,
    'message','Decisão profissional registrada administrativamente com histórico preservado.'
  );
end;
$function$;

revoke all on function public.register_care_closure_decision_for_interface(uuid,text) from public, anon;
grant execute on function public.register_care_closure_decision_for_interface(uuid,text) to authenticated;
