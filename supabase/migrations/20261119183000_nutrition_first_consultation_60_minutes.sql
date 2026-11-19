-- VERDE: primeira consulta Nutrição 60 minutos, retorno conforme grade de 30 min.
-- Preserva assinatura da RPC, rotina de remarcação, intervalos e demais especialidades.
CREATE OR REPLACE FUNCTION public.create_appointment_for_interface(p_patient_id uuid, p_professional_id uuid, p_slot_start timestamp with time zone, p_appointment_type text, p_general_notes text DEFAULT NULL::text, p_operational_origin text DEFAULT NULL::text)
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
  v_nutrition_slot_minutes integer;
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

  -- Nutrição: nenhum campo novo na interface. O tipo já selecionado
  -- determina a duração; retorno segue a grade normal de 30 minutos.
  -- A mesma RPC é chamada na remarcação, preservando 60 minutos.
  if v_type in ('primeiro_capo','primeiro_especialidade','primeira_consulta')
     and exists (
       select 1 from public.specialties sp
       where sp.id=v_specialty_id
         and lower(btrim(sp.name)) in ('nutrição','nutricao')
     ) then
    if p_slot_start is null then
      raise exception 'Horário obrigatório.' using errcode='22023';
    end if;

    -- Só examinar o horário já escolhido na grade oficial; não cria slots,
    -- não modifica configurações e não ignora bloqueios/intervalos.
    select s.duration_minutes into v_nutrition_slot_minutes
    from public.get_available_appointment_slots(
      p_professional_id,
      (p_slot_start at time zone 'America/Sao_Paulo')::date
    ) s
    where s.slot_start=p_slot_start
    limit 1;

    if v_nutrition_slot_minutes is null then
      raise exception 'Horário indisponível.' using errcode='22023';
    end if;

    if v_nutrition_slot_minutes=30 then
      -- Um único registro de 60 min; a RPC existente valida dois blocos
      -- livres, consecutivos, sem intervalo/bloqueio e sem sobreposição.
      return public.create_extended_appointment_for_interface(
        p_patient_id,p_professional_id,p_slot_start,p_appointment_type,
        p_general_notes,p_operational_origin,2
      );
    elsif v_nutrition_slot_minutes<>60 then
      raise exception 'Primeira consulta de Nutrição exige 60 minutos. Verifique a grade do profissional.'
        using errcode='22023';
    end if;
    -- Grade já configurada em 60 minutos: agendamento simples original.
  end if;

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

  if not exists(
    select 1
    from public.get_available_appointment_slots(
      p_professional_id,
      (p_slot_start at time zone 'America/Sao_Paulo')::date
    ) s
    where s.slot_start=p_slot_start
  ) then
    raise exception 'Horário indisponível.' using errcode='22023';
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
