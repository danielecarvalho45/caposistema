create or replace function public.get_reschedulable_appointments(
  p_patient_id uuid default null,
  p_professional_id uuid default null,
  p_date date default null,
  p_limit integer default 50
)
returns table(
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  patient_number text,
  cms text,
  professional_id uuid,
  professional_name text,
  appointment_date timestamptz,
  appointment_end timestamptz,
  appointment_type text,
  attendance_status text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_own_professional_id uuid;
  v_general_access boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;
  if not public.has_accepted_current_legal_term() then
    raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
  end if;
  select public.capo_effective_professional_id() into v_own_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  v_general_access:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador');
  if not (v_general_access or (public.has_app_role('profissional') and v_own_professional_id is not null)) then
    raise exception 'Perfil sem autorização para consultar remarcações.' using errcode='42501';
  end if;
  if p_patient_id is null and p_professional_id is null and p_date is null then
    raise exception 'Informe paciente, profissional ou data para localizar o agendamento.' using errcode='22023';
  end if;
  if not v_general_access and p_professional_id is not null and p_professional_id is distinct from v_own_professional_id then
    raise exception 'Profissional pode consultar somente os próprios retornos.' using errcode='42501';
  end if;
  return query
  select pa.id,pa.patient_id,pt.full_name,pt.patient_number,pt.cms,pa.professional_id,pr.full_name,
         pa.appointment_date,pa.appointment_end,pa.appointment_type,pa.attendance_status,count(*) over()
  from public.patient_appointments pa
  join public.patients pt on pt.id=pa.patient_id and public.capo_patient_visible_in_current_context(pt.id)
  join public.professionals pr on pr.id=pa.professional_id
  where pa.attendance_status in ('agendado','confirmado','faltou')
    and (p_patient_id is null or pa.patient_id=p_patient_id)
    and (p_professional_id is null or pa.professional_id=p_professional_id)
    and (p_date is null or (pa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date)
    and (v_general_access or (pa.professional_id=v_own_professional_id and lower(btrim(coalesce(pa.appointment_type,'')))='retorno'))
  order by pa.appointment_date
  limit least(greatest(coalesce(p_limit,50),1),50);
end;
$function$;

create or replace function public.reschedule_appointment_for_interface(
  p_appointment_id uuid,
  p_new_professional_id uuid,
  p_new_slot_start timestamptz,
  p_reason text,
  p_origin text default 'manual',
  p_new_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_probe public.patient_appointments;
  v_old public.patient_appointments;
  v_new jsonb;
  v_new_id uuid;
  v_origin text;
  v_reason text;
  v_new_specialty_id uuid;
  v_own_professional_id uuid;
  v_general_access boolean := false;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'É necessário aceitar o termo vigente.' using errcode='42501'; end if;
  select public.capo_effective_professional_id() into v_own_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  v_general_access:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador');
  if not (v_general_access or (public.has_app_role('profissional') and v_own_professional_id is not null)) then
    raise exception 'Perfil sem autorização para remarcar.' using errcode='42501';
  end if;
  v_reason:=btrim(coalesce(p_reason,''));
  v_origin:=lower(btrim(coalesce(p_origin,'manual')));
  if char_length(v_reason)<5 or char_length(v_reason)>500 then raise exception 'O motivo deve conter entre 5 e 500 caracteres.' using errcode='22023'; end if;
  if v_origin not in ('manual','bloqueio_agenda','alteracao_agenda','faltoso') then raise exception 'Origem da remarcação inválida.' using errcode='22023'; end if;
  if char_length(coalesce(p_new_notes,''))>500 then raise exception 'Observação excede 500 caracteres.' using errcode='22023'; end if;
  select pa.* into v_probe from public.patient_appointments pa where pa.id=p_appointment_id;
  if v_probe.id is null then raise exception 'Agendamento não encontrado.' using errcode='22023'; end if;
  if not v_general_access and not (
    v_probe.professional_id=v_own_professional_id and
    p_new_professional_id=v_own_professional_id and
    lower(btrim(coalesce(v_probe.appointment_type,'')))='retorno'
  ) then
    raise exception 'Profissional pode remarcar somente o próprio retorno na própria agenda.' using errcode='42501';
  end if;
  perform public.capo_assert_patient_write_context(v_probe.patient_id);
  if v_probe.care_cycle_id is null or v_probe.specialty_id is null then raise exception 'Agendamento sem contexto canônico de ciclo não pode ser remarcado.' using errcode='22023'; end if;
  perform 1 from public.patients p where p.id=v_probe.patient_id for update;
  perform 1 from public.patient_care_cycles c where c.id=v_probe.care_cycle_id and c.patient_id=v_probe.patient_id and c.status in ('ativo','encerramento_em_andamento') for update;
  if not found then raise exception 'Ciclo do agendamento não está aberto.' using errcode='22023'; end if;
  perform 1 from public.patient_care_cycle_specialties cs where cs.care_cycle_id=v_probe.care_cycle_id and cs.specialty_id=v_probe.specialty_id for update;
  if not found then raise exception 'Especialidade do agendamento não pertence ao ciclo.' using errcode='22023'; end if;
  select pa.* into v_old from public.patient_appointments pa where pa.id=p_appointment_id for update;
  if v_old.patient_id<>v_probe.patient_id or v_old.care_cycle_id<>v_probe.care_cycle_id or v_old.specialty_id<>v_probe.specialty_id then raise exception 'Agendamento mudou durante a remarcação; repita a operação.'; end if;
  if v_old.attendance_status not in ('agendado','confirmado','faltou') then raise exception 'Este agendamento não pode ser remarcado.' using errcode='22023'; end if;
  v_new_specialty_id:=public.resolve_single_active_professional_specialty(p_new_professional_id);
  if v_new_specialty_id<>v_old.specialty_id then raise exception 'Remarcação deve permanecer na mesma especialidade do agendamento original.' using errcode='22023'; end if;
  v_new:=public.create_appointment_for_interface(v_old.patient_id,p_new_professional_id,p_new_slot_start,v_old.appointment_type,p_new_notes,v_old.operational_origin);
  v_new_id:=(v_new->>'appointment_id')::uuid;
  if (v_new->>'care_cycle_id')::uuid<>v_old.care_cycle_id or (v_new->>'specialty_id')::uuid<>v_old.specialty_id then raise exception 'Novo agendamento não preservou ciclo e especialidade da remarcação.'; end if;
  update public.patient_appointments set attendance_status='remarcado',updated_at=clock_timestamp() where id=v_old.id;
  update public.patient_appointments set rescheduled_from_id=v_old.id,reschedule_reason=v_reason,reschedule_origin=v_origin,updated_at=clock_timestamp() where id=v_new_id;
  return jsonb_build_object(
    'previous_appointment_id',v_old.id,'previous_status','remarcado','new_appointment_id',v_new_id,
    'new_professional_id',p_new_professional_id,'new_slot_start',p_new_slot_start,'reason',v_reason,'origin',v_origin,
    'operational_origin',v_old.operational_origin,'care_cycle_id',v_old.care_cycle_id,'specialty_id',v_old.specialty_id
  );
end;
$function$;

revoke all on function public.get_reschedulable_appointments(uuid,uuid,date,integer) from public,anon;
grant execute on function public.get_reschedulable_appointments(uuid,uuid,date,integer) to authenticated;
revoke all on function public.reschedule_appointment_for_interface(uuid,uuid,timestamptz,text,text,text) from public,anon;
grant execute on function public.reschedule_appointment_for_interface(uuid,uuid,timestamptz,text,text,text) to authenticated;
