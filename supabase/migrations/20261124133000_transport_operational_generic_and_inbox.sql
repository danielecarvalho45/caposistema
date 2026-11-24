-- Transporte CAPO, regra aprovada 24/11/2026.
-- Reprodutibilidade das alterações autorizadas e já aplicadas no projeto Supabase.
-- A necessidade de transporte mantém seu ciclo; cada solicitação possui ID próprio;
-- o vínculo com agendamento pode ser NULL quando não houver agenda.
alter table public.transport_requests alter column appointment_id drop not null;

CREATE OR REPLACE FUNCTION public.create_transport_request_for_interface(p_patient_id uuid, p_appointment_id uuid, p_transport_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_gestor boolean;
  v_ao boolean;
  v_social boolean;
  v_need_id uuid;
  v_request_id uuid;
  v_now timestamptz:=clock_timestamp();
  v_ap_patient uuid;
  v_ap_status text;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;

  select ua.id, public.capo_effective_professional_id()
    into v_account_id, v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.'; end if;

  v_gestor := public.has_app_role('administrador');
  v_ao := public.has_app_role('administrativo_operacional');
  v_social := v_professional_id is not null
    and exists (
      select 1
      from public.professionals pr
      where pr.id=v_professional_id
        and pr.status='ativo'
        and pr.is_professional=true
    )
    and exists (
      select 1
      from public.get_effective_professional_capabilities(v_professional_id) c
      where c.capability_code='preencher_solicitacao_transporte'
    )
    and exists (
      select 1
      from public.social_followup_cycles sfc
      where sfc.patient_id=p_patient_id
        and sfc.professional_id=v_professional_id
        and sfc.status='ativo'
    );

  if not (v_gestor or v_ao or v_social) then
    raise exception 'Somente Gestor/Titular, Administrativo Operacional ou Assistência Social autorizada podem solicitar transporte.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);
  if not exists (select 1 from public.patients pt where pt.id=p_patient_id and pt.status='ativo' and pt.deceased=false) then
    raise exception 'Paciente inexistente, inativo ou falecido.' using errcode='22023';
  end if;
  if length(btrim(coalesce(p_transport_notes,''))) not between 5 and 500 then raise exception 'O motivo do transporte deve possuir entre 5 e 500 caracteres.'; end if;
  if p_appointment_id is not null then
    select pa.patient_id,pa.attendance_status into v_ap_patient,v_ap_status from public.patient_appointments pa where pa.id=p_appointment_id;
    if v_ap_patient is null then raise exception 'Agendamento não encontrado.'; end if;
    if v_ap_patient<>p_patient_id then raise exception 'O agendamento informado não pertence ao paciente selecionado.'; end if;
    if v_ap_status not in ('agendado','confirmado') then raise exception 'A solicitação exige agendamento em situação agendado ou confirmado.'; end if;
  end if;
  select nc.id into v_need_id from public.transport_need_cycles nc where nc.patient_id=p_patient_id and nc.status='ativo' for share;
  if v_need_id is null then raise exception 'Paciente não possui necessidade de transporte ativa.'; end if;
  insert into public.transport_requests(need_cycle_id,patient_id,appointment_id,status,requested_at,requested_by,transport_notes,created_at,updated_at)
  values(v_need_id,p_patient_id,p_appointment_id,'solicitado',v_now,v_account_id,btrim(p_transport_notes),v_now,v_now)
  returning id into v_request_id;
  if v_social and not (v_gestor or v_ao) then
    perform public.capo_criar_notificacao(
      'administrativo_operacional',null,'transport_request_from_social',
      'Nova solicitação de transporte',
      'A Assistência Social encaminhou solicitação de transporte com justificativa para providência administrativa.',
      'transport_requests',v_request_id,'alta'
    );
  end if;
  return jsonb_build_object('success',true,'request_id',v_request_id,'need_cycle_id',v_need_id,'status','solicitado','requested_at',v_now,'pdf_persisted',false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_transport_administrative_queue_for_interface(p_limit integer DEFAULT 50)
 RETURNS TABLE(request_id uuid, patient_id uuid, patient_name text, patient_number text, transport_notes text, requested_at timestamp with time zone, requester_name text, status text, appointment_date timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
begin
  if auth.uid() is null
    or not coalesce(public.has_accepted_current_legal_term(),false)
    or not exists (select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
  then
    raise exception 'Acesso não autorizado à fila administrativa de Transporte.' using errcode='42501';
  end if;
  return query
  select tr.id, tr.patient_id,pt.full_name,pt.patient_number,tr.transport_notes,tr.requested_at,
         coalesce(pr.full_name, ua.username),tr.status,pa.appointment_date
  from public.transport_requests tr
  join public.patients pt on pt.id=tr.patient_id
  join public.user_accounts ua on ua.id=tr.requested_by
  left join public.professionals pr on pr.id=ua.professional_id
  left join public.patient_appointments pa on pa.id=tr.appointment_id
  where tr.status in ('solicitado','confirmado')
    and public.capo_patient_visible_in_current_context(tr.patient_id)
  order by tr.requested_at desc,tr.id desc
  limit least(greatest(coalesce(p_limit,50),1),100);
end; $function$
;

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
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('appointment_id',pa.id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'attendance_status',pa.attendance_status,'professional_name',pr.full_name) order by pa.appointment_date asc) from public.patient_appointments pa join public.professionals pr on pr.id=pa.professional_id where pa.patient_id=p_patient_id and pa.attendance_status in ('agendado','confirmado')),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',tr.id,'need_cycle_id',tr.need_cycle_id,'appointment_id',tr.appointment_id,'appointment_date',pa.appointment_date,'appointment_type',pa.appointment_type,'status',tr.status,'requested_at',tr.requested_at,'requested_by',coalesce(rp.full_name,ru.username),'transport_notes',tr.transport_notes,'confirmed_at',tr.confirmed_at,'confirmed_by',coalesce(cp.full_name,cu.username),'pdf_prepared_at',tr.pdf_prepared_at,'pdf_prepared_by',coalesce(pp.full_name,pu.username),'external_forwarded_at',tr.external_forwarded_at,'external_forwarded_by',coalesce(ep.full_name,eu.username),'external_channel',tr.external_channel,'external_reference',tr.external_reference,'completed_at',tr.completed_at,'completed_by',coalesce(xp.full_name,xu.username),'cancelled_at',tr.cancelled_at,'cancelled_by',coalesce(kp.full_name,ku.username),'cancellation_reason',tr.cancellation_reason,'pdf_persisted',(tr.request_pdf_path is not null and btrim(tr.request_pdf_path)<>'')) order by tr.requested_at desc)
      from public.transport_requests tr
      left join public.patient_appointments pa on pa.id=tr.appointment_id
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

    if length(btrim(coalesce(p_transport_notes,''))) not between 5 and 500 then
      raise exception 'O motivo operacional corrigido deve possuir entre 5 e 500 caracteres.' using errcode='22023';
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
    if v_status<>'confirmado' then
      raise exception 'Somente solicitação confirmada pode ser concluída.' using errcode='22023';
    end if;

    if v_forwarded is null then
      raise exception 'Registre o encaminhamento externo antes da conclusão.' using errcode='22023';
    end if;

    update public.transport_requests
       set status='realizado',
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
;

CREATE OR REPLACE FUNCTION public.recognize_transport_need_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_is_gestor boolean := false;
  v_is_social_authorized boolean := false;
  v_id uuid;
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

  v_is_gestor := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');

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
      where sfc.patient_id=p_patient_id
        and sfc.professional_id=v_professional_id
        and sfc.status='ativo'
    );

  if not (v_is_gestor or v_is_social_authorized) then
    raise exception 'Somente o Gestor do Sistema ou Assistência Social autorizada pode reconhecer necessidade de transporte.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);

  if not exists(
    select 1
    from public.patients pt
    where pt.id=p_patient_id
      and pt.status='ativo'
      and pt.deceased=false
  ) then
    raise exception 'Paciente inexistente, inativo ou falecido.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_patient_id::text,0));

  if exists(
    select 1
    from public.transport_need_cycles
    where patient_id=p_patient_id
      and status='ativo'
  ) then
    raise exception 'Paciente já possui necessidade de transporte ativa.' using errcode='23505';
  end if;

  insert into public.transport_need_cycles(
    patient_id,status,started_at,recognized_by,created_at,updated_at
  ) values (
    p_patient_id,'ativo',v_now,v_account_id,v_now,v_now
  )
  returning id into v_id;

  return jsonb_build_object(
    'success',true,
    'cycle_id',v_id,
    'status','ativo',
    'started_at',v_now
  );
end;
$function$
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

CREATE OR REPLACE FUNCTION public.sign_transport_pdf_for_interface(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'storage', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_request public.transport_requests%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Gestor/Titular ou Administrativo Operacional pode confirmar o PDF oficial de transporte.' using errcode='42501';
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

  if v_request.status<>'confirmado' then
    raise exception 'Confirme a solicitação antes de assinar o PDF oficial.' using errcode='22023';
  end if;

  if v_request.request_pdf_path is null
     or v_request.request_pdf_generated_at is null
     or v_request.request_pdf_generated_by is null then
    raise exception 'Gere e registre o PDF oficial antes da assinatura.' using errcode='22023';
  end if;

  if not exists(
    select 1
    from storage.objects o
    where o.bucket_id='capo-documents'
      and o.name=v_request.request_pdf_path
  ) then
    raise exception 'Arquivo PDF não localizado no armazenamento seguro.' using errcode='22023';
  end if;

  if v_request.request_pdf_signed_at is not null
     or v_request.request_pdf_signed_by is not null then
    raise exception 'O PDF oficial desta solicitação já foi assinado.' using errcode='22023';
  end if;

  update public.transport_requests
     set request_pdf_signed_at=v_now,
         request_pdf_signed_by=v_account_id,
         pdf_prepared_at=v_now,
         pdf_prepared_by=v_account_id,
         updated_at=v_now
   where id=p_request_id;

  perform public.capo_criar_notificacao(
    'administrativo_operacional',
    null,
    'transport_request_ready',
    'Solicitação de transporte pronta',
    'Há uma solicitação de transporte com PDF oficial gerado e assinado, disponível para continuidade administrativa.',
    'transport_requests',
    p_request_id,
    'alta'
  );

  return jsonb_build_object(
    'success',true,
    'request_id',p_request_id,
    'request_pdf_path',v_request.request_pdf_path,
    'request_pdf_signed_at',v_now,
    'request_pdf_signed_by',v_account_id,
    'pdf_prepared_at',v_now,
    'pdf_prepared_by',v_account_id
  );
end;
$function$
;

revoke all on function public.get_transport_administrative_queue_for_interface(integer) from public,anon;
grant execute on function public.get_transport_administrative_queue_for_interface(integer) to authenticated;
