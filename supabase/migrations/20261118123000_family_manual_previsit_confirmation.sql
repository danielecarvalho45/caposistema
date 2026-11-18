-- Inclusão exclusiva do resultado 'confirmou' para familiar/cuidador.
-- Mesma sessão, perfis, auditoria e proibição de alterar presença.
ALTER TABLE public.family_psychology_previsit_contacts
  DROP CONSTRAINT family_psychology_previsit_contacts_result_check;
ALTER TABLE public.family_psychology_previsit_contacts
  ADD CONSTRAINT family_psychology_previsit_contacts_result_check CHECK (
    result IN ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao'));
CREATE OR REPLACE FUNCTION public.register_family_psychology_previsit_contact_for_interface(p_appointment_id uuid, p_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_account uuid; v_appt public.family_psychology_appointments%rowtype; v_result text:=lower(btrim(coalesce(p_result,''))); v_id uuid;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
  raise exception 'Sessão e termo vigente obrigatórios.' using errcode='42501';
 end if;
 if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
  raise exception 'Ação exclusiva do Administrativo ou Gestor.' using errcode='42501';
 end if;
 select id into v_account from public.user_accounts where auth_user_id=auth.uid() and is_active limit 1;
 if v_account is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
 if v_result not in ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao') then
  raise exception 'Resultado inválido.' using errcode='22023';
 end if;
 select * into v_appt from public.family_psychology_appointments where id=p_appointment_id for update;
 if v_appt.id is null or v_appt.attendance_status <> 'agendado' then
  raise exception 'Atendimento familiar não está agendado.' using errcode='22023';
 end if;
 perform public.capo_assert_patient_write_context(v_appt.source_patient_id);
 insert into public.family_psychology_previsit_contacts(appointment_id,result,recorded_by)
 values(p_appointment_id,v_result,v_account) returning id into v_id;
 return jsonb_build_object('success',true,'contact_id',v_id,'appointment_id',p_appointment_id,'result',v_result,'attendance_unchanged',true);
end;
$function$
;
