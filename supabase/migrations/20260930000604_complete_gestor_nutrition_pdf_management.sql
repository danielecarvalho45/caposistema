create or replace function public.get_nutrition_document_for_management_interface(p_document_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_authorized boolean;
  v_doc public.nutrition_plan_documents%rowtype;
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
    raise exception 'Perfil sem autorização para consultar o documento nutricional gerencial.' using errcode='42501';
  end if;

  select * into v_doc
  from public.nutrition_plan_documents
  where id=p_document_id;

  if v_doc.id is null then raise exception 'Documento nutricional não encontrado.' using errcode='22023'; end if;
  perform public.capo_assert_patient_read_context(v_doc.patient_id);

  return jsonb_build_object(
    'document_id',v_doc.id,'plan_id',v_doc.plan_id,'patient_id',v_doc.patient_id,
    'professional_id',v_doc.professional_id,'revision_no',v_doc.revision_no,
    'template_version',v_doc.template_version,'patient_name',v_doc.patient_name,
    'patient_number',v_doc.patient_number,'cms',v_doc.cms,'author_name',v_doc.author_name,
    'author_registration',v_doc.author_registration,'plan_snapshot',v_doc.plan_snapshot,
    'created_at',v_doc.created_at,'pdf_path',v_doc.pdf_path,
    'pdf_generated_at',v_doc.pdf_generated_at,
    'pdf_available',(v_doc.pdf_path is not null and v_doc.pdf_generated_at is not null)
  );
end;
$function$;

revoke all on function public.get_nutrition_document_for_management_interface(uuid) from public, anon;
grant execute on function public.get_nutrition_document_for_management_interface(uuid) to authenticated;
