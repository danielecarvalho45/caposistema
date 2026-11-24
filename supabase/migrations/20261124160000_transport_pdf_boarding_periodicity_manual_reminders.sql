-- Complemento pontual de Transporte autorizado pela Titular em 24/11/2026.
-- Endereço de embarque exclusivo da solicitação, periodicidade e lembrete manual.
-- Preserva integralmente patients.address e patient_appointments.
alter table public.transport_requests
  add column if not exists boarding_address text,
  add column if not exists boarding_source text,
  add column if not exists periodicity text,
  add column if not exists pdf_details_confirmed_at timestamptz,
  add column if not exists pdf_details_confirmed_by uuid references public.user_accounts(id);
alter table public.transport_requests drop constraint if exists transport_requests_boarding_source_check;
alter table public.transport_requests add constraint transport_requests_boarding_source_check
  check (boarding_source is null or boarding_source in ('cadastro','alternativo'));
alter table public.transport_requests drop constraint if exists transport_requests_periodicity_check;
alter table public.transport_requests add constraint transport_requests_periodicity_check
  check (periodicity is null or periodicity in ('unica','semanal','quinzenal'));
CREATE OR REPLACE FUNCTION public.get_transport_context_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid; v_professional_id uuid; v_admin boolean; v_social boolean; v_allowed boolean; v_result jsonb;
begin
  perform public.capo_assert_patient_read_context(p_patient_id);
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;
  select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.'; end if;
  v_admin := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');
  v_social := v_professional_id is not null and exists(
    select 1 from public.professionals pr join public.professional_specialties ps on ps.professional_id=pr.id join public.specialties sp on sp.id=ps.specialty_id
    where pr.id=v_professional_id and pr.status='ativo' and pr.is_professional=true and sp.is_active=true and sp.name='Assistência Social'
  );
  v_allowed := v_admin or (v_social and exists(select 1 from public.social_followup_cycles sfc where sfc.patient_id=p_patient_id and sfc.professional_id=v_professional_id and sfc.status='ativo'));
  if not v_allowed then raise exception 'Usuário sem autorização para este paciente no Transporte.'; end if;
  if not exists(select 1 from public.patients pt where pt.id=p_patient_id and pt.status='ativo' and pt.deceased=false) then raise exception 'Paciente inexistente, inativo ou falecido.'; end if;
  select jsonb_build_object(
    'patient',(select jsonb_build_object('patient_id',pt.id,'full_name',pt.full_name,'patient_number',pt.patient_number,'cms',pt.cms,'birth_date',pt.birth_date,'phone',pt.phone,'phone_secondary',pt.phone_secondary,'address',pt.address) from public.patients pt where pt.id=p_patient_id),
    'active_need',(select jsonb_build_object('cycle_id',nc.id,'status',nc.status,'started_at',nc.started_at,'recognized_by',coalesce(pr.full_name,ua.username),'cancellation_requested_at',nc.cancellation_requested_at,'cancellation_request_reason',nc.cancellation_request_reason) from public.transport_need_cycles nc join public.user_accounts ua on ua.id=nc.recognized_by left join public.professionals pr on pr.id=public.capo_effective_professional_id() where nc.patient_id=p_patient_id and nc.status='ativo'),
    'need_history',coalesce((select jsonb_agg(jsonb_build_object('cycle_id',nc.id,'status',nc.status,'started_at',nc.started_at,'recognized_by',coalesce(rp.full_name,ru.username),'closed_at',nc.closed_at,'closed_by',coalesce(cp.full_name,cu.username),'closure_reason',nc.closure_reason,'cancellation_requested_at',nc.cancellation_requested_at,'cancellation_request_reason',nc.cancellation_request_reason) order by nc.started_at desc) from public.transport_need_cycles nc join public.user_accounts ru on ru.id=nc.recognized_by left join public.professionals rp on rp.id=ru.professional_id left join public.user_accounts cu on cu.id=nc.closed_by left join public.professionals cp on cp.id=cu.professional_id where nc.patient_id=p_patient_id),'[]'::jsonb),
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('appointment_id',pa.id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'attendance_status',pa.attendance_status,'professional_name',pr.full_name,'professional_specialty',coalesce((select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=pr.id and sp.is_active order by sp.name limit 1),pr.function_title),'care_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(pr.care_location),''))) order by pa.appointment_date asc) from public.patient_appointments pa join public.professionals pr on pr.id=pa.professional_id where pa.patient_id=p_patient_id and pa.attendance_status in ('agendado','confirmado')),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',tr.id,'need_cycle_id',tr.need_cycle_id,'appointment_id',tr.appointment_id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'appointment_professional',apr.full_name,'appointment_specialty',coalesce((select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=apr.id and sp.is_active order by sp.name limit 1),apr.function_title),'appointment_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(apr.care_location),'')),'boarding_address',tr.boarding_address,'boarding_source',tr.boarding_source,'periodicity',tr.periodicity,'pdf_details_confirmed_at',tr.pdf_details_confirmed_at,'requested_by_role',coalesce(rp.function_title,case when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=ru.id and ar.code='administrador') then 'Gestor/Titular' else 'Administrativo Operacional' end),'status',tr.status,'requested_at',tr.requested_at,'requested_by',coalesce(rp.full_name,ru.username),'transport_notes',tr.transport_notes,'confirmed_at',tr.confirmed_at,'confirmed_by',coalesce(cp.full_name,cu.username),'pdf_prepared_at',tr.pdf_prepared_at,'pdf_prepared_by',coalesce(pp.full_name,pu.username),'external_forwarded_at',tr.external_forwarded_at,'external_forwarded_by',coalesce(ep.full_name,eu.username),'external_channel',tr.external_channel,'external_reference',tr.external_reference,'completed_at',tr.completed_at,'completed_by',coalesce(xp.full_name,xu.username),'cancelled_at',tr.cancelled_at,'cancelled_by',coalesce(kp.full_name,ku.username),'cancellation_reason',tr.cancellation_reason,'pdf_persisted',(tr.request_pdf_path is not null and btrim(tr.request_pdf_path)<>'')) order by tr.requested_at desc)
      from public.transport_requests tr
      left join public.patient_appointments pa on pa.id=tr.appointment_id
      left join public.professionals apr on apr.id=pa.professional_id
      join public.user_accounts ru on ru.id=tr.requested_by left join public.professionals rp on rp.id=ru.professional_id
      left join public.user_accounts cu on cu.id=tr.confirmed_by left join public.professionals cp on cp.id=cu.professional_id
      left join public.user_accounts pu on pu.id=tr.pdf_prepared_by left join public.professionals pp on pp.id=pu.professional_id
      left join public.user_accounts eu on eu.id=tr.external_forwarded_by left join public.professionals ep on ep.id=eu.professional_id
      left join public.user_accounts xu on xu.id=tr.completed_by left join public.professionals xp on xp.id=xu.professional_id
      left join public.user_accounts ku on ku.id=tr.cancelled_by left join public.professionals kp on kp.id=ku.professional_id
      where tr.patient_id=p_patient_id),'[]'::jsonb),
    'can_administer',v_admin,
    'can_social_request',v_social
  ) into v_result;
  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_transport_reminder_queue_for_interface()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
   or not exists(select 1 from public.user_accounts where auth_user_id=auth.uid() and is_active=true)
   or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Acesso não autorizado aos avisos de Transporte.' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'request_id',q.request_id, 'patient_id',q.patient_id,'patient_name',q.patient_name,
   'patient_number',q.patient_number,'cms',q.cms,
   'boarding_address',q.boarding_address,'professional_name',q.professional_name,
   'care_location',q.care_location,'periodicity',q.periodicity,
   'next_visit_date',q.next_date::text,'appointment_time',q.appointment_time::text
 ) order by q.next_date,q.patient_name),'[]'::jsonb) into v_result
 from (
  select tr.id as request_id,tr.patient_id,pt.full_name as patient_name,pt.patient_number,pt.cms,
   tr.boarding_address,pr.full_name as professional_name,
   coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(pr.care_location),'')) as care_location,
   tr.periodicity,
   (pa.appointment_date at time zone 'America/Sao_Paulo')::time(0) as appointment_time,
   ((pa.appointment_date at time zone 'America/Sao_Paulo')::date
     + (case when ((pa.appointment_date at time zone 'America/Sao_Paulo')::date) >=
                 (now() at time zone 'America/Sao_Paulo')::date then 0
          else ceil(((now() at time zone 'America/Sao_Paulo')::date -
               (pa.appointment_date at time zone 'America/Sao_Paulo')::date)::numeric
               / case when tr.periodicity='semanal' then 7 else 14 end)::int *
               case when tr.periodicity='semanal' then 7 else 14 end end)
   )::date as next_date
  from public.transport_requests tr
   join public.patients pt on pt.id=tr.patient_id
   join public.transport_need_cycles nc on nc.id=tr.need_cycle_id and nc.status='ativo'
   join public.patient_appointments pa on pa.id=tr.appointment_id
   join public.professionals pr on pr.id=pa.professional_id
  where tr.periodicity in ('semanal','quinzenal') and tr.status in ('confirmado','realizado')
    and tr.pdf_prepared_at is not null
    and pt.status='ativo' and pt.deceased=false
    and public.capo_patient_visible_in_current_context(tr.patient_id)
 ) q
 where q.next_date between (now() at time zone 'America/Sao_Paulo')::date
                     and (now() at time zone 'America/Sao_Paulo')::date+1;
 return v_result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.register_transport_pdf_for_interface(p_request_id uuid, p_storage_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'storage', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_request public.transport_requests%rowtype;
  v_path text := btrim(coalesce(p_storage_path,''));
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Gestor/Titular ou Administrativo Operacional pode registrar o PDF oficial de transporte.' using errcode='42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;

  select * into v_request
  from public.transport_requests tr
  where tr.id=p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Solicitação de transporte não encontrada.' using errcode='22023';
  end if;

  perform public.capo_assert_patient_write_context(v_request.patient_id);

  if v_request.status not in ('solicitado','confirmado') then
    raise exception 'Solicitação encerrada não pode receber novo PDF.' using errcode='22023';
  end if;

  if v_request.pdf_details_confirmed_at is null or nullif(btrim(coalesce(v_request.boarding_address,'')),'') is null
    or v_request.periodicity not in ('unica','semanal','quinzenal') then
    raise exception 'Confirme endereço de embarque e periodicidade antes de gerar o PDF.' using errcode='22023';
  end if;
  if v_request.request_pdf_signed_at is not null
     or v_request.pdf_prepared_at is not null then
    raise exception 'O PDF oficial já foi assinado/preparado. Corrija a solicitação antes de gerar nova versão.'
      using errcode='22023';
  end if;

  if public.capo_storage_path_uuid(v_path,'transport') is distinct from p_request_id then
    raise exception 'Caminho do PDF de transporte inválido.' using errcode='22023';
  end if;

  if lower(storage.extension(v_path))<>'pdf' then
    raise exception 'Somente arquivo PDF é permitido.' using errcode='22023';
  end if;

  if not exists(
    select 1
    from storage.objects o
    where o.bucket_id='capo-documents'
      and o.name=v_path
  ) then
    raise exception 'Arquivo PDF não localizado no armazenamento seguro.' using errcode='22023';
  end if;

  update public.transport_requests
     set request_pdf_path=v_path,
         request_pdf_generated_at=v_now,
         request_pdf_generated_by=v_account_id,
         request_pdf_signed_at=null,
         request_pdf_signed_by=null,
         pdf_prepared_at=null,
         pdf_prepared_by=null,
         updated_at=v_now
   where id=p_request_id;

  return jsonb_build_object(
    'success',true,
    'request_id',p_request_id,
    'request_pdf_path',v_path,
    'request_pdf_generated_at',v_now,
    'request_pdf_generated_by',v_account_id,
    'signed',false
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_transport_pdf_details_for_interface(p_request_id uuid, p_boarding_source text, p_boarding_address text, p_periodicity text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_request public.transport_requests%rowtype; v_account uuid; v_registered text; v_final text;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Somente o Administrativo ou Gestor autenticado pode confirmar os dados do transporte.' using errcode='42501';
 end if;
 select id into v_account from public.user_accounts where auth_user_id=auth.uid() and is_active=true limit 1;
 if v_account is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
 select * into v_request from public.transport_requests where id=p_request_id for update;
 if v_request.id is null then raise exception 'Solicitação não encontrada.'; end if;
 perform public.capo_assert_patient_write_context(v_request.patient_id);
 if v_request.status not in ('solicitado','confirmado') or v_request.request_pdf_path is not null then
   raise exception 'Não é permitido alterar os dados após gerar o PDF ou encerrar a solicitação.';
 end if;
 select nullif(btrim(address),'') into v_registered from public.patients where id=v_request.patient_id;
 if p_boarding_source not in ('cadastro','alternativo') then raise exception 'Confirme a origem do embarque.'; end if;
 if p_periodicity not in ('unica','semanal','quinzenal') then raise exception 'Confirme a periodicidade.'; end if;
 v_final := case when p_boarding_source='cadastro' then v_registered else nullif(btrim(coalesce(p_boarding_address,'')),'') end;
 if v_final is null or length(v_final)>500 then raise exception 'Informe endereço completo de embarque, com até 500 caracteres.'; end if;
 update public.transport_requests set boarding_address=v_final,boarding_source=p_boarding_source,
   periodicity=p_periodicity,pdf_details_confirmed_at=clock_timestamp(),pdf_details_confirmed_by=v_account,
   updated_at=clock_timestamp() where id=p_request_id;
 return jsonb_build_object('success',true,'request_id',p_request_id,'boarding_address',v_final,'periodicity',p_periodicity);
end; $function$
;
revoke all on function public.set_transport_pdf_details_for_interface(uuid,text,text,text) from public,anon;
grant execute on function public.set_transport_pdf_details_for_interface(uuid,text,text,text) to authenticated;
revoke all on function public.get_transport_reminder_queue_for_interface() from public,anon;
grant execute on function public.get_transport_reminder_queue_for_interface() to authenticated;
