-- CAPO Transporte: adição não destrutiva de protocolos, fila e justificativa.
create sequence if not exists public.transport_protocol_counter_seq;
alter table public.transport_requests add column if not exists protocol text;
alter table public.transport_requests add column if not exists closure_reason text;
create or replace function private.capo_transport_assign_protocol()
returns trigger language plpgsql set search_path to 'pg_catalog','public','private' as $body$
begin
 if new.protocol is null or btrim(new.protocol)='' then
   new.protocol := 'TR-' || to_char(coalesce(new.requested_at,now()) at time zone 'America/Sao_Paulo','YYYY') || '-' || lpad(nextval('public.transport_protocol_counter_seq')::text,8,'0');
 end if;
 return new;
end $body$;
drop trigger if exists trg_capo_transport_assign_protocol on public.transport_requests;
create trigger trg_capo_transport_assign_protocol before insert on public.transport_requests for each row execute function private.capo_transport_assign_protocol();
update public.transport_requests set protocol='TR-' || to_char(requested_at at time zone 'America/Sao_Paulo','YYYY') || '-' || lpad(nextval('public.transport_protocol_counter_seq')::text,8,'0') where protocol is null;
create unique index if not exists transport_requests_protocol_unique on public.transport_requests(protocol);
alter table public.transport_requests alter column protocol set not null;
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
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('appointment_id',pa.id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'attendance_status',pa.attendance_status,'professional_name',pr.full_name,'professional_specialty',coalesce(aps.name,(select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=pr.id and sp.is_active order by sp.name limit 1),pr.function_title),'care_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(pr.care_location),''))) order by pa.appointment_date asc) from public.patient_appointments pa join public.professionals pr on pr.id=pa.professional_id left join public.specialties aps on aps.id=pa.specialty_id where pa.patient_id=p_patient_id and pa.attendance_status in ('agendado','confirmado')),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',tr.id,'protocol',tr.protocol,'closure_reason',tr.closure_reason,'need_cycle_id',tr.need_cycle_id,'appointment_id',tr.appointment_id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'appointment_professional',apr.full_name,'appointment_specialty',coalesce(aps.name,(select sp.name from public.professional_specialties ps join public.specialties sp on sp.id=ps.specialty_id where ps.professional_id=apr.id and sp.is_active order by sp.name limit 1),apr.function_title),'appointment_location',coalesce(nullif(btrim(pa.care_location),''),nullif(btrim(apr.care_location),'')),'boarding_address',tr.boarding_address,'boarding_source',tr.boarding_source,'vehicle_type',tr.vehicle_type,'vehicle_pdf_update_pending',tr.vehicle_pdf_update_pending,'periodicity',tr.periodicity,'pdf_details_confirmed_at',tr.pdf_details_confirmed_at,'requested_by_role',coalesce(rp.function_title,case when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=ru.id and ar.code='administrador') then 'Gestor/Titular' else 'Administrativo Operacional' end),'status',tr.status,'requested_at',tr.requested_at,'requested_by',coalesce(rp.full_name,ru.username),'transport_notes',tr.transport_notes,'confirmed_at',tr.confirmed_at,'confirmed_by',coalesce(cp.full_name,cu.username),'pdf_prepared_at',tr.pdf_prepared_at,'pdf_prepared_by',coalesce(pp.full_name,pu.username),'external_forwarded_at',tr.external_forwarded_at,'external_forwarded_by',coalesce(ep.full_name,eu.username),'external_channel',tr.external_channel,'external_reference',tr.external_reference,'completed_at',tr.completed_at,'completed_by',coalesce(xp.full_name,xu.username),'cancelled_at',tr.cancelled_at,'cancelled_by',coalesce(kp.full_name,ku.username),'cancellation_reason',tr.cancellation_reason,'pdf_persisted',(tr.request_pdf_path is not null and btrim(tr.request_pdf_path)<>'')) order by tr.requested_at desc)
      from public.transport_requests tr
      left join public.patient_appointments pa on pa.id=tr.appointment_id
      left join public.professionals apr on apr.id=pa.professional_id
      left join public.specialties aps on aps.id=pa.specialty_id
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

