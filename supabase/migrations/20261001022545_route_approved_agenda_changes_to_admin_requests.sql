alter table public.administrative_requests
  add column if not exists source_agenda_change_request_id uuid
    references public.agenda_change_requests(id) on delete set null,
  add column if not exists source_coordination_decision_id uuid
    references public.coordination_team_decisions(id) on delete set null;

create unique index if not exists administrative_requests_source_agenda_change_uq
  on public.administrative_requests(source_agenda_change_request_id)
  where source_agenda_change_request_id is not null;

create unique index if not exists administrative_requests_source_coordination_decision_uq
  on public.administrative_requests(source_coordination_decision_id)
  where source_coordination_decision_id is not null;

create or replace function private.capo_ensure_agenda_block_admin_request(
  p_professional_id uuid,
  p_source_agenda_change_request_id uuid,
  p_source_coordination_decision_id uuid,
  p_action_type text,
  p_start_date date,
  p_end_date date,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_request_id uuid;
  v_professional_name text;
  v_action_label text;
  v_subject text;
  v_period text;
  v_description text;
begin
  if p_professional_id is null then
    raise exception 'Profissional obrigatório para gerar solicitação administrativa de agenda.';
  end if;

  if p_source_agenda_change_request_id is not null then
    select ar.id into v_request_id
    from public.administrative_requests ar
    where ar.source_agenda_change_request_id=p_source_agenda_change_request_id
    limit 1;
    if v_request_id is not null then return v_request_id; end if;
  end if;

  if p_source_coordination_decision_id is not null then
    select ar.id into v_request_id
    from public.administrative_requests ar
    where ar.source_coordination_decision_id=p_source_coordination_decision_id
    limit 1;
    if v_request_id is not null then return v_request_id; end if;
  end if;

  select pr.full_name into v_professional_name
  from public.professionals pr
  where pr.id=p_professional_id;

  if v_professional_name is null then
    raise exception 'Profissional não encontrado para solicitação administrativa de agenda.';
  end if;

  v_action_label := case lower(btrim(coalesce(p_action_type,'')))
    when 'afastamento' then 'Afastamento'
    when 'ferias' then 'Férias'
    when 'mudanca_horario' then 'Mudança de horário'
    when 'mudanca_turno' then 'Mudança de turno'
    when 'carga' then 'Alteração de carga'
    when 'bloqueio' then 'Bloqueio'
    when 'substituicao' then 'Substituição'
    when 'bloqueio_recorrente' then 'Bloqueio recorrente'
    when 'excecao_estrutural' then 'Exceção estrutural'
    when 'status' then 'Alteração de status da agenda'
    when 'configuracao' then 'Alteração estrutural de agenda'
    else initcap(replace(coalesce(nullif(btrim(p_action_type),''),'alteração estrutural'),'_',' '))
  end;

  v_subject := 'Bloqueio de agenda — '||v_action_label||' aprovado';

  v_period := case
    when p_start_date is not null and p_end_date is not null
      then to_char(p_start_date,'DD/MM/YYYY')||' a '||to_char(p_end_date,'DD/MM/YYYY')
    when p_start_date is not null
      then to_char(p_start_date,'DD/MM/YYYY')
    else 'conforme solicitação estrutural aprovada'
  end;

  v_description :=
    'A Coordenação aprovou '||lower(v_action_label)||' da agenda de '||
    v_professional_name||'. Período: '||v_period||
    '. Providenciar o bloqueio/efetivação administrativa da agenda e tratar eventuais pacientes afetados.'||
    case when nullif(btrim(coalesce(p_reason,'')),'') is not null
      then ' Justificativa: '||btrim(p_reason)
      else ''
    end;

  insert into public.administrative_requests(
    patient_id,
    requesting_professional_id,
    subject,
    description,
    status,
    source_agenda_change_request_id,
    source_coordination_decision_id,
    created_at,
    updated_at
  )
  values(
    null,
    p_professional_id,
    v_subject,
    v_description,
    'pending',
    p_source_agenda_change_request_id,
    p_source_coordination_decision_id,
    clock_timestamp(),
    clock_timestamp()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

revoke all on function private.capo_ensure_agenda_block_admin_request(uuid,uuid,uuid,text,date,date,text)
  from public, anon, authenticated;

create or replace function public.decide_agenda_change_request_for_interface(
  p_request_id uuid,
  p_decision text,
  p_reason text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_request public.agenda_change_requests%rowtype;
  v_now timestamptz := clock_timestamp();
  v_new_status text;
  v_admin_request_id uuid;
  v_start_date date;
  v_end_date date;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  if not (public.has_app_role('coordenador') or public.has_app_role('administrador')) then raise exception 'Somente Coordenação ou Administrador pode decidir alteração estrutural de Agenda.' using errcode='42501'; end if;
  if p_decision not in ('aprovar','rejeitar') then raise exception 'Decisão inválida.'; end if;
  if p_decision='rejeitar' and length(btrim(coalesce(p_reason,''))) < 5 then raise exception 'A rejeição exige justificativa.'; end if;

  select * into v_request from public.agenda_change_requests where id=p_request_id for update;
  if not found then raise exception 'Solicitação estrutural não encontrada.'; end if;
  if v_request.status <> 'pendente' then raise exception 'Somente solicitação pendente pode ser decidida.'; end if;

  v_new_status := case when p_decision='aprovar' then 'aprovada' else 'rejeitada' end;
  update public.agenda_change_requests
     set status=v_new_status,
         decision_reason=nullif(btrim(coalesce(p_reason,'')),''),
         decided_at=v_now
   where id=p_request_id;

  if v_new_status='aprovada' then
    begin
      v_start_date := nullif(v_request.requested_changes->>'start_date','')::date;
    exception when others then v_start_date := null;
    end;
    begin
      v_end_date := nullif(v_request.requested_changes->>'end_date','')::date;
    exception when others then v_end_date := null;
    end;
    if v_start_date is null then
      begin
        v_start_date := nullif(v_request.requested_changes->>'exception_date','')::date;
        v_end_date := v_start_date;
      exception when others then
        v_start_date := null;
        v_end_date := null;
      end;
    end if;

    v_admin_request_id := private.capo_ensure_agenda_block_admin_request(
      v_request.professional_id,
      p_request_id,
      null,
      v_request.request_type,
      v_start_date,
      v_end_date,
      coalesce(nullif(btrim(coalesce(p_reason,'')),''),v_request.justification)
    );
  end if;

  if exists(
    select 1 from public.user_accounts ua
    where ua.professional_id=v_request.professional_id
      and ua.is_active=true and ua.auth_user_id is not null
  ) then
    perform public.capo_criar_notificacao(
      null,
      (select ua.auth_user_id from public.user_accounts ua
       where ua.professional_id=v_request.professional_id
         and ua.is_active=true and ua.auth_user_id is not null
       order by ua.created_at desc nulls last limit 1),
      case when v_new_status='aprovada' then 'agenda_change_request_approved' else 'agenda_change_request_rejected' end,
      case when v_new_status='aprovada' then 'Alteração de agenda aprovada' else 'Alteração de agenda rejeitada' end,
      case when v_new_status='aprovada'
        then 'Sua solicitação estrutural de agenda foi aprovada e gerou uma solicitação administrativa de bloqueio/efetivação.'
        else 'Sua solicitação estrutural de agenda foi rejeitada. Consulte a justificativa registrada.' end,
      'agenda_change_requests',p_request_id,
      case when v_new_status='aprovada' then 'normal' else 'alta' end
    );
  end if;

  return jsonb_build_object(
    'success',true,
    'request_id',p_request_id,
    'status',v_new_status,
    'decided_at',v_now,
    'administrative_request_id',v_admin_request_id
  );
end;
$function$;

create or replace function public.register_coordination_team_decision_for_interface(
  p_professional_id uuid,
  p_action_type text,
  p_start_date date,
  p_end_date date,
  p_reason text,
  p_decision text,
  p_source_agenda_change_request_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_action_type text := lower(btrim(coalesce(p_action_type,'')));
  v_decision text := lower(btrim(coalesce(p_decision,'')));
  v_reason text := btrim(coalesce(p_reason,''));
  v_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
  v_admin_request_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('coordenador')) then
    raise exception 'Perfil sem autorização para registrar decisão da Coordenação.' using errcode='42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;

  if not exists(select 1 from public.professionals pr where pr.id=p_professional_id) then
    raise exception 'Profissional não encontrado.' using errcode='22023';
  end if;

  if v_action_type not in (
    'mudanca_horario','ferias','afastamento','mudanca_turno',
    'carga','bloqueio','substituicao','outra'
  ) then raise exception 'Tipo de providência da Coordenação inválido.' using errcode='22023'; end if;

  if v_decision not in ('aprovar','devolver') then
    raise exception 'Decisão inválida. Use aprovar ou devolver.' using errcode='22023';
  end if;

  if char_length(v_reason)<5 or char_length(v_reason)>1000 then
    raise exception 'A justificativa deve possuir entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  if p_start_date is not null and p_end_date is not null and p_end_date<p_start_date then
    raise exception 'Período inválido.' using errcode='22023';
  end if;

  if p_source_agenda_change_request_id is not null
     and not exists(
       select 1 from public.agenda_change_requests acr
       where acr.id=p_source_agenda_change_request_id
         and acr.professional_id=p_professional_id
     ) then
    raise exception 'Solicitação de agenda não corresponde ao profissional informado.' using errcode='22023';
  end if;

  v_status := case when v_decision='aprovar' then 'aprovadas' else 'devolvidas' end;

  insert into public.coordination_team_decisions(
    professional_id,action_type,start_date,end_date,reason,decision,status,
    source_agenda_change_request_id,responsible_account_id,created_at,updated_at
  ) values(
    p_professional_id,v_action_type,p_start_date,p_end_date,v_reason,v_decision,v_status,
    p_source_agenda_change_request_id,v_account_id,v_now,v_now
  )
  returning id into v_id;

  if v_decision='aprovar' then
    v_admin_request_id := private.capo_ensure_agenda_block_admin_request(
      p_professional_id,
      p_source_agenda_change_request_id,
      v_id,
      v_action_type,
      p_start_date,
      p_end_date,
      v_reason
    );
  end if;

  return jsonb_build_object(
    'success',true,
    'decision_id',v_id,
    'professional_id',p_professional_id,
    'action_type',v_action_type,
    'start_date',p_start_date,
    'end_date',p_end_date,
    'decision',v_decision,
    'status',v_status,
    'responsible_account_id',v_account_id,
    'created_at',v_now,
    'administrative_request_id',v_admin_request_id,
    'message',case
      when v_decision='aprovar'
        then 'Decisão da Coordenação registrada e solicitação administrativa de bloqueio gerada.'
      else 'Decisão da Coordenação registrada com sucesso.'
    end
  );
end;
$function$;

do $$
declare
  r record;
begin
  for r in
    select d.*
    from public.coordination_team_decisions d
    where d.status='aprovadas'
      and d.decision='aprovar'
      and d.action_type in (
        'mudanca_horario','ferias','afastamento','mudanca_turno',
        'carga','bloqueio','substituicao','outra'
      )
      and not exists(
        select 1
        from public.administrative_requests ar
        where ar.source_coordination_decision_id=d.id
           or (
             d.source_agenda_change_request_id is not null
             and ar.source_agenda_change_request_id=d.source_agenda_change_request_id
           )
      )
  loop
    perform private.capo_ensure_agenda_block_admin_request(
      r.professional_id,
      r.source_agenda_change_request_id,
      r.id,
      r.action_type,
      r.start_date,
      r.end_date,
      r.reason
    );
  end loop;
end $$;
