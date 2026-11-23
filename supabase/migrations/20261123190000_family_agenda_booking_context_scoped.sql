-- CAPO: contexto de agendamento de familiar/cuidador, somente leitura.
-- A identidade do familiar nunca se torna patient_id do paciente vinculado.
create or replace function public.get_family_agenda_booking_context_for_interface(
  p_family_member_id uuid
) returns jsonb
language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_link public.patient_family_links%rowtype;
  v_family public.family_members%rowtype;
  v_patient_name text;
  v_last jsonb;
  v_queue jsonb;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão ou termo vigente inválido.' using errcode='42501';
  end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente administração autorizada pode preparar agendamento familiar.' using errcode='42501';
  end if;
  if not exists (select 1 from public.user_accounts where auth_user_id=auth.uid() and is_active) then
    raise exception 'Conta ativa não localizada.' using errcode='42501';
  end if;
  select * into v_family from public.family_members where id=p_family_member_id;
  if not found or not public.capo_family_member_visible_in_current_context(p_family_member_id) then
    raise exception 'Familiar não localizado no contexto autorizado.' using errcode='42501';
  end if;
  select pfl.* into v_link from public.patient_family_links pfl
  where pfl.family_member_id=p_family_member_id and pfl.unlinked_at is null
    and public.capo_patient_visible_in_current_context(pfl.patient_id)
  order by pfl.created_at desc, pfl.id desc limit 1;
  if not found then raise exception 'Vínculo ativo e autorizado não localizado.' using errcode='22023'; end if;
  select p.full_name into v_patient_name from public.patients p where p.id=v_link.patient_id;

  select jsonb_build_object(
    'appointment_id',fa.id,'family_member_id',fa.family_member_id,
    'family_name',v_family.full_name,'family_phone',v_family.phone,
    'professional_id',fa.professional_id,'professional_name',pr.full_name,
    'appointment_date',fa.appointment_date,'attendance_status',fa.attendance_status,
    'appointment_kind',fa.appointment_kind
  ) into v_last
  from public.family_psychology_appointments fa
  join public.professionals pr on pr.id=fa.professional_id
  where fa.family_member_id=p_family_member_id
    and fa.source_patient_id=v_link.patient_id
    and private.capo_professional_visible_in_current_context(fa.professional_id)
  order by
    case when fa.attendance_status in ('agendado','confirmado') then 0
         when fa.attendance_status='realizado' then 1 else 2 end,
    fa.appointment_date desc,fa.id desc limit 1;

  select jsonb_build_object('waiting_list_id',q.id,'status',q.status)
    into v_queue from public.family_psychology_waiting_list q
  where q.family_link_id=v_link.id and q.family_member_id=p_family_member_id
  order by case when q.status in ('waiting','called') then 0 else 1 end,
           q.entered_at desc,q.id desc limit 1;

  return jsonb_build_object(
    'family_member_id',v_family.id,'family_name',v_family.full_name,
    'family_phone',v_family.phone,'family_capo_number',v_family.capo_number,
    'family_cms',v_family.cms,'family_link_id',v_link.id,
    'source_patient_id',v_link.patient_id,'source_patient_name',v_patient_name,
    'appointment',v_last,'queue',v_queue);
end;
$function$;
revoke all on function public.get_family_agenda_booking_context_for_interface(uuid) from public,anon;
grant execute on function public.get_family_agenda_booking_context_for_interface(uuid) to authenticated;