CREATE OR REPLACE FUNCTION public.manage_transport_request_for_interface(p_request_id uuid, p_action text, p_reason text DEFAULT NULL::text, p_channel text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_transport_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_patient_id uuid;
  v_status text;
  v_forwarded timestamptz;
  v_pdf_prepared_at timestamptz;
  v_pdf_prepared_by uuid;
  v_is_gestor boolean;
  v_is_ao boolean;
  v_is_social_authorized boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  select tr.patient_id,tr.status,tr.external_forwarded_at,tr.pdf_prepared_at,tr.pdf_prepared_by
    into v_patient_id,v_status,v_forwarded,v_pdf_prepared_at,v_pdf_prepared_by
  from public.transport_requests tr
  where tr.id=p_request_id
  for update;

  if v_status is null then
    raise exception 'Solicitação de transporte não encontrada.' using errcode='22023';
  end if;

  perform public.capo_assert_patient_write_context(v_patient_id);

  v_is_gestor := public.has_app_role('administrador');
  v_is_ao := public.has_app_role('administrativo_operacional');

  v_is_social_authorized :=
    v_professional_id is not null
    and public.has_app_role('profissional')
    and exists(
      select 1
      from public.professionals pr
      join public.professional_specialties ps on ps.professional_id=pr.id
      join public.specialties sp on sp.id=ps.specialty_id
      where pr.id=v_professional_id
        and pr.status='ativo'
        and pr.is_professional=true
        and sp.is_active=true
        and lower(btrim(sp.name))=lower('Assistência Social')
    )
    and exists(
      select 1
      from public.get_effective_professional_capabilities(v_professional_id) c
      where c.capability_code='preencher_solicitacao_transporte'
    )
    and exists(
      select 1
      from public.social_followup_cycles sfc
      where sfc.patient_id=v_patient_id
        and sfc.professional_id=v_professional_id
        and sfc.status='ativo'
    );

  if p_action='correct' then
    if not (v_is_gestor or v_is_social_authorized) then
      raise exception 'Somente o Gestor do Sistema ou Assistência Social autorizada pode corrigir o conteúdo da solicitação de transporte.' using errcode='42501';
    end if;

    if v_status in ('realizado','cancelado') then
      raise exception 'Solicitação encerrada não pode ser corrigida.' using errcode='22023';
    end if;

    if length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
      raise exception 'O motivo da correção deve possuir entre 5 e 500 caracteres.' using errcode='22023';
    end if;

    if length(btrim(coalesce(p_transport_notes,''))) < 5 then
      raise exception 'O motivo operacional corrigido deve possuir pelo menos 5 caracteres.' using errcode='22023';
    end if;

    update public.transport_requests
       set transport_notes=btrim(p_transport_notes),
           last_corrected_at=v_now,
           last_corrected_by=v_account_id,
           last_correction_reason=btrim(p_reason),
           updated_at=v_now
     where id=p_request_id;

    return jsonb_build_object('success',true,'request_id',p_request_id,'action','correct','updated_at',v_now);
  end if;

  if not (v_is_gestor or v_is_ao) then
    raise exception 'Somente o Administrativo Operacional ou Gestor do Sistema pode processar a etapa administrativa do transporte.' using errcode='42501';
  end if;

  if p_action='confirm' then
    if v_status<>'solicitado' then
      raise exception 'Somente solicitação solicitada pode ser confirmada.' using errcode='22023';
    end if;

    update public.transport_requests
       set status='confirmado',
           confirmed_at=v_now,
           confirmed_by=v_account_id,
           updated_at=v_now
     where id=p_request_id;

  elsif p_action='prepare_pdf' then
    if not (v_is_gestor or v_is_ao) then
      raise exception 'Somente Gestor/Titular ou Administrativo Operacional pode confirmar o PDF oficial da solicitação de transporte.' using errcode='42501';
    end if;

    if v_status<>'confirmado' then
      raise exception 'Confirme a solicitação antes de confirmar o PDF oficial preparado.' using errcode='22023';
    end if;

    if v_pdf_prepared_at is not null or v_pdf_prepared_by is not null then
      raise exception 'O PDF oficial deste pedido já foi confirmado como preparado.' using errcode='22023';
    end if;

    update public.transport_requests
       set pdf_prepared_at=v_now,
           pdf_prepared_by=v_account_id,
           updated_at=v_now
     where id=p_request_id;

  elsif p_action='forward' then
    if v_status<>'confirmado' then
      raise exception 'Confirme a solicitação antes de registrar encaminhamento externo.' using errcode='22023';
    end if;

    if v_pdf_prepared_at is null or v_pdf_prepared_by is null then
      raise exception 'Prepare e confirme o PDF oficial CAPO antes de registrar o encaminhamento externo.' using errcode='22023';
    end if;

    if v_forwarded is not null then
      raise exception 'Encaminhamento externo já registrado.' using errcode='22023';
    end if;

    if length(btrim(coalesce(p_channel,''))) not between 2 and 80 then
      raise exception 'Informe o canal institucional utilizado.' using errcode='22023';
    end if;

    if length(coalesce(p_reference,''))>500 then
      raise exception 'A referência operacional deve possuir no máximo 500 caracteres.' using errcode='22023';
    end if;

    update public.transport_requests
       set external_forwarded_at=v_now,
           external_forwarded_by=v_account_id,
           external_channel=btrim(p_channel),
           external_reference=nullif(btrim(coalesce(p_reference,'')),''),
           updated_at=v_now
     where id=p_request_id;

  elsif p_action='complete' then
    if length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
      raise exception 'Informe o motivo do encerramento do protocolo (5 a 500 caracteres).' using errcode='22023';
    end if;
    if v_status<>'confirmado' then
      raise exception 'Somente solicitação confirmada pode ser concluída.' using errcode='22023';
    end if;

    if v_forwarded is null then
      raise exception 'Registre o encaminhamento externo antes da conclusão.' using errcode='22023';
    end if;

    update public.transport_requests
       set status='realizado',
           closure_reason=btrim(p_reason),
           completed_at=v_now,
           completed_by=v_account_id,
           updated_at=v_now
     where id=p_request_id;

  elsif p_action='cancel' then
    if v_status not in ('solicitado','confirmado') then
      raise exception 'Esta solicitação não pode ser cancelada.' using errcode='22023';
    end if;

    if length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
      raise exception 'O motivo do cancelamento deve possuir entre 5 e 500 caracteres.' using errcode='22023';
    end if;

    update public.transport_requests
       set status='cancelado',
           cancelled_at=v_now,
           cancelled_by=v_account_id,
           cancellation_reason=btrim(p_reason),
           updated_at=v_now
     where id=p_request_id;

  else
    raise exception 'Ação da solicitação de transporte inválida.' using errcode='22023';
  end if;

  return jsonb_build_object(
    'success',true,
    'request_id',p_request_id,
    'action',p_action,
    'updated_at',v_now
  );
end;
$function$

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
  where pa.attendance_status not in ('cancelado','remarcado') and tr.periodicity in ('semanal','quinzenal') and tr.status in ('confirmado','realizado') and tr.closure_reason is null
    and tr.pdf_prepared_at is not null
    and pt.status='ativo' and pt.deceased=false
    and public.capo_patient_visible_in_current_context(tr.patient_id)
 ) q
 where q.next_date between (now() at time zone 'America/Sao_Paulo')::date
                     and (now() at time zone 'America/Sao_Paulo')::date+1;
 return v_result;
