-- SQL espelhado da migração aplicada no Supabase em 03/11/2026.
-- Não registrar presença nem iniciar atendimento ao documentar avisos prévios.
CREATE TABLE IF NOT EXISTS public.appointment_previsit_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.patient_appointments(id) ON DELETE RESTRICT,
  result text NOT NULL CHECK (result IN ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao')),
  contact_method text NOT NULL DEFAULT 'whatsapp' CHECK (contact_method='whatsapp'),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_by uuid NOT NULL REFERENCES public.user_accounts(id),
  CONSTRAINT appointment_previsit_notes_limit CHECK (char_length(coalesce(notes,''))<=500)
);
CREATE INDEX IF NOT EXISTS idx_appointment_previsit_contacts_latest
ON public.appointment_previsit_contacts(appointment_id,recorded_at DESC,id DESC);
ALTER TABLE public.appointment_previsit_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_previsit_contacts FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_appointment_previsit_contacts_for_interface(p_start_date date, p_end_date date, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_is_admin boolean;
  v_professional_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id into v_account_id from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;
  v_is_admin := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  v_professional_id := case when public.has_app_role('profissional') then public.capo_effective_professional_id() else null end;
  if not v_is_admin and v_professional_id is null then
    raise exception 'Perfil sem acesso à confirmação administrativa.' using errcode='42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date<p_start_date or p_end_date-p_start_date>42 then
    raise exception 'Período inválido (máximo de 43 dias).' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
       'appointment_id', c.appointment_id,'result',c.result,
       'recorded_at',c.recorded_at,'notes',c.notes
    )), '[]'::jsonb)
    into v_result
  from (
    select distinct on (pa.id)
      ac.appointment_id,ac.result,ac.recorded_at,ac.notes
    from public.patient_appointments pa
    join public.appointment_previsit_contacts ac on ac.appointment_id=pa.id
    where (pa.appointment_date at time zone 'America/Sao_Paulo')::date between p_start_date and p_end_date
      and (p_professional_id is null or pa.professional_id=p_professional_id)
      and (v_is_admin or pa.professional_id=v_professional_id)
      and public.capo_patient_visible_in_current_context(pa.patient_id)
    order by pa.id,ac.recorded_at desc,ac.id desc
  ) c;
  return jsonb_build_object('items',v_result);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.register_appointment_previsit_contact_for_interface(p_appointment_id uuid, p_result text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_contact_id uuid;
  v_result text := lower(btrim(coalesce(p_result,'')));
  v_appointment public.patient_appointments%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id into v_account_id from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta não vinculada ou inativa.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Administrativo Operacional ou Gestor/Titular pode registrar contato prévio.' using errcode='42501';
  end if;
  if v_result not in ('avisado','confirmou','sem_resposta','solicitou_cancelamento','solicitou_remarcacao') then
    raise exception 'Resultado de contato prévio inválido.' using errcode='22023';
  end if;
  if char_length(coalesce(p_notes,''))>500 then raise exception 'Observação excede 500 caracteres.' using errcode='22023'; end if;

  select * into v_appointment from public.patient_appointments
    where id=p_appointment_id for update;
  if v_appointment.id is null then raise exception 'Agendamento inexistente.' using errcode='22023'; end if;
  if v_appointment.attendance_status <> 'agendado' then
    raise exception 'Somente consulta agendada pode receber contato prévio. Não altera presença ou falta.' using errcode='22023';
  end if;
  perform public.capo_assert_patient_write_context(v_appointment.patient_id);
  insert into public.appointment_previsit_contacts(appointment_id,result,notes,recorded_by)
  values(p_appointment_id,v_result,nullif(btrim(coalesce(p_notes,'')),''),v_account_id)
  returning id into v_contact_id;
  return jsonb_build_object('success',true,'contact_id',v_contact_id,
    'appointment_id',p_appointment_id,'result',v_result,'attendance_unchanged',true);
end;
$function$
;
REVOKE ALL ON FUNCTION public.register_appointment_previsit_contact_for_interface(uuid,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.get_appointment_previsit_contacts_for_interface(date,date,uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.register_appointment_previsit_contact_for_interface(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_previsit_contacts_for_interface(date,date,uuid) TO authenticated;
