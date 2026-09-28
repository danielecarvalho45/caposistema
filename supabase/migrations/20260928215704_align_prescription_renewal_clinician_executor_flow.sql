drop function if exists public.manage_prescription_renewal_medical_for_interface(uuid,text,text);

create function public.manage_prescription_renewal_medical_for_interface(
  p_request_id uuid,
  p_action text,
  p_operational_return text default null,
  p_pickup_location text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_status text;
  v_target_doctor uuid;
  v_outcome text;
  v_event_type text;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;

  if v_account_id is null or v_professional_id is null then
    raise exception 'Conta profissional ativa obrigatória.';
  end if;
  if not (public.has_app_role('profissional') or public.has_app_role('coordenador')) then
    raise exception 'Perfil sem autorização para executar a etapa profissional da Renovação de Receita.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'A etapa profissional da Renovação de Receita exige profissional assistencial ativo.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.get_effective_professional_capabilities(v_professional_id) c
    where c.capability_code='renovacao_receita'
  ) then
    raise exception 'Capacidade renovacao_receita obrigatória para a etapa profissional.' using errcode='42501';
  end if;

  if p_action not in ('start','renewed','needs_consult') then
    raise exception 'Ação médica inválida.';
  end if;

  select r.status,r.target_doctor_id into v_status,v_target_doctor
  from public.prescription_renewal_requests r
  where r.id=p_request_id
  for update;

  if v_status is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_target_doctor<>v_professional_id then
    raise exception 'Solicitação não destinada ao profissional autenticado.';
  end if;

  if p_action='start' then
    if v_status<>'awaiting_medical' then
      raise exception 'Somente solicitação aguardando Médico pode ser iniciada.';
    end if;
    update public.prescription_renewal_requests
       set status='medical_in_progress',
           medical_outcome=null,
           consult_appointment_id=null,
           pickup_location=null,
           updated_at=v_now
     where id=p_request_id;
    insert into public.prescription_renewal_events(
      request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at
    ) values (
      p_request_id,'medical_started',v_account_id,v_status,'medical_in_progress',
      'Solicitação aceita pelo Médico Clínico para execução.',v_now
    );
    return jsonb_build_object(
      'success',true,'request_id',p_request_id,'status','medical_in_progress','updated_at',v_now
    );
  end if;

  if v_status not in ('awaiting_medical','medical_in_progress') then
    raise exception 'Solicitação não está disponível para retorno médico.';
  end if;
  if char_length(btrim(coalesce(p_operational_return,'')))<3
     or char_length(btrim(coalesce(p_operational_return,'')))>1000 then
    raise exception 'Retorno operacional deve possuir entre 3 e 1000 caracteres e não deve conter prescrição.';
  end if;

  if p_action='renewed' then
    if char_length(btrim(coalesce(p_pickup_location,'')))<2
       or char_length(btrim(coalesce(p_pickup_location,'')))>200 then
      raise exception 'Informe o local/orientação de retirada da receita.';
    end if;
  elsif p_pickup_location is not null and btrim(p_pickup_location)<>'' then
    raise exception 'Local de retirada só se aplica quando a receita estiver pronta.';
  end if;

  v_outcome:=p_action;
  v_event_type:=case when p_action='renewed' then 'medical_renewed' else 'medical_needs_consult' end;

  update public.prescription_renewal_requests
     set status='awaiting_admin',
         medical_processed_by=v_professional_id,
         medical_return=btrim(p_operational_return),
         medical_returned_at=v_now,
         medical_outcome=v_outcome,
         pickup_location=case when v_outcome='renewed' then btrim(p_pickup_location) else null end,
         consult_appointment_id=null,
         updated_at=v_now
   where id=p_request_id;

  insert into public.prescription_renewal_events(
    request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at
  ) values (
    p_request_id,v_event_type,v_account_id,v_status,'awaiting_admin',
    case when v_outcome='renewed'
      then 'Receita pronta; Médico Clínico informou o local de retirada e devolveu ao Administrativo para orientação ao paciente.'
      else 'Necessita consulta; retorno automático ao Administrativo para agendamento.'
    end,
    v_now
  );

  perform public.capo_criar_notificacao(
    'administrativo_operacional',null,
    case when v_outcome='renewed' then 'prescription_renewal_ready' else 'prescription_renewal_needs_consult' end,
    case when v_outcome='renewed' then 'Receita pronta para retirada' else 'Renovação de receita — necessita consulta' end,
    case when v_outcome='renewed'
      then 'O Médico Clínico informou que a receita está pronta. Consulte o local de retirada e oriente o paciente.'
      else 'O Clínico informou necessidade de consulta. Organize o agendamento na agenda do Clínico.'
    end,
    'prescription_renewal_requests',p_request_id,'alta'
  );

  return jsonb_build_object(
    'success',true,'request_id',p_request_id,'status','awaiting_admin',
    'medical_outcome',v_outcome,
    'pickup_location',case when v_outcome='renewed' then btrim(p_pickup_location) else null end,
    'updated_at',v_now
  );
end;
$function$;

revoke all on function public.manage_prescription_renewal_medical_for_interface(uuid,text,text,text) from public;
grant execute on function public.manage_prescription_renewal_medical_for_interface(uuid,text,text,text) to authenticated;

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
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente Administrativo Operacional ou Administrativo Controlador pode executar esta ação.';
  end if;
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
           medical_outcome=null,consult_appointment_id=null,pickup_location=null,updated_at=v_now
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
           pickup_location=case
             when v_outcome='renewed' then coalesce(nullif(btrim(coalesce(p_pickup_location,'')),''),pickup_location)
             else null
           end,
           final_admin_note=nullif(btrim(coalesce(p_final_admin_note,'')),''),
           patient_contacted_at=v_now,completed_by=v_account_id,completed_at=v_now,updated_at=v_now
     where id=p_request_id;
    insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
    values(p_request_id,'admin_completed',v_account_id,v_status,'completed',
      case when v_outcome='renewed'
        then 'Paciente contatado/orientado sobre a receita pronta e o local de retirada informado pelo Médico Clínico.'
        else 'Consulta necessária agendada e orientação ao paciente confirmada.'
      end,v_now);
    return jsonb_build_object('success',true,'request_id',p_request_id,'status','completed','completed_at',v_now);
  end if;

  if char_length(btrim(coalesce(p_reason,'')))<5 or char_length(btrim(coalesce(p_reason,'')))>500 then
    raise exception 'Motivo do cancelamento deve possuir entre 5 e 500 caracteres.';
  end if;
  update public.prescription_renewal_requests
     set status='cancelled',cancelled_by=v_account_id,cancelled_at=v_now,
         cancellation_reason=btrim(p_reason),updated_at=v_now
   where id=p_request_id;
  insert into public.prescription_renewal_events(request_id,event_type,actor_user_account_id,previous_status,new_status,detail,created_at)
  values(p_request_id,'cancelled',v_account_id,v_status,'cancelled',btrim(p_reason),v_now);
  return jsonb_build_object('success',true,'request_id',p_request_id,'status','cancelled','cancelled_at',v_now);
end;
$function$;
