-- CAPO: remarcação individual de participante dentro da mesma terapia em grupo.
-- Reutiliza a reserva transacional já existente, mantendo capacidade e proteção de conflitos.
create or replace function public.reschedule_psychology_group_participant_for_interface(
  p_appointment_id uuid, p_new_date date, p_reason text default null
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp' as $function$
declare
  v_patient_id uuid;
  v_old public.patient_appointments%rowtype;
  v_booking jsonb;
  v_new_id uuid;
  v_new_start timestamptz;
  v_reason text;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão não autorizada.' using errcode='42501';
  end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o setor administrativo pode remarcar participantes.' using errcode='42501';
  end if;
  v_reason:=nullif(btrim(coalesce(p_reason,'')),'');
  if length(coalesce(v_reason,''))>500 then
    raise exception 'O motivo excede 500 caracteres.' using errcode='22023';
  end if;
  if p_new_date is null or p_new_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Selecione uma data atual ou futura.' using errcode='22023';
  end if;
  select pa.patient_id into v_patient_id
    from public.patient_appointments pa where pa.id=p_appointment_id;
  if v_patient_id is null then raise exception 'Agendamento não localizado.' using errcode='22023'; end if;
  perform public.capo_assert_patient_write_context(v_patient_id);
  perform 1 from public.patients p where p.id=v_patient_id for update;
  select * into v_old from public.patient_appointments pa
    where pa.id=p_appointment_id for update;
  if v_old.id is null or v_old.patient_id<>v_patient_id
     or v_old.psychology_group_block_id is null
     or v_old.attendance_status not in ('agendado','confirmado','faltou') then
    raise exception 'Participação em grupo não está elegível para remarcação.' using errcode='22023';
  end if;
  if p_new_date=(v_old.appointment_date at time zone 'America/Sao_Paulo')::date then
    raise exception 'A nova data deve ser diferente da sessão original.' using errcode='22023';
  end if;

  -- A reserva oficial verifica sessão ativa, dia semanal, vagas, pacientes e bloqueios.
  -- Falha nesse passo desfaz a operação inteira, sem alterar o atendimento original.
  v_booking:=public.book_psychology_group_participant_for_interface(
    v_old.psychology_group_block_id,p_new_date,v_old.patient_id);
  if not coalesce((v_booking->>'success')::boolean,false) then
    raise exception 'Não foi possível reservar a nova vaga.' using errcode='22023';
  end if;
  v_new_id:=(v_booking->>'appointment_id')::uuid;
  if v_new_id is null then raise exception 'Nova consulta não confirmada.'; end if;

  update public.patient_appointments
    set attendance_status='remarcado',updated_at=clock_timestamp()
    where id=v_old.id;
  update public.patient_appointments
    set rescheduled_from_id=v_old.id,reschedule_reason=v_reason,
        reschedule_origin='manual',updated_at=clock_timestamp()
    where id=v_new_id;
  select pa.appointment_date into v_new_start from public.patient_appointments pa where pa.id=v_new_id;

  return jsonb_build_object(
    'success',true,'previous_appointment_id',v_old.id,
    'new_appointment_id',v_new_id,'new_appointment_start',v_new_start,
    'group_id',v_old.psychology_group_block_id
  );
end;
$function$;
revoke all on function public.reschedule_psychology_group_participant_for_interface(uuid,date,text) from public,anon;
grant execute on function public.reschedule_psychology_group_participant_for_interface(uuid,date,text) to authenticated;
