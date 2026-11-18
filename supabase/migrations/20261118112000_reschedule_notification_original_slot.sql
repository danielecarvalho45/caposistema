-- Somente o corpo das novas notificações; mantém decisão, cancelamento e rota originais.
CREATE OR REPLACE FUNCTION public.respond_appointment_confirmation_link(p_token_hash text, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_link public.appointment_confirmation_links%rowtype;
  v_appointment public.patient_appointments%rowtype;
  v_name text;
begin
  if coalesce((auth.jwt()->>'role'),'')<>'service_role'
    then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_decision not in ('comparecera','nao_comparecera')
    then return jsonb_build_object('success',false,'reason','invalid'); end if;
  select * into v_link from public.appointment_confirmation_links
    where token_hash=p_token_hash for update;
  if not found or v_link.revoked_at is not null or v_link.expires_at<clock_timestamp()
    then return jsonb_build_object('success',false,'reason','expired'); end if;
  if v_link.decision is not null then
    return jsonb_build_object('success',v_link.decision=p_decision,'decision',v_link.decision,'already_recorded',true);
  end if;
  select * into v_appointment from public.patient_appointments where id=v_link.appointment_id for update;
  if not found or v_appointment.attendance_status<>'agendado'
    or v_appointment.appointment_date<=clock_timestamp() then
    return jsonb_build_object('success',false,'reason','appointment_unavailable');
  end if;
  update public.appointment_confirmation_links
    set decision=p_decision,responded_at=clock_timestamp()
    where id=v_link.id;
  if p_decision='nao_comparecera' then
    update public.patient_appointments
      set attendance_status='cancelado',
          attendance_reason='Paciente informou que não poderá comparecer pelo link individual; remarcação administrativa solicitada.',
          attendance_updated_at=clock_timestamp(),attendance_updated_by=null,updated_at=clock_timestamp()
      where id=v_appointment.id;
    select full_name into v_name from public.patients where id=v_appointment.patient_id;
    insert into public.notifications(notification_type,title,message,target_role,priority,status,patient_id,entity_type,entity_id)
      values ('appointment_patient_reschedule','Remarcação solicitada pelo paciente',
        format('Paciente: %s. Profissional: %s. Consulta original: %s. Solicitou remarcação pelo link; acesse a agenda do profissional para remarcar.',coalesce(v_name,'Paciente'), coalesce((select pr.full_name from public.professionals pr where pr.id=v_appointment.professional_id),'Profissional não identificado'),to_char(v_appointment.appointment_date at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI')),
        'administrativo_operacional','alta','pendente',v_appointment.patient_id,'patient_appointments',v_appointment.id);
  end if;
  update public.notifications set status='resolvida',resolved_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp())
    where notification_type='appointment_confirmation_unanswered'
      and entity_type='patient_appointments' and entity_id=v_appointment.id and resolved_at is null;
  return jsonb_build_object('success',true,'decision',p_decision,'appointment_released',p_decision='nao_comparecera');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.respond_family_psychology_confirmation_link(p_token_hash text, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_link public.family_psychology_confirmation_links%rowtype;
 v_appointment public.family_psychology_appointments%rowtype;
 v_name text;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
   RAISE EXCEPTION 'Acesso restrito.' USING errcode='42501';
 END IF;
 IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_decision NOT IN ('comparecera','nao_comparecera') THEN
   RETURN jsonb_build_object('success',false,'reason','invalid');
 END IF;
 SELECT * INTO v_link FROM public.family_psychology_confirmation_links
 WHERE token_hash=p_token_hash FOR UPDATE;
 IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at<clock_timestamp() THEN
   RETURN jsonb_build_object('success',false,'reason','expired');
 END IF;
 IF v_link.decision IS NOT NULL THEN
   RETURN jsonb_build_object('success',v_link.decision=p_decision,
     'decision',v_link.decision,'already_recorded',true);
 END IF;
 SELECT * INTO v_appointment FROM public.family_psychology_appointments
 WHERE id=v_link.appointment_id FOR UPDATE;
 IF NOT FOUND OR v_appointment.attendance_status<>'agendado'
    OR v_appointment.appointment_date<=clock_timestamp() THEN
   RETURN jsonb_build_object('success',false,'reason','appointment_unavailable');
 END IF;
 UPDATE public.family_psychology_confirmation_links
 SET decision=p_decision,responded_at=clock_timestamp() WHERE id=v_link.id;
 IF p_decision='nao_comparecera' THEN
   UPDATE public.family_psychology_appointments
   SET attendance_status='cancelado',
       attendance_reason='Familiar informou que não poderá comparecer pelo link individual; remarcação administrativa solicitada.',
       attendance_updated_at=clock_timestamp(),
       attendance_updated_by=NULL,updated_at=clock_timestamp()
   WHERE id=v_appointment.id;
   SELECT full_name INTO v_name FROM public.family_members WHERE id=v_appointment.family_member_id;
   INSERT INTO public.notifications(
     notification_type,title,message,target_role,priority,status,
     patient_id,entity_type,entity_id
   ) VALUES (
     'appointment_patient_reschedule','Remarcação solicitada por Familiar/Cuidador',
     format('Paciente: %s. Profissional: %s. Consulta original: %s. Solicitou remarcação pelo link; acesse a agenda do profissional para remarcar.',coalesce(v_name,'Paciente'), coalesce((select pr.full_name from public.professionals pr where pr.id=v_appointment.professional_id),'Profissional não identificado'),to_char(v_appointment.appointment_date at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI')),
     'administrativo_operacional','alta','pendente',
     v_appointment.source_patient_id,'family_psychology_appointments',v_appointment.id
   );
 END IF;
 UPDATE public.notifications SET status='resolvida',resolved_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp()) WHERE notification_type='appointment_confirmation_unanswered' AND entity_type='family_psychology_appointments' AND entity_id=v_appointment.id AND resolved_at IS NULL;
 RETURN jsonb_build_object('success',true,'decision',p_decision,
   'appointment_released',p_decision='nao_comparecera');
END;
$function$
;
