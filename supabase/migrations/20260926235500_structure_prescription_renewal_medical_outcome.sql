alter table public.prescription_renewal_requests
  add column if not exists medical_outcome text,
  add column if not exists consult_appointment_id uuid references public.patient_appointments(id) on delete restrict;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.prescription_renewal_requests'::regclass
      and conname='prescription_renewal_medical_outcome_check'
  ) then
    alter table public.prescription_renewal_requests
      add constraint prescription_renewal_medical_outcome_check
      check (medical_outcome is null or medical_outcome in ('renewed','needs_consult'));
  end if;
end $$;

create or replace function public.manage_prescription_renewal_medical_for_interface(
  p_request_id uuid,
  p_action text,
  p_operational_return text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid; v_professional_id uuid; v_status text; v_target_doctor uuid;
  v_outcome text; v_event_type text; v_now timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;
  select ua.id,public.capo_effective_professional_id() into v_account_id,v_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null or v_professional_id is null then raise exception 'Conta profissional ativa obrigatória.'; end if;
  if not (public.has_app_role('profissional') or public.has_app_role('coordenador')) then raise exception 'Perfil sem autorização para executar a etapa profissional da Renovação de Receita.' using errcode='42501'; end if;
  if not exists(select 1 from public.professionals p where p.id=v_professional_id and p.status='ativo' and p.is_professional=true) then raise exception 'A etapa profissional da Renovação de Receita exige profissional assistencial ativo.' using errcode='42501'; end if;
  if not exists(select 1 from public.get_effective_professional_capabilities(v_professional_id) c where c.capability_code='renovacao_receita') then raise exception 'Capacidade renovacao_receita obrigatória para a etapa profissional.' using errcode='42501'; end if;
  if p_action not in ('start','renewed','needs_consult') then raise exception 'Ação médica inválida.'; end if;

  select r.status,r.target_doctor_id into v_status,v_target_doctor
  from public.prescription_renewal_requests r where r.id=p_request_id for update;
  if v_status is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_target_doctor<>v_professional_id then raise exception 'Solicitação não destinada ao profissional autenticado.'; end if;

  if p_action='start' then
    if v_status<>'awaiting_medical' then raise exception 'Somente solicitação aguardando Médico pode ser iniciada.'; end if;
    update public.prescription_renewal_requests set status='medical_in_progress',medical_outcome=null,consult_appointment_id=null,updated_at=v_now where id=p_request_id;
    insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
    values(p_request_id,'medical_started',v_account_id,v_status,'medical_in_progress','Processamento médico operacional iniciado.',v_now);
    return jsonb_build_object('success',true,'request_id',p_request_id,'status','medical_in_progress','updated_at',v_now);
  end if;

  if v_status not in ('awaiting_medical','medical_in_progress') then raise exception 'Solicitação não está disponível para retorno médico.'; end if;
  if char_length(btrim(coalesce(p_operational_return,'')))<3 or char_length(btrim(coalesce(p_operational_return,'')))>1000 then raise exception 'Retorno operacional deve possuir entre 3 e 1000 caracteres e não deve conter prescrição.'; end if;

  v_outcome:=p_action;
  v_event_type:=case when p_action='renewed' then 'medical_renewed' else 'medical_needs_consult' end;

  update public.prescription_renewal_requests
     set status='awaiting_admin',medical_processed_by=v_professional_id,
         medical_return=btrim(p_operational_return),medical_returned_at=v_now,
         medical_outcome=v_outcome,consult_appointment_id=null,updated_at=v_now
   where id=p_request_id;

  insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
  values(p_request_id,v_event_type,v_account_id,v_status,'awaiting_admin',
    case when v_outcome='renewed'
      then 'Receita renovada no sistema oficial; retorno operacional ao Administrativo.'
      else 'Necessita consulta; retorno automático ao Administrativo para agendamento.'
    end,v_now);

  perform public.capo_criar_notificacao(
    'administrativo_operacional',null,
    case when v_outcome='renewed' then 'prescription_renewal_medical_return' else 'prescription_renewal_needs_consult' end,
    case when v_outcome='renewed' then 'Receita renovada — retorno ao Administrativo' else 'Renovação de receita — necessita consulta' end,
    case when v_outcome='renewed' then 'A etapa médica foi concluída e aguarda orientação ao paciente.' else 'O Clínico informou necessidade de consulta. Organize o agendamento na agenda do Clínico.' end,
    'prescription_renewal_requests',p_request_id,'alta'
  );

  return jsonb_build_object('success',true,'request_id',p_request_id,'status','awaiting_admin','medical_outcome',v_outcome,'updated_at',v_now);
end;
$function$;

create or replace function public.get_prescription_renewal_operational_context_for_interface(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_professional_id uuid; v_is_admin boolean; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select public.capo_effective_professional_id() into v_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true;
  v_is_admin:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');

  select jsonb_build_object(
    'request_id',r.id,'patient_id',r.patient_id,'patient_name',pt.full_name,
    'target_doctor_id',r.target_doctor_id,'target_doctor_name',pr.full_name,
    'status',r.status,'medical_outcome',r.medical_outcome,
    'consult_appointment_id',r.consult_appointment_id,
    'consult_appointment_date',pa.appointment_date,
    'consult_appointment_status',pa.attendance_status
  ) into v_result
  from public.prescription_renewal_requests r
  join public.patients pt on pt.id=r.patient_id
  join public.professionals pr on pr.id=r.target_doctor_id
  left join public.patient_appointments pa on pa.id=r.consult_appointment_id
  where r.id=p_request_id
    and public.capo_patient_visible_in_current_context(r.patient_id)
    and (v_is_admin or r.target_doctor_id=v_professional_id);

  if v_result is null then raise exception 'Solicitação não encontrada ou fora do contexto autorizado.' using errcode='42501'; end if;
  return v_result;
end;
$function$;

create or replace function public.link_prescription_renewal_consult_appointment_for_interface(
  p_request_id uuid,p_appointment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid; v_request public.prescription_renewal_requests%rowtype;
  v_appointment public.patient_appointments%rowtype; v_now timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id into v_account_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then raise exception 'Somente o Administrativo pode vincular a consulta da renovação.' using errcode='42501'; end if;

  select * into v_request from public.prescription_renewal_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Solicitação não encontrada.' using errcode='22023'; end if;
  if v_request.status<>'awaiting_admin' or v_request.medical_outcome<>'needs_consult' then raise exception 'Esta solicitação não está aguardando agendamento de consulta.' using errcode='22023'; end if;
  if v_request.consult_appointment_id is not null then raise exception 'A consulta desta solicitação já foi vinculada.' using errcode='23505'; end if;

  select * into v_appointment from public.patient_appointments where id=p_appointment_id for update;
  if v_appointment.id is null then raise exception 'Agendamento não encontrado.' using errcode='22023'; end if;
  if v_appointment.patient_id<>v_request.patient_id then raise exception 'O agendamento não pertence ao paciente da solicitação.' using errcode='22023'; end if;
  if v_appointment.professional_id<>v_request.target_doctor_id then raise exception 'A consulta deve ser agendada com o Clínico destinatário da solicitação.' using errcode='22023'; end if;
  if v_appointment.attendance_status not in ('agendado','confirmado') then raise exception 'O agendamento informado não está ativo.' using errcode='22023'; end if;

  update public.prescription_renewal_requests set consult_appointment_id=p_appointment_id,updated_at=v_now where id=p_request_id;
  insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
  values(p_request_id,'consult_scheduled',v_account_id,'awaiting_admin','awaiting_admin','Consulta necessária agendada na agenda do Clínico destinatário.',v_now);

  return jsonb_build_object('success',true,'request_id',p_request_id,'status','awaiting_admin','consult_appointment_id',p_appointment_id,'appointment_date',v_appointment.appointment_date,'updated_at',v_now);
end;
$function$;

create or replace function public.manage_prescription_renewal_admin_for_interface(
  p_request_id uuid,p_action text,p_target_doctor_id uuid default null,
  p_pickup_location text default null,p_final_admin_note text default null,
  p_patient_contacted boolean default false,p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid; v_status text; v_old_doctor uuid; v_outcome text;
  v_consult_appointment_id uuid; v_doctor_user uuid; v_now timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;
  select ua.id into v_account_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then raise exception 'Somente Administrativo Operacional ou Administrativo Controlador pode executar esta ação.'; end if;
  if p_action not in ('retarget','complete','cancel') then raise exception 'Ação administrativa inválida.'; end if;

  select r.status,r.target_doctor_id,r.medical_outcome,r.consult_appointment_id
    into v_status,v_old_doctor,v_outcome,v_consult_appointment_id
  from public.prescription_renewal_requests r where r.id=p_request_id for update;
  if v_status is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_status in ('completed','cancelled') then raise exception 'Solicitação já encerrada.'; end if;

  if p_action='retarget' then
    if v_status not in ('awaiting_medical','medical_in_progress') then raise exception 'Médico destinatário só pode ser alterado antes da conclusão da etapa médica.'; end if;
    if p_target_doctor_id is null or not public.is_active_clinical_doctor(p_target_doctor_id) then raise exception 'Novo médico destinatário inválido ou inativo.'; end if;
    if p_target_doctor_id=v_old_doctor then raise exception 'O médico informado já é o destinatário atual.'; end if;
    update public.prescription_renewal_requests
       set target_doctor_id=p_target_doctor_id,status='awaiting_medical',
           medical_processed_by=null,medical_return=null,medical_returned_at=null,
           medical_outcome=null,consult_appointment_id=null,updated_at=v_now
     where id=p_request_id;
    insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,previous_doctor_id,new_doctor_id,detail,created_at)
    values(p_request_id,'doctor_reassigned',v_account_id,v_status,'awaiting_medical',v_old_doctor,p_target_doctor_id,'Médico destinatário alterado pelo fluxo administrativo.',v_now);
    select ua.auth_user_id into v_doctor_user from public.user_accounts ua
    where ua.professional_id=p_target_doctor_id and ua.is_active=true and ua.auth_user_id is not null
    order by ua.created_at desc nulls last limit 1;
    if v_doctor_user is not null then
      perform public.capo_criar_notificacao(null,v_doctor_user,'prescription_renewal_new','Solicitação de renovação de receita atribuída','Há uma solicitação operacional de renovação aguardando sua atuação.','prescription_renewal_requests',p_request_id,'alta');
    end if;
    return jsonb_build_object('success',true,'request_id',p_request_id,'status','awaiting_medical','target_doctor_id',p_target_doctor_id,'updated_at',v_now);
  end if;

  if p_action='complete' then
    if v_status<>'awaiting_admin' then raise exception 'A solicitação ainda não está aguardando conclusão administrativa.'; end if;
    if v_outcome is null then raise exception 'A decisão médica estruturada não foi registrada.' using errcode='22023'; end if;
    if v_outcome='needs_consult' and v_consult_appointment_id is null then raise exception 'Agende e vincule a consulta antes de concluir esta solicitação.' using errcode='22023'; end if;
    if coalesce(p_patient_contacted,false)<>true then raise exception 'Confirme conscientemente que o paciente foi contatado/orientado antes de concluir.'; end if;
    if char_length(coalesce(p_pickup_location,''))>200 then raise exception 'Local/orientação de retirada excede 200 caracteres.'; end if;
    if char_length(coalesce(p_final_admin_note,''))>1000 then raise exception 'Observação administrativa final excede 1000 caracteres.'; end if;
    update public.prescription_renewal_requests
       set status='completed',
           pickup_location=case when v_outcome='renewed' then nullif(btrim(coalesce(p_pickup_location,'')),'') else null end,
           final_admin_note=nullif(btrim(coalesce(p_final_admin_note,'')),''),
           patient_contacted_at=v_now,completed_by=v_account_id,completed_at=v_now,updated_at=v_now
     where id=p_request_id;
    insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
    values(p_request_id,'admin_completed',v_account_id,v_status,'completed',
      case when v_outcome='renewed' then 'Contato/orientação ao paciente confirmado após renovação no sistema oficial.' else 'Consulta necessária agendada e orientação ao paciente confirmada.' end,v_now);
    return jsonb_build_object('success',true,'request_id',p_request_id,'status','completed','completed_at',v_now);
  end if;

  if char_length(btrim(coalesce(p_reason,'')))<5 or char_length(btrim(coalesce(p_reason,'')))>500 then raise exception 'Motivo do cancelamento deve possuir entre 5 e 500 caracteres.'; end if;
  update public.prescription_renewal_requests set status='cancelled',cancelled_by=v_account_id,cancelled_at=v_now,cancellation_reason=btrim(p_reason),updated_at=v_now where id=p_request_id;
  insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
  values(p_request_id,'cancelled',v_account_id,v_status,'cancelled',btrim(p_reason),v_now);
  return jsonb_build_object('success',true,'request_id',p_request_id,'status','cancelled','cancelled_at',v_now);
end;
$function$;

revoke all on function public.manage_prescription_renewal_medical_for_interface(uuid,text,text) from public,anon;
grant execute on function public.manage_prescription_renewal_medical_for_interface(uuid,text,text) to authenticated;
revoke all on function public.get_prescription_renewal_operational_context_for_interface(uuid) from public,anon;
grant execute on function public.get_prescription_renewal_operational_context_for_interface(uuid) to authenticated;
revoke all on function public.link_prescription_renewal_consult_appointment_for_interface(uuid,uuid) from public,anon;
grant execute on function public.link_prescription_renewal_consult_appointment_for_interface(uuid,uuid) to authenticated;
revoke all on function public.manage_prescription_renewal_admin_for_interface(uuid,text,uuid,text,text,boolean,text) from public,anon;
grant execute on function public.manage_prescription_renewal_admin_for_interface(uuid,text,uuid,text,text,boolean,text) to authenticated;
