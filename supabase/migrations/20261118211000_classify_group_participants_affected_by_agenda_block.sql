-- CAPO: classificar participantes da Psicologia em grupo entre os afetados pelo bloqueio.
-- Preserva assinatura, filtros RLS contextuais e integrantes de familiares.
CREATE OR REPLACE FUNCTION public.get_agenda_block_affected_for_interface(p_agenda_config_id uuid, p_date date, p_start_time time without time zone, p_end_time time without time zone)
 RETURNS TABLE(appointment_id uuid, appointment_kind text, person_id uuid, person_name text, professional_id uuid, appointment_date timestamp with time zone, appointment_end timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_professional_id uuid;
  v_own_professional_id uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo vigente inválido.' using errcode='42501';
  end if;
  select ac.professional_id into v_professional_id
    from public.agenda_configs ac where ac.id=p_agenda_config_id and ac.is_active=true;
  if v_professional_id is null then raise exception 'Agenda não encontrada.' using errcode='22023'; end if;
  if not private.capo_professional_visible_in_current_context(v_professional_id) then
    raise exception 'Agenda fora do ambiente autorizado.' using errcode='42501';
  end if;
  select public.capo_effective_professional_id() into v_own_professional_id;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')
      or public.has_app_role('coordenador')
      or (public.has_app_role('profissional') and v_own_professional_id=v_professional_id)) then
    raise exception 'Sem acesso à agenda.' using errcode='42501';
  end if;
  if p_date is null or p_start_time is null or p_end_time is null or p_end_time<=p_start_time then
    raise exception 'Período inválido.' using errcode='22023';
  end if;
  return query
    select pa.id, CASE WHEN pa.psychology_group_block_id IS NOT NULL THEN 'grupo'::text ELSE 'paciente'::text END, pa.patient_id, p.full_name, pa.professional_id,
           pa.appointment_date,pa.appointment_end
      from public.patient_appointments pa join public.patients p on p.id=pa.patient_id
     where pa.professional_id=v_professional_id
       and public.capo_patient_visible_in_current_context(pa.patient_id)
       and lower(coalesce(pa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
       and (pa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
       and (pa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
       and (pa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time
    union all
    select fa.id, 'familiar'::text, fa.family_member_id, fm.full_name, fa.professional_id,
           fa.appointment_date,fa.appointment_end
      from public.family_psychology_appointments fa
      join public.family_members fm on fm.id=fa.family_member_id
     where fa.professional_id=v_professional_id
       and public.capo_patient_visible_in_current_context(fa.source_patient_id)
       and lower(coalesce(fa.attendance_status,'agendado')) not in ('cancelado','cancelada','remarcado','remarcada')
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
       and (fa.appointment_date at time zone 'America/Sao_Paulo')::time<p_end_time
       and (fa.appointment_end at time zone 'America/Sao_Paulo')::time>p_start_time;
end;
$function$;