end; $function$

create or replace function public.get_transport_worklist_for_interface(p_view text default 'recebidas',p_query text default '',p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog','public','auth','pg_temp' as $body$
declare v_result jsonb;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
 or not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true)
 or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Acesso não autorizado ao acompanhamento administrativo.' using errcode='42501';
 end if;
 if p_view not in ('recebidas','concluidas','acompanhamento') then raise exception 'Consulta de transporte inválida.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.requested_at desc,q.request_id desc),'[]'::jsonb) into v_result
 from (
  select tr.id as request_id,tr.protocol,tr.patient_id,pt.full_name as patient_name,pt.patient_number,
     pt.cms,tr.status,tr.transport_notes,tr.requested_at,tr.completed_at,tr.cancelled_at,tr.closure_reason,
     tr.cancellation_reason,tr.vehicle_type,tr.periodicity,tr.external_channel,tr.external_forwarded_at,
     tr.need_cycle_id,coalesce(pr.full_name,ua.username) as requester_name,
     exists(select 1 from public.professional_specialties ps
       join public.specialties sp on sp.id=ps.specialty_id
       where ps.professional_id=ua.professional_id and sp.is_active
         and lower(btrim(sp.name))=lower('Assistência Social')) as from_social
  from public.transport_requests tr
  join public.patients pt on pt.id=tr.patient_id
  join public.user_accounts ua on ua.id=tr.requested_by
  left join public.professionals pr on pr.id=ua.professional_id
  where public.capo_patient_visible_in_current_context(tr.patient_id)
    and ((p_view='recebidas' and tr.status in ('solicitado','confirmado') and exists(
       select 1 from public.professional_specialties ps
       join public.specialties sp on sp.id=ps.specialty_id
       where ps.professional_id=ua.professional_id and sp.is_active
         and lower(btrim(sp.name))=lower('Assistência Social')))
      or (p_view='concluidas' and tr.status in ('realizado','cancelado'))
      or (p_view='acompanhamento'))
    and (btrim(coalesce(p_query,''))='' or pt.full_name ilike '%'||btrim(p_query)||'%'
      or pt.patient_number ilike '%'||btrim(p_query)||'%'
      or tr.protocol ilike '%'||btrim(p_query)||'%')
  order by tr.requested_at desc,tr.id desc
  limit least(greatest(coalesce(p_limit,100),1),100)
 ) q;
 return v_result;
end $body$;
revoke all on function public.get_transport_worklist_for_interface(text,text,integer) from public,anon;
grant execute on function public.get_transport_worklist_for_interface(text,text,integer) to authenticated;
