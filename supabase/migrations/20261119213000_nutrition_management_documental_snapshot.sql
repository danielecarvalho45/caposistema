-- CAPO: documento gerencial usa todas as seções do Plano Alimentar, sem editar conteúdo.
CREATE OR REPLACE FUNCTION public.create_nutrition_document_for_management_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
    v_plan.id,p_patient_id,v_plan.professional_id,v_revision,'2',
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
      'dessert_lunch',v_plan.dessert_lunch,
      'dessert_dinner',v_plan.dessert_dinner,
      'oncology_guidance',v_plan.oncology_guidance,
      'additional_notes',v_plan.additional_notes,
      'document_title',v_plan.document_title,
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
$function$
