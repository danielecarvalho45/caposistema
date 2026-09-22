create or replace function public.create_interprofessional_referral_for_interface(
  p_patient_id uuid,
  p_target_specialty_id uuid,
  p_operational_reason text,
  p_source_appointment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_origin_specialty_id uuid;
  v_cycle_id uuid;
  v_referral_id uuid := gen_random_uuid();
  v_reason text := btrim(coalesce(p_operational_reason,''));
  v_actor_role text;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null or v_professional_id is null then
    raise exception 'Conta ativa com vínculo profissional obrigatória.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'A emissão exige profissional assistencial ativo.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.get_effective_professional_capabilities(v_professional_id) c
    where c.capability_code='encaminhamento_interprofissional'
  ) then
    raise exception 'Capacidade encaminhamento_interprofissional obrigatória.' using errcode='42501';
  end if;

  v_origin_specialty_id := coalesce(
    public.capo_effective_specialty_id(),
    public.resolve_single_active_professional_specialty(v_professional_id)
  );
  if v_origin_specialty_id is null then
    raise exception 'Contexto de especialidade de origem obrigatório.' using errcode='42501';
  end if;
  if p_target_specialty_id is null or p_target_specialty_id=v_origin_specialty_id then
    raise exception 'Selecione uma especialidade de destino diferente da origem.' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.specialties s
    where s.id=p_target_specialty_id and s.is_active=true
  ) then
    raise exception 'Especialidade de destino inexistente ou inativa.' using errcode='22023';
  end if;
  if char_length(v_reason)<5 or char_length(v_reason)>1000 then
    raise exception 'A informação operacional deve possuir entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  perform 1 from public.patients p
  where p.id=p_patient_id and p.status='ativo' and coalesce(p.deceased,false)=false
    and public.capo_patient_visible_in_current_context(p.id)
  for update;
  if not found then
    raise exception 'Paciente inexistente, inativo ou fora do seu escopo.' using errcode='42501';
  end if;

  select c.id into v_cycle_id
  from public.patient_care_cycles c
  where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc limit 1 for update;
  if v_cycle_id is null then
    raise exception 'Paciente sem ciclo CAPO aberto.' using errcode='22023';
  end if;

  if p_source_appointment_id is not null and not exists (
    select 1 from public.patient_appointments a
    where a.id=p_source_appointment_id and a.patient_id=p_patient_id
      and a.professional_id=v_professional_id and a.care_cycle_id=v_cycle_id
      and a.attendance_status not in ('cancelado','remarcado')
  ) then
    raise exception 'Atendimento de origem inválido para este encaminhamento.' using errcode='22023';
  end if;

  if exists (
    select 1 from public.referrals r
    where r.patient_id=p_patient_id
      and r.requesting_professional_id=v_professional_id
      and r.requested_specialty_id=p_target_specialty_id
      and lower(r.destination)='administrativo'
      and r.status in ('pending_approval','approved','in_progress')
  ) then
    raise exception 'Já existe encaminhamento ativo para este paciente e especialidade.' using errcode='23505';
  end if;

  insert into public.referrals(
    id,patient_id,requesting_professional_id,origin_specialty_id,
    requested_specialty_id,destination,reason,status,care_cycle_id,
    source_appointment_id,created_at,updated_at
  ) values (
    v_referral_id,p_patient_id,v_professional_id,v_origin_specialty_id,
    p_target_specialty_id,'administrativo',v_reason,'pending_approval',v_cycle_id,
    p_source_appointment_id,v_now,v_now
  );

  select ar.code into v_actor_role
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc,ar.code limit 1;

  insert into public.referral_events(
    referral_id,event_type,from_status,to_status,detail,
    actor_user_account_id,actor_role,created_at
  ) values (
    v_referral_id,'created',null,'pending_approval',v_reason,
    v_account_id,v_actor_role,v_now
  );

  return jsonb_build_object(
    'success',true,'referral_id',v_referral_id,'status','pending_approval',
    'created_at',v_now
  );
end;
$function$;

revoke all on function public.create_interprofessional_referral_for_interface(uuid,uuid,text,uuid)
  from public, anon;
grant execute on function public.create_interprofessional_referral_for_interface(uuid,uuid,text,uuid)
  to authenticated;
