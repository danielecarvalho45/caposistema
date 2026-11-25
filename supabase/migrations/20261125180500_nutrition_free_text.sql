-- Remove only fixed length checks; preserve signatures, grants, authorization and persistence.
CREATE OR REPLACE FUNCTION public.save_nutrition_plan_detailed_for_interface(p_patient_id uuid, p_breakfast text, p_lunch text, p_snack text, p_dinner text, p_hydration text, p_nutritional_supplement text, p_other_guidance text, p_dessert_lunch text, p_dessert_dinner text, p_oncology_guidance text, p_additional_notes text, p_document_title text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid; v_professional_id uuid; v_plan_id uuid; v_plan_professional_id uuid; v_plan_cycle_id uuid;
  v_now timestamptz:=clock_timestamp(); v_action text; v_values text[]:=array[p_breakfast,p_lunch,p_snack,p_dinner,p_hydration,p_nutritional_supplement,p_other_guidance,p_dessert_lunch,p_dessert_dinner,p_oncology_guidance,p_additional_notes]; v_item text;
  v_cycle_id uuid; v_specialty_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not public.has_accepted_current_legal_term() then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id
  from public.user_accounts ua join public.professionals pr on pr.id=public.capo_effective_professional_id()
  where ua.auth_user_id=auth.uid() and ua.is_active=true and pr.status='ativo' and pr.is_professional=true and public.has_app_role('profissional')
    and exists(select 1 from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id where ps.professional_id=pr.id and s.is_active=true and lower(trim(s.name))=lower('Nutrição')) limit 1;
  if v_professional_id is null then raise exception 'Somente Nutricionista ativa pode salvar o plano alimentar.' using errcode='42501'; end if;

  perform 1 from public.patients p where p.id=p_patient_id and p.status='ativo' and p.deceased=false for update;
  if not found then raise exception 'Paciente inexistente, inativo ou falecido.'; end if;

  select s.id into v_specialty_id from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id
  where ps.professional_id=v_professional_id and s.is_active=true and lower(trim(s.name))=lower('Nutrição')
  order by ps.is_primary desc,s.name limit 1;

  select c.id into v_cycle_id from public.patient_care_cycles c
  where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc limit 1 for update;
  if v_cycle_id is null then raise exception 'Paciente sem ciclo CAPO aberto.'; end if;
  perform public.ensure_cycle_specialty(v_cycle_id,v_specialty_id,'modulo',null,v_account_id,v_professional_id);

  if not public.nutrition_professional_has_patient_scope(v_professional_id,p_patient_id) then raise exception 'O paciente precisa estar no fluxo operacional atual da sua atuação em Nutrição.' using errcode='42501'; end if;
  if not exists(select 1 from unnest(v_values) x where nullif(trim(coalesce(x,'')),'') is not null) then raise exception 'Preencha ao menos um campo do plano alimentar.'; end if;

  select np.id,np.professional_id,np.care_cycle_id into v_plan_id,v_plan_professional_id,v_plan_cycle_id
  from public.nutrition_plans np where np.patient_id=p_patient_id and np.status='current' for update;

  if v_plan_id is not null and v_plan_cycle_id is distinct from v_cycle_id then
    update public.nutrition_plans set status='archived',archived_at=v_now,archived_by=v_account_id,updated_at=v_now where id=v_plan_id;
    v_plan_id:=null; v_plan_professional_id:=null; v_plan_cycle_id:=null;
  end if;

  if v_plan_id is null then
    insert into public.nutrition_plans(patient_id,professional_id,status,breakfast,lunch,snack,dinner,hydration,nutritional_supplement,other_guidance,dessert_lunch,dessert_dinner,oncology_guidance,additional_notes,document_title,created_at,updated_at,care_cycle_id)
    values(p_patient_id,v_professional_id,'current',nullif(trim(p_breakfast),''),nullif(trim(p_lunch),''),nullif(trim(p_snack),''),nullif(trim(p_dinner),''),nullif(trim(p_hydration),''),nullif(trim(p_nutritional_supplement),''),nullif(trim(p_other_guidance),''),nullif(trim(p_dessert_lunch),''),nullif(trim(p_dessert_dinner),''),nullif(trim(p_oncology_guidance),''),nullif(trim(p_additional_notes),''),coalesce(nullif(trim(p_document_title),''),'PLANO ALIMENTAR ORAL'),v_now,v_now,v_cycle_id)
    returning id into v_plan_id; v_action:='created';
  elsif v_plan_professional_id=v_professional_id then
    update public.nutrition_plans set breakfast=nullif(trim(p_breakfast),''),lunch=nullif(trim(p_lunch),''),snack=nullif(trim(p_snack),''),dinner=nullif(trim(p_dinner),''),hydration=nullif(trim(p_hydration),''),nutritional_supplement=nullif(trim(p_nutritional_supplement),''),other_guidance=nullif(trim(p_other_guidance),''),dessert_lunch=nullif(trim(p_dessert_lunch),''),dessert_dinner=nullif(trim(p_dessert_dinner),''),oncology_guidance=nullif(trim(p_oncology_guidance),''),additional_notes=nullif(trim(p_additional_notes),''),document_title=coalesce(nullif(trim(p_document_title),''),'PLANO ALIMENTAR ORAL'),care_cycle_id=v_cycle_id,updated_at=v_now where id=v_plan_id; v_action:='updated';
  else
    update public.nutrition_plans set status='archived',archived_at=v_now,archived_by=v_account_id,updated_at=v_now where id=v_plan_id;
    insert into public.nutrition_plans(patient_id,professional_id,status,breakfast,lunch,snack,dinner,hydration,nutritional_supplement,other_guidance,dessert_lunch,dessert_dinner,oncology_guidance,additional_notes,document_title,created_at,updated_at,care_cycle_id)
    values(p_patient_id,v_professional_id,'current',nullif(trim(p_breakfast),''),nullif(trim(p_lunch),''),nullif(trim(p_snack),''),nullif(trim(p_dinner),''),nullif(trim(p_hydration),''),nullif(trim(p_nutritional_supplement),''),nullif(trim(p_other_guidance),''),nullif(trim(p_dessert_lunch),''),nullif(trim(p_dessert_dinner),''),nullif(trim(p_oncology_guidance),''),nullif(trim(p_additional_notes),''),coalesce(nullif(trim(p_document_title),''),'PLANO ALIMENTAR ORAL'),v_now,v_now,v_cycle_id)
    returning id into v_plan_id; v_action:='successor_created';
  end if;

  return jsonb_build_object('success',true,'plan_id',v_plan_id,'action',v_action,'care_cycle_id',v_cycle_id,'specialty_id',v_specialty_id,'updated_at',v_now);
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_nutrition_plan_for_interface(p_patient_id uuid, p_breakfast text DEFAULT NULL::text, p_lunch text DEFAULT NULL::text, p_snack text DEFAULT NULL::text, p_dinner text DEFAULT NULL::text, p_hydration text DEFAULT NULL::text, p_nutritional_supplement text DEFAULT NULL::text, p_other_guidance text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid; v_professional_id uuid; v_plan_id uuid; v_plan_professional_id uuid; v_plan_cycle_id uuid;
  v_now timestamptz:=clock_timestamp(); v_action text; v_values text[]:=array[p_breakfast,p_lunch,p_snack,p_dinner,p_hydration,p_nutritional_supplement,p_other_guidance]; v_item text;
  v_cycle_id uuid; v_specialty_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not public.has_accepted_current_legal_term() then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id
  from public.user_accounts ua join public.professionals pr on pr.id=public.capo_effective_professional_id()
  where ua.auth_user_id=auth.uid() and ua.is_active=true and pr.status='ativo' and pr.is_professional=true and public.has_app_role('profissional')
    and exists(select 1 from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id where ps.professional_id=pr.id and s.is_active=true and lower(trim(s.name))=lower('Nutrição')) limit 1;
  if v_professional_id is null then raise exception 'Somente Nutricionista ativa pode salvar o plano alimentar.' using errcode='42501'; end if;

  perform 1 from public.patients p where p.id=p_patient_id and p.status='ativo' and p.deceased=false for update;
  if not found then raise exception 'Paciente inexistente, inativo ou falecido.'; end if;

  select s.id into v_specialty_id from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id
  where ps.professional_id=v_professional_id and s.is_active=true and lower(trim(s.name))=lower('Nutrição')
  order by ps.is_primary desc,s.name limit 1;

  select c.id into v_cycle_id from public.patient_care_cycles c
  where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc limit 1 for update;
  if v_cycle_id is null then raise exception 'Paciente sem ciclo CAPO aberto.'; end if;
  perform public.ensure_cycle_specialty(v_cycle_id,v_specialty_id,'modulo',null,v_account_id,v_professional_id);

  if not public.nutrition_professional_has_patient_scope(v_professional_id,p_patient_id) then raise exception 'O paciente precisa estar no fluxo operacional atual da sua atuação em Nutrição.' using errcode='42501'; end if;
  if not exists(select 1 from unnest(v_values) x where nullif(trim(coalesce(x,'')),'') is not null) then raise exception 'Preencha ao menos um campo do plano alimentar.'; end if;

  select np.id,np.professional_id,np.care_cycle_id into v_plan_id,v_plan_professional_id,v_plan_cycle_id
  from public.nutrition_plans np where np.patient_id=p_patient_id and np.status='current' for update;

  if v_plan_id is not null and v_plan_cycle_id is distinct from v_cycle_id then
    update public.nutrition_plans set status='archived',archived_at=v_now,archived_by=v_account_id,updated_at=v_now where id=v_plan_id;
    v_plan_id:=null; v_plan_professional_id:=null; v_plan_cycle_id:=null;
  end if;

  if v_plan_id is null then
    insert into public.nutrition_plans(patient_id,professional_id,status,breakfast,lunch,snack,dinner,hydration,nutritional_supplement,other_guidance,created_at,updated_at,care_cycle_id)
    values(p_patient_id,v_professional_id,'current',nullif(trim(p_breakfast),''),nullif(trim(p_lunch),''),nullif(trim(p_snack),''),nullif(trim(p_dinner),''),nullif(trim(p_hydration),''),nullif(trim(p_nutritional_supplement),''),nullif(trim(p_other_guidance),''),v_now,v_now,v_cycle_id)
    returning id into v_plan_id; v_action:='created';
  elsif v_plan_professional_id=v_professional_id then
    update public.nutrition_plans set breakfast=nullif(trim(p_breakfast),''),lunch=nullif(trim(p_lunch),''),snack=nullif(trim(p_snack),''),dinner=nullif(trim(p_dinner),''),hydration=nullif(trim(p_hydration),''),nutritional_supplement=nullif(trim(p_nutritional_supplement),''),other_guidance=nullif(trim(p_other_guidance),''),care_cycle_id=v_cycle_id,updated_at=v_now where id=v_plan_id; v_action:='updated';
  else
    update public.nutrition_plans set status='archived',archived_at=v_now,archived_by=v_account_id,updated_at=v_now where id=v_plan_id;
    insert into public.nutrition_plans(patient_id,professional_id,status,breakfast,lunch,snack,dinner,hydration,nutritional_supplement,other_guidance,created_at,updated_at,care_cycle_id)
    values(p_patient_id,v_professional_id,'current',nullif(trim(p_breakfast),''),nullif(trim(p_lunch),''),nullif(trim(p_snack),''),nullif(trim(p_dinner),''),nullif(trim(p_hydration),''),nullif(trim(p_nutritional_supplement),''),nullif(trim(p_other_guidance),''),v_now,v_now,v_cycle_id)
    returning id into v_plan_id; v_action:='successor_created';
  end if;

  return jsonb_build_object('success',true,'plan_id',v_plan_id,'action',v_action,'care_cycle_id',v_cycle_id,'specialty_id',v_specialty_id,'updated_at',v_now);
end;
$function$;