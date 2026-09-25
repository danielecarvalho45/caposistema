create or replace function public.get_active_searches_for_interface(
  p_flow_status text default 'ativo',
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
  ) then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;
  if not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador')
  ) then
    raise exception 'Perfil sem autorização para consultar Busca Ativa.' using errcode='42501';
  end if;
  if p_flow_status is not null and p_flow_status not in ('ativo','encerrado') then
    raise exception 'Situação da Busca Ativa inválida.' using errcode='22023';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'Limite deve estar entre 1 e 100.' using errcode='22023';
  end if;
  if p_offset is null or p_offset<0 then
    raise exception 'Offset inválido.' using errcode='22023';
  end if;

  with ranked as (
    select pas.*,
      row_number() over(
        partition by pas.patient_id
        order by pas.contact_date desc,pas.created_at desc,pas.id desc
      ) rn
    from public.patient_active_searches pas
    where pas.search_type='follow_up'
      and public.capo_patient_visible_in_current_context(pas.patient_id)
  ),
  latest as (
    select * from ranked
    where rn=1 and (p_flow_status is null or flow_status=p_flow_status)
  ),
  paged as (
    select * from latest
    order by case when flow_status='ativo' then 0 else 1 end,
             next_contact_at nulls last,
             contact_date desc
    limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'items',
    coalesce(jsonb_agg(
      jsonb_build_object(
        'patient_id',p.id,
        'patient_name',p.full_name,
        'patient_number',p.patient_number,
        'cms',p.cms,
        'phone',p.phone,
        'latest_attempt_id',pg.id,
        'flow_status',pg.flow_status,
        'contact_date',pg.contact_date,
        'contact_method',pg.contact_method,
        'contact_result',pg.contact_result,
        'next_action',pg.next_action,
        'next_contact_at',pg.next_contact_at,
        'notes',pg.notes,
        'closed_at',pg.closed_at,
        'closed_by',pg.closed_by,
        'closure_reason',pg.closure_reason,
        'history',coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id',h.id,
              'contact_date',h.contact_date,
              'contact_method',h.contact_method,
              'contact_result',h.contact_result,
              'next_action',h.next_action,
              'next_contact_at',h.next_contact_at,
              'notes',h.notes,
              'flow_status',h.flow_status,
              'closed_at',h.closed_at,
              'closed_by',h.closed_by,
              'closure_reason',h.closure_reason,
              'professional_id',h.professional_id
            )
            order by h.contact_date desc,h.created_at desc,h.id desc
          )
          from public.patient_active_searches h
          where h.patient_id=pg.patient_id and h.search_type='follow_up'
        ),'[]'::jsonb)
      )
      order by case when pg.flow_status='ativo' then 0 else 1 end,
               pg.next_contact_at nulls last,
               pg.contact_date desc
    ),'[]'::jsonb),
    'total_count',(select count(*) from latest),
    'flow_status',p_flow_status,
    'limit',p_limit,
    'offset',p_offset
  )
  into v_result
  from paged pg
  join public.patients p on p.id=pg.patient_id;

  return coalesce(v_result,jsonb_build_object(
    'items','[]'::jsonb,'total_count',0,'flow_status',p_flow_status,'limit',p_limit,'offset',p_offset
  ));
end;
$function$;

create or replace function public.register_active_search_attempt_for_interface(
  p_patient_id uuid,
  p_contact_method text,
  p_contact_result text,
  p_next_action text default null,
  p_notes text default null,
  p_next_contact_at timestamptz default null,
  p_close_flow boolean default false,
  p_closure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
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
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;
  if not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
  ) then
    raise exception 'Perfil sem autorização para executar Busca Ativa.' using errcode='42501';
  end if;

  perform 1
  from public.patients p
  where p.id=p_patient_id
    and p.status='ativo'
    and coalesce(p.deceased,false)=false
  for update;
  if not found then
    raise exception 'Paciente não localizado, inativo ou com óbito registrado.' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.patient_care_cycles c
    where c.patient_id=p_patient_id
  ) then
    raise exception 'Busca Ativa é exclusiva para paciente com histórico de acompanhamento no CAPO.' using errcode='22023';
  end if;

  if p_contact_method not in ('phone','whatsapp','in_person','other') then
    raise exception 'Meio de contato inválido.' using errcode='22023';
  end if;
  if length(btrim(coalesce(p_contact_result,'')))<2 or length(btrim(p_contact_result))>500 then
    raise exception 'O resultado do contato deve possuir entre 2 e 500 caracteres.' using errcode='22023';
  end if;
  if length(coalesce(p_next_action,''))>500 then
    raise exception 'A próxima ação deve possuir no máximo 500 caracteres.' using errcode='22023';
  end if;
  if length(coalesce(p_notes,''))>1000 then
    raise exception 'A observação deve possuir no máximo 1000 caracteres.' using errcode='22023';
  end if;
  if p_next_contact_at is not null and p_next_contact_at<=v_now then
    raise exception 'O próximo contato deve estar no futuro.' using errcode='22023';
  end if;
  if p_close_flow and length(btrim(coalesce(p_closure_reason,'')))<5 then
    raise exception 'Informe o motivo do encerramento com pelo menos 5 caracteres.' using errcode='22023';
  end if;

  insert into public.patient_active_searches(
    patient_id,professional_id,search_type,contact_date,contact_method,
    contact_result,accepted_service,next_action,notes,flow_status,
    next_contact_at,closed_at,closed_by,closure_reason,updated_at
  ) values (
    p_patient_id,v_professional_id,'follow_up',v_now,p_contact_method,
    btrim(p_contact_result),null,nullif(btrim(coalesce(p_next_action,'')),''),
    nullif(btrim(coalesce(p_notes,'')),''),
    case when p_close_flow then 'encerrado' else 'ativo' end,
    case when p_close_flow then null else p_next_contact_at end,
    case when p_close_flow then v_now else null end,
    case when p_close_flow then v_account_id else null end,
    case when p_close_flow then btrim(p_closure_reason) else null end,
    v_now
  ) returning id into v_id;

  return jsonb_build_object(
    'success',true,'attempt_id',v_id,'patient_id',p_patient_id,
    'flow_status',case when p_close_flow then 'encerrado' else 'ativo' end,
    'next_contact_at',case when p_close_flow then null else p_next_contact_at end,
    'closed_at',case when p_close_flow then v_now else null end,
    'message',case when p_close_flow then
      'Tentativa registrada e Busca Ativa encerrada.'
    else 'Tentativa de Busca Ativa registrada.' end
  );
end;
$function$;

create or replace function public.close_active_search_for_interface(
  p_patient_id uuid,
  p_closure_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_latest_id uuid;
  v_latest_status text;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Perfil sem autorização para executar Busca Ativa.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_closure_reason,'')))<5 or length(btrim(p_closure_reason))>500 then
    raise exception 'O motivo do encerramento deve possuir entre 5 e 500 caracteres.' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_patient_id::text,0));

  select pas.id,pas.flow_status into v_latest_id,v_latest_status
  from public.patient_active_searches pas
  where pas.patient_id=p_patient_id and pas.search_type='follow_up'
  order by pas.contact_date desc,pas.created_at desc,pas.id desc
  limit 1
  for update;

  if v_latest_id is null then
    raise exception 'Não existe Busca Ativa registrada para este paciente.' using errcode='22023';
  end if;
  if v_latest_status='encerrado' then
    raise exception 'A Busca Ativa deste paciente já está encerrada.' using errcode='22023';
  end if;

  update public.patient_active_searches
  set flow_status='encerrado',next_contact_at=null,closed_at=v_now,
      closed_by=v_account_id,closure_reason=btrim(p_closure_reason),updated_at=v_now
  where id=v_latest_id;

  return jsonb_build_object(
    'success',true,'patient_id',p_patient_id,'latest_attempt_id',v_latest_id,
    'flow_status','encerrado','closed_at',v_now,'message','Busca Ativa encerrada.'
  );
end;
$function$;

revoke all on function public.get_active_searches_for_interface(text,integer,integer) from public,anon;
grant execute on function public.get_active_searches_for_interface(text,integer,integer) to authenticated;
revoke all on function public.register_active_search_attempt_for_interface(uuid,text,text,text,text,timestamptz,boolean,text) from public,anon;
grant execute on function public.register_active_search_attempt_for_interface(uuid,text,text,text,text,timestamptz,boolean,text) to authenticated;
revoke all on function public.close_active_search_for_interface(uuid,text) from public,anon;
grant execute on function public.close_active_search_for_interface(uuid,text) to authenticated;
