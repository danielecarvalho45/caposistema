-- CAPO — VERDE 19/11/2026: formulário documental de Nutrição, campos textuais livres.
-- Aditivo e compatível. Não alterar planos nem PDFs antigos nem a RPC clássica.
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS dessert_lunch text;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS dessert_dinner text;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS oncology_guidance text;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS additional_notes text;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS document_title text;

-- A função antiga continua disponível a chamadas existentes. Novo formulário usa contrato próprio.
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
  if char_length(coalesce(p_document_title,''))>250 then raise exception 'Título do plano deve ter no máximo 250 caracteres.'; end if;

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
  foreach v_item in array v_values loop if char_length(coalesce(v_item,''))>5000 then raise exception 'Cada campo do plano deve possuir no máximo 5000 caracteres.'; end if; end loop;
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
$function$
;
CREATE OR REPLACE FUNCTION public.get_nutrition_context_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_professional_id uuid;
  v_result jsonb;
begin
  perform public.capo_assert_patient_read_context(p_patient_id);

  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_professional_id
  from public.user_accounts ua
  join public.professionals pr
    on pr.id=public.capo_effective_professional_id()
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
    and pr.status='ativo'
    and pr.is_professional=true
    and public.has_app_role('profissional')
    and exists(
      select 1
      from public.professional_specialties ps
      join public.specialties s on s.id=ps.specialty_id
      where ps.professional_id=pr.id
        and s.is_active=true
        and lower(btrim(s.name))=lower('Nutrição')
    )
  limit 1;

  if v_professional_id is null then
    raise exception 'Profissional de Nutrição ativo não identificado.' using errcode='42501';
  end if;

  if not public.nutrition_professional_has_patient_scope(v_professional_id,p_patient_id) then
    raise exception 'Paciente fora do escopo operacional atual da Nutrição.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'patient',(
      select jsonb_build_object(
        'patient_id',p.id,
        'full_name',p.full_name,
        'patient_number',p.patient_number,
        'cms',p.cms,
        'birth_date',p.birth_date,
        'phone',p.phone,
        'status',p.status
      )
      from public.patients p
      where p.id=p_patient_id
    ),
    'current_plan',(
      select jsonb_build_object(
        'plan_id',np.id,
        'patient_id',np.patient_id,
        'professional_id',np.professional_id,
        'professional_name',pr.full_name,
        'breakfast',np.breakfast,
        'lunch',np.lunch,
        'snack',np.snack,
        'dinner',np.dinner,
        'hydration',np.hydration,
        'nutritional_supplement',np.nutritional_supplement,
        'other_guidance',np.other_guidance,
        'dessert_lunch',np.dessert_lunch,
        'dessert_dinner',np.dessert_dinner,
        'oncology_guidance',np.oncology_guidance,
        'additional_notes',np.additional_notes,
        'document_title',np.document_title,
        'created_at',np.created_at,
        'updated_at',np.updated_at,
        'owned_by_me',np.professional_id=v_professional_id
      )
      from public.nutrition_plans np
      join public.professionals pr on pr.id=np.professional_id
      where np.patient_id=p_patient_id
        and np.status='current'
      limit 1
    ),
    'plan_history',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'plan_id',np.id,
          'professional_id',np.professional_id,
          'professional_name',pr.full_name,
          'status',np.status,
          'created_at',np.created_at,
          'updated_at',np.updated_at,
          'archived_at',np.archived_at,
          'breakfast',np.breakfast,
          'lunch',np.lunch,
          'snack',np.snack,
          'dinner',np.dinner,
          'hydration',np.hydration,
          'nutritional_supplement',np.nutritional_supplement,
          'other_guidance',np.other_guidance,
        'dessert_lunch',np.dessert_lunch,
        'dessert_dinner',np.dessert_dinner,
        'oncology_guidance',np.oncology_guidance,
        'additional_notes',np.additional_notes,
        'document_title',np.document_title
        )
        order by np.created_at desc
      )
      from public.nutrition_plans np
      join public.professionals pr on pr.id=np.professional_id
      where np.patient_id=p_patient_id
    ),'[]'::jsonb),
    'vulnerability_alert',(
      select jsonb_build_object(
        'alert_id',a.id,
        'impact_level',a.impact_level,
        'activated_at',a.activated_at,
        'updated_at',a.updated_at
      )
      from public.nutrition_vulnerability_alerts a
      where a.patient_id=p_patient_id
        and a.status='active'
      limit 1
    ),
    'documents',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'document_id',d.id,
          'plan_id',d.plan_id,
          'revision_no',d.revision_no,
          'author_name',d.author_name,
          'author_registration',d.author_registration,
          'created_at',d.created_at,
          'pdf_path',d.pdf_path,
          'pdf_generated_at',d.pdf_generated_at,
          'pdf_available',(d.pdf_path is not null and d.pdf_generated_at is not null)
        )
        order by d.created_at desc
      )
      from public.nutrition_plan_documents d
      where d.patient_id=p_patient_id
    ),'[]'::jsonb),
    'deliveries',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'delivery_id',dl.id,
          'document_id',dl.document_id,
          'mode',dl.mode,
          'status',dl.status,
          'requested_at',dl.requested_at,
          'started_at',dl.started_at,
          'completed_at',dl.completed_at,
          'cancelled_at',dl.cancelled_at,
          'cancellation_reason',dl.cancellation_reason,
          'events',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'event_type',e.event_type,
                'from_status',e.from_status,
                'to_status',e.to_status,
                'reason',e.reason,
                'created_at',e.created_at
              )
              order by e.created_at
            )
            from public.nutrition_delivery_events e
            where e.delivery_id=dl.id
          ),'[]'::jsonb)
        )
        order by dl.created_at desc
      )
      from public.nutrition_document_deliveries dl
      join public.nutrition_plan_documents d on d.id=dl.document_id
      where d.patient_id=p_patient_id
    ),'[]'::jsonb),
    'appointments',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'appointment_id',pa.id,
          'professional_id',pa.professional_id,
          'professional_name',pr.full_name,
          'appointment_date',pa.appointment_date,
          'appointment_type',pa.appointment_type,
          'attendance_status',pa.attendance_status
        )
        order by pa.appointment_date desc
      )
      from public.patient_appointments pa
      join public.professionals pr on pr.id=pa.professional_id
      where pa.patient_id=p_patient_id
        and pa.specialty_id in (
          select s.id
          from public.specialties s
          where s.is_active=true
            and lower(btrim(s.name))=lower('Nutrição')
        )
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_nutrition_document_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_account_id uuid;
    v_professional_id uuid;
    v_plan public.nutrition_plans%rowtype;
    v_revision integer;
    v_document_id uuid;
    v_now timestamptz := clock_timestamp();
    v_patient record;
    v_prof record;
