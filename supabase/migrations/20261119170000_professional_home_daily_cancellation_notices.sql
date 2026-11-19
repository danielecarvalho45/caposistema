-- CAPO: consulta exclusivamente de leitura dos cancelamentos do dia, restrita ao próprio profissional.
create or replace function public.get_my_daily_appointment_cancellations_for_interface(p_date date)
returns table(appointment_id uuid, appointment_date timestamptz, patient_name text, cancellation_reason text, cancelled_at timestamptz, cancelled_by text)
language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare v_professional_id uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo legal inválido.' using errcode='42501';
  end if;
  if not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true) then
    raise exception 'Conta inexistente ou inativa.' using errcode='42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Consulta exclusiva do perfil profissional.' using errcode='42501';
  end if;
  v_professional_id:=public.capo_effective_professional_id();
  if v_professional_id is null then
    raise exception 'Profissional não identificado.' using errcode='42501';
  end if;
  if p_date is null then
    raise exception 'Data obrigatória.' using errcode='22023';
  end if;
  return query
    select pa.id,pa.appointment_date,pt.full_name,
      coalesce(nullif(btrim(pa.attendance_reason),''),'Motivo não informado')::text,
      coalesce(pa.attendance_updated_at,pa.updated_at),
      coalesce(actor.username,'Não identificado')::text
    from public.patient_appointments pa
    join public.patients pt on pt.id=pa.patient_id
    left join public.user_accounts actor on actor.id=pa.attendance_updated_by
    where pa.professional_id=v_professional_id
      and pa.attendance_status='cancelado'
      and (pa.appointment_date at time zone 'America/Sao_Paulo')::date=p_date
      and public.capo_patient_visible_in_current_context(pa.patient_id)
    order by pa.appointment_date,pa.id
    limit 100;
end;
$function$;
revoke all on function public.get_my_daily_appointment_cancellations_for_interface(date) from public,anon;
grant execute on function public.get_my_daily_appointment_cancellations_for_interface(date) to authenticated;
