-- VERDE 19/11/2026 — retificação de confirmação administrativa incorreta.
-- Preserva consultas, respostas dos links e históricos anteriores.
create table if not exists public.capo_manual_confirmation_corrections (
 id uuid primary key default gen_random_uuid(),
 appointment_id uuid not null,
 appointment_kind text not null check (appointment_kind in ('patient','family')),
 previous_contact_id uuid not null,
 previous_result text not null,
 corrected_result text not null check (corrected_result in ('correcao_pendente','avisado','sem_resposta')),
 reason text not null check (char_length(btrim(reason)) between 5 and 500),
 corrected_by uuid not null references public.user_accounts(id),
 corrected_at timestamptz not null default clock_timestamp()
);
create index if not exists capo_manual_confirmation_corrections_appt_idx
 on public.capo_manual_confirmation_corrections(appointment_kind,appointment_id,corrected_at desc);
alter table public.capo_manual_confirmation_corrections enable row level security;
revoke all on public.capo_manual_confirmation_corrections from public,anon,authenticated;

alter table public.appointment_previsit_contacts
 drop constraint if exists appointment_previsit_contacts_result_check;
alter table public.appointment_previsit_contacts
 add constraint appointment_previsit_contacts_result_check
 check (result in ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao','correcao_pendente'));
alter table public.family_psychology_previsit_contacts
 drop constraint if exists family_psychology_previsit_contacts_result_check;
alter table public.family_psychology_previsit_contacts
 add constraint family_psychology_previsit_contacts_result_check
 check (result in ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao','correcao_pendente'));

create or replace function public.correct_manual_previsit_confirmation_for_interface(
 p_appointment_id uuid, p_kind text, p_result text, p_reason text
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
 v_account uuid;
 v_patient uuid;
 v_attendance text;
 v_previous_id uuid;
 v_previous_result text;
 v_result text := case when p_result='pendente' then 'correcao_pendente' else lower(btrim(coalesce(p_result,''))) end;
 v_kind text := lower(btrim(coalesce(p_kind,'')));
 v_entity text;
 v_prior_alert boolean;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
 then raise exception 'Sessão autenticada e termo vigente obrigatórios.' using errcode='42501'; end if;
 select id into v_account from public.user_accounts where auth_user_id=auth.uid() and is_active=true limit 1;
 if v_account is null or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
 then raise exception 'Apenas Gestor/Titular ou AO podem corrigir confirmação administrativa.' using errcode='42501'; end if;
 if v_kind not in ('patient','family') or v_result not in ('correcao_pendente','avisado','sem_resposta')
 then raise exception 'Tipo ou resultado de correção inválido.' using errcode='22023'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 5 and 500
 then raise exception 'Informe o motivo da correção (5 a 500 caracteres).' using errcode='22023'; end if;
 if v_kind='patient' then
   select patient_id,attendance_status into v_patient,v_attendance
   from public.patient_appointments where id=p_appointment_id for update;
   v_entity:='patient_appointments';
 else
   select source_patient_id,attendance_status into v_patient,v_attendance
   from public.family_psychology_appointments where id=p_appointment_id for update;
   v_entity:='family_psychology_appointments';
 end if;
 if v_patient is null or v_attendance is distinct from 'agendado'
 then raise exception 'Somente consulta agendada pode ter confirmação administrativa corrigida.' using errcode='22023'; end if;
 perform public.capo_assert_patient_write_context(v_patient);
 if v_kind='patient' then
   if exists(select 1 from public.appointment_confirmation_links
     where appointment_id=p_appointment_id and decision='comparecera' and responded_at is not null)
   then raise exception 'Confirmação realizada pelo próprio paciente não pode ser revertida administrativamente.' using errcode='42501'; end if;
   select id,result into v_previous_id,v_previous_result
   from public.appointment_previsit_contacts where appointment_id=p_appointment_id
   order by recorded_at desc,id desc limit 1 for update;
 else
   if exists(select 1 from public.family_psychology_confirmation_links
     where appointment_id=p_appointment_id and decision='comparecera' and responded_at is not null)
   then raise exception 'Confirmação pelo link do familiar não pode ser revertida administrativamente.' using errcode='42501'; end if;
   select id,result into v_previous_id,v_previous_result
   from public.family_psychology_previsit_contacts where appointment_id=p_appointment_id
   order by recorded_at desc,id desc limit 1 for update;
 end if;
 if v_previous_result is distinct from 'confirmou'
 then raise exception 'A última informação não é uma confirmação manual a corrigir. Atualize a agenda.' using errcode='22023'; end if;
 if v_kind='patient' then
   insert into public.appointment_previsit_contacts(appointment_id,result,notes,recorded_by)
   values(p_appointment_id,v_result,left('Correção de confirmação manual: '||btrim(p_reason),500),v_account);
 else
   insert into public.family_psychology_previsit_contacts(appointment_id,result,recorded_by)
   values(p_appointment_id,v_result,v_account);
 end if;
 insert into public.capo_manual_confirmation_corrections
 (appointment_id,appointment_kind,previous_contact_id,previous_result,corrected_result,reason,corrected_by)
 values(p_appointment_id,v_kind,v_previous_id,v_previous_result,v_result,btrim(p_reason),v_account);
 -- Restaurar acompanhamento operacional sem reabrir/apagar o aviso resolvido.
 -- Criar no máximo uma pendência ativa somente quando existia alerta anterior encerrado.
 select exists(select 1 from public.notifications n
    where n.entity_type=v_entity and n.entity_id=p_appointment_id
      and n.notification_type='appointment_confirmation_unanswered' and n.resolved_at is not null)
 into v_prior_alert;
 if v_prior_alert and not exists(select 1 from public.notifications n
    where n.entity_type=v_entity and n.entity_id=p_appointment_id
      and n.notification_type='appointment_confirmation_unanswered' and n.resolved_at is null) then
   perform public.capo_criar_notificacao(
     'administrativo_operacional',null,'appointment_confirmation_unanswered',
     'Confirmação prévia corrigida — retorno pendente',
     'Confirmação manual retificada pelo Administrativo. Verifique a resposta do paciente antes de concluir.',
     v_entity,p_appointment_id,'normal');
 end if;
 return jsonb_build_object('success',true,'appointment_id',p_appointment_id,
   'result',v_result,'attendance_unchanged',true,'correction_recorded',true);
end;
$function$;
revoke all on function public.correct_manual_previsit_confirmation_for_interface(uuid,text,text,text) from public,anon;
grant execute on function public.correct_manual_previsit_confirmation_for_interface(uuid,text,text,text) to authenticated;
