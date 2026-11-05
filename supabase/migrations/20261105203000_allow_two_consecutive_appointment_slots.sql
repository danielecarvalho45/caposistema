-- CAPO: agendamento excepcional de dois blocos contíguos; a RPC padrão fica intacta.
CREATE OR REPLACE FUNCTION public.create_extended_appointment_for_interface(p_patient_id uuid, p_professional_id uuid, p_slot_start timestamp with time zone, p_appointment_type text, p_general_notes text DEFAULT NULL::text, p_operational_origin text DEFAULT NULL::text, p_slot_count integer DEFAULT 2)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_own_professional_id uuid;
  v_type_raw text;
  v_type text;
  v_origin text;
  v_appointment public.patient_appointments;
  v_cycle_id uuid;
  v_specialty_id uuid;
  v_first_end timestamptz;
  v_appointment_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_own_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  v_type_raw := lower(btrim(coalesce(p_appointment_type,'')));

  v_type := case
    when v_type_raw in (
      'primeiro_capo',
      'primeiro_atendimento_capo',
      'primeiro atendimento capo',
      'primeiro atendimento no capo'
    ) then 'primeiro_capo'
    when v_type_raw in (
      'primeiro_especialidade',
      'primeiro_atendimento_especialidade',
      'primeiro atendimento especialidade',
      'primeiro atendimento na especialidade'
    ) then 'primeiro_especialidade'
    when v_type_raw='primeira_consulta' then 'primeira_consulta'
    when v_type_raw='retorno' then 'retorno'
    when v_type_raw='grupo' then 'grupo'
    when v_type_raw='avaliacao' then 'avaliacao'
    when v_type_raw='outro' then 'outro'
    when v_type_raw in ('remarcacao','remarcação') then
      null
    else null
  end;

  if v_type is null then
    if v_type_raw in ('remarcacao','remarcação') then
      raise exception 'Remarcação deve utilizar o fluxo próprio de remarcação.' using errcode='22023';
    end if;
    raise exception 'Tipo de agendamento inválido.' using errcode='22023';
  end if;

  if v_type in ('primeira_consulta','primeiro_capo','primeiro_especialidade') then
    if not (
      public.has_app_role('administrador')
      or public.has_app_role('administrativo_operacional')
    ) then
      raise exception 'Primeiro agendamento deve ser realizado pelo Administrativo.' using errcode='42501';
    end if;
  elsif not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador')
    or (
      public.has_app_role('profissional')
      and v_own_professional_id=p_professional_id
      and v_type='retorno'
    )
  ) then
    raise exception 'Perfil sem autorização para este agendamento.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);

  perform 1
  from public.patients p
  where p.id=p_patient_id
    and p.status='ativo'
    and p.deceased=false
  for update;

  if not found then
    raise exception 'Paciente inexistente, inativo ou com óbito registrado.' using errcode='22023';
  end if;

  if not exists(
    select 1
    from public.professionals p
    where p.id=p_professional_id
      and p.status='ativo'
      and p.is_professional=true
  ) then
    raise exception 'Profissional inexistente ou inativo.' using errcode='22023';
  end if;

  v_specialty_id := public.resolve_single_active_professional_specialty(p_professional_id);

  select c.id
    into v_cycle_id
  from public.patient_care_cycles c
  where c.patient_id=p_patient_id
    and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc
  limit 1
  for update;

  if v_cycle_id is null then
    raise exception 'Paciente sem ciclo CAPO aberto; agendamento não pode criar ciclo automaticamente.' using errcode='22023';
  end if;

  perform public.ensure_cycle_specialty(
    v_cycle_id,
    v_specialty_id,
    'agenda',
    null,
    v_account_id,
    p_professional_id
  );

  if p_slot_start is null then
    raise exception 'Horário obrigatório.' using errcode='22023';
  end if;

  if p_slot_count <> 2 or p_slot_count is null then
    raise exception 'A extensão deve ocupar exatamente dois blocos consecutivos.' using errcode='22023';
  end if;

  -- Duas vagas livres e contíguas da mesma grade; nunca ultrapassar intervalos.
  select first_slot.slot_end, second_slot.slot_end
    into v_first_end, v_appointment_end
  from public.get_available_appointment_slots(
    p_professional_id,
    (p_slot_start at time zone 'America/Sao_Paulo')::date
  ) first_slot
  join public.get_available_appointment_slots(
    p_professional_id,
    (p_slot_start at time zone 'America/Sao_Paulo')::date
  ) second_slot
    on second_slot.slot_start=first_slot.slot_end
   and second_slot.duration_minutes=first_slot.duration_minutes
  where first_slot.slot_start=p_slot_start
  limit 1;

  if v_appointment_end is null then
    raise exception 'São necessários dois horários consecutivos e livres na agenda.' using errcode='22023';
  end if;

  if char_length(coalesce(p_general_notes,''))>500 then
    raise exception 'Observação excede 500 caracteres.' using errcode='22023';
  end if;

  v_origin := nullif(btrim(coalesce(p_operational_origin,'')),'');
  if v_origin is not null and char_length(v_origin) not between 2 and 200 then
    raise exception 'Origem operacional deve possuir entre 2 e 200 caracteres.' using errcode='22023';
  end if;

  insert into public.patient_appointments(
    patient_id,
    professional_id,
    appointment_date,
    appointment_end,
    appointment_type,
    attendance_status,
    general_notes,
    care_cycle_id,
    specialty_id,
    operational_origin
  ) values (
    p_patient_id,
    p_professional_id,
    p_slot_start,
    v_appointment_end,
    v_type,
    'agendado',
    nullif(btrim(coalesce(p_general_notes,'')),''),
    v_cycle_id,
    v_specialty_id,
    v_origin
  )
  returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id',v_appointment.id,
    'patient_id',v_appointment.patient_id,
    'professional_id',v_appointment.professional_id,
    'appointment_date',v_appointment.appointment_date,
    'appointment_end',v_appointment.appointment_end,
    'appointment_type',v_appointment.appointment_type,
    'attendance_status',v_appointment.attendance_status,
    'care_cycle_id',v_appointment.care_cycle_id,
    'specialty_id',v_appointment.specialty_id,
    'operational_origin',v_appointment.operational_origin
  );
end;
$function$
;
REVOKE ALL ON FUNCTION public.create_extended_appointment_for_interface(uuid,uuid,timestamptz,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_extended_appointment_for_interface(uuid,uuid,timestamptz,text,text,text,integer) TO authenticated;
