-- VERDE 24/11/2026: remarcação solicitada por link com conclusão atômica.
-- Não apaga consulta original, preserva cancelado/histórico, não altera outras agendas.
-- O aviso administrativo só é resolvido após o novo agendamento estar gravado com vínculo.
CREATE OR REPLACE FUNCTION public.rebook_patient_link_cancellation_for_interface(p_appointment_id uuid, p_new_professional_id uuid, p_new_slot_start timestamp with time zone, p_new_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
 v_old public.patient_appointments%rowtype;
 v_account uuid;
 v_new jsonb;
 v_new_id uuid;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
   or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
 then raise exception 'Remarcação pelo link é atribuição administrativa.' using errcode='42501'; end if;

 select ua.id into v_account
 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
 if v_account is null then raise exception 'Conta administrativa inativa.' using errcode='42501'; end if;

 if p_appointment_id is null or p_new_professional_id is null or
    p_new_slot_start is null or p_new_slot_start<=clock_timestamp()
 then raise exception 'Informe a consulta original, o profissional e um horário futuro.' using errcode='22023'; end if;

 if char_length(coalesce(p_new_notes,''))>500
 then raise exception 'Observação excede 500 caracteres.' using errcode='22023'; end if;

 select * into v_old from public.patient_appointments
 where id=p_appointment_id for update;

 if v_old.id is null or v_old.attendance_status<>'cancelado'
   or not exists (
     select 1 from public.appointment_confirmation_links l
     where l.appointment_id=v_old.id and l.decision='nao_comparecera'
   )
   or not exists (
     select 1 from public.notifications n
     where n.notification_type='appointment_patient_reschedule'
       and n.entity_type='patient_appointments' and n.entity_id=v_old.id
       and n.resolved_at is null
   )
 then raise exception 'Consulta cancelada pelo link sem solicitação pendente, já concluída ou inexistente.' using errcode='22023'; end if;

 perform public.capo_assert_patient_write_context(v_old.patient_id);

 if p_new_professional_id<>v_old.professional_id
 then raise exception 'Remarcação pelo link deve permanecer na agenda do profissional original.' using errcode='22023'; end if;

 if v_old.care_cycle_id is null or v_old.specialty_id is null
 then raise exception 'Agendamento original sem ciclo/especialidade válida.' using errcode='22023'; end if;

 if exists (
   select 1 from public.patient_appointments next
   where next.rescheduled_from_id=v_old.id
     and next.attendance_status not in ('cancelado','remarcado')
 )
 then raise exception 'Esta solicitação já possui agendamento novo ativo.' using errcode='22023'; end if;

 -- Nunca reativar a consulta cancelada: ela permanece em histórico/cancelamentos.
 v_new:=public.create_appointment_for_interface(
   v_old.patient_id,v_old.professional_id,p_new_slot_start,
   v_old.appointment_type,p_new_notes,'cancelamento_link_paciente'
 );
 v_new_id:=(v_new->>'appointment_id')::uuid;
 if v_new_id is null
    or (v_new->>'care_cycle_id')::uuid is distinct from v_old.care_cycle_id
    or (v_new->>'specialty_id')::uuid is distinct from v_old.specialty_id
 then raise exception 'Novo agendamento não preservou ciclo e especialidade da consulta anterior.'; end if;

 update public.patient_appointments
 set rescheduled_from_id=v_old.id,
     reschedule_origin='paciente_link',
     reschedule_reason='Solicitação pelo link de confirmação',
     updated_at=clock_timestamp()
 where id=v_new_id;

 update public.notifications
 set status='resolvida',resolved_at=clock_timestamp(),
     resolved_by=v_account,read_at=coalesce(read_at,clock_timestamp()),
     notes=concat_ws(E'\n',nullif(notes,''),'Remarcação efetivada. Nova consulta vinculada: '||v_new_id::text)
 where notification_type='appointment_patient_reschedule'
   and entity_type='patient_appointments' and entity_id=v_old.id
   and resolved_at is null;

 return v_new || jsonb_build_object(
   'success',true,'previous_appointment_id',v_old.id,
   'new_appointment_id',v_new_id,'reschedule_origin','paciente_link',
   'notification_resolved',true
 );
end;
$function$
;
revoke all on function public.rebook_patient_link_cancellation_for_interface(uuid,uuid,timestamptz,text) from public,anon;
grant execute on function public.rebook_patient_link_cancellation_for_interface(uuid,uuid,timestamptz,text) to authenticated;