begin
    if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
    if not public.has_accepted_current_legal_term() then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
    select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id
      from public.user_accounts ua join public.professionals pr on pr.id=public.capo_effective_professional_id()
     where ua.auth_user_id=auth.uid() and ua.is_active=true and pr.status='ativo' and pr.is_professional=true
       and public.has_app_role('profissional')
       and exists(select 1 from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id where ps.professional_id=pr.id and s.is_active=true and lower(trim(s.name))=lower('Nutrição'))
     limit 1;
    if v_professional_id is null then raise exception 'Somente Nutricionista ativa pode criar documento nutricional.' using errcode='42501'; end if;
    select * into v_plan from public.nutrition_plans where patient_id=p_patient_id and status='current' for update;
    if v_plan.id is null then raise exception 'Plano alimentar atual não encontrado.'; end if;
    if v_plan.professional_id<>v_professional_id then raise exception 'Somente a Nutricionista responsável pelo plano atual pode criar o documento.' using errcode='42501'; end if;
    select p.full_name,p.patient_number,p.cms into v_patient from public.patients p where p.id=p_patient_id;
    select pr.full_name,pr.professional_registration into v_prof from public.professionals pr where pr.id=v_professional_id;
    select coalesce(max(d.revision_no),0)+1 into v_revision from public.nutrition_plan_documents d where d.plan_id=v_plan.id;
    insert into public.nutrition_plan_documents(plan_id,patient_id,professional_id,revision_no,template_version,patient_name,patient_number,cms,author_name,author_registration,plan_snapshot,created_by,created_at)
    values(v_plan.id,p_patient_id,v_professional_id,v_revision,'2',v_patient.full_name,v_patient.patient_number,v_patient.cms,v_prof.full_name,v_prof.professional_registration,
           jsonb_build_object('breakfast',v_plan.breakfast,'lunch',v_plan.lunch,'snack',v_plan.snack,'dinner',v_plan.dinner,'hydration',v_plan.hydration,'nutritional_supplement',v_plan.nutritional_supplement,'other_guidance',v_plan.other_guidance,'dessert_lunch',v_plan.dessert_lunch,'dessert_dinner',v_plan.dessert_dinner,'oncology_guidance',v_plan.oncology_guidance,'additional_notes',v_plan.additional_notes,'document_title',v_plan.document_title,'plan_updated_at',v_plan.updated_at),
           v_account_id,v_now)
    returning id into v_document_id;
    return jsonb_build_object('success',true,'document_id',v_document_id,'plan_id',v_plan.id,'revision_no',v_revision,'created_at',v_now);
end;
$function$
;
