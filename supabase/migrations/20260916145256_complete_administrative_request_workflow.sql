alter table public.administrative_requests
  drop constraint if exists administrative_requests_status_check;

alter table public.administrative_requests
  add constraint administrative_requests_status_check
  check (status in (
    'pending', 'in_progress', 'returned',
    'completed', 'refused', 'cancelled'
  ));

drop index if exists public.administrative_requests_family_psych_active_uq;
create unique index administrative_requests_family_psych_active_uq
  on public.administrative_requests (source_family_link_id)
  where source_family_link_id is not null
    and status in ('pending', 'in_progress', 'returned');

create table public.administrative_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.administrative_requests(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'started', 'providence_recorded', 'returned',
    'resubmitted', 'completed', 'refused', 'cancelled'
  )),
  from_status text,
  to_status text not null check (to_status in (
    'pending', 'in_progress', 'returned',
    'completed', 'refused', 'cancelled'
  )),
  detail text check (detail is null or char_length(detail) <= 1000),
  counter_reference text check (
    counter_reference is null or char_length(counter_reference) <= 1000
  ),
  actor_user_account_id uuid references public.user_accounts(id) on delete restrict,
  actor_role text,
  created_at timestamptz not null default now()
);

create index administrative_request_events_request_created_idx
  on public.administrative_request_events (request_id, created_at desc);

alter table public.administrative_request_events enable row level security;
revoke all on table public.administrative_request_events from public, anon, authenticated;
grant select, insert, update, delete on table public.administrative_request_events to service_role;

create trigger trg_audit_administrative_request_events
after insert or update or delete on public.administrative_request_events
for each row execute function public.capo_audit_trigger();

create or replace function public.notify_admin_request()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_account_id uuid;
  v_actor_role text;
  v_requester_auth_user_id uuid;
  v_notification_type text;
  v_title text;
  v_message text;
begin
  select ua.id
    into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  select ar.code
    into v_actor_role
  from public.user_roles ur
  join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc, ar.code
  limit 1;

  if tg_op='INSERT' then
    insert into public.administrative_request_events(
      request_id,event_type,from_status,to_status,detail,
      counter_reference,actor_user_account_id,actor_role
    ) values (
      new.id,'created',null,new.status,new.description,
      null,v_account_id,v_actor_role
    );

    perform public.capo_criar_notificacao(
      'administrativo_operacional',null,'administrative_request_new',
      'Nova solicitação administrativa','Há uma nova solicitação aguardando providência.',
      'administrative_requests',new.id,'alta'
    );
    return new;
  end if;

  if new.status is not distinct from old.status
     and new.administrative_response is distinct from old.administrative_response
     and new.status='in_progress' then
    v_notification_type := 'administrative_request_update';
    v_title := 'Providência registrada';
    v_message := 'Uma nova providência foi registrada em sua solicitação administrativa.';
  elsif new.status is distinct from old.status then
    case new.status
      when 'pending' then
        if old.status='returned' then
          perform public.capo_criar_notificacao(
            'administrativo_operacional',null,'administrative_request_resubmitted',
            'Solicitação reenviada','Uma solicitação devolvida recebeu complemento e voltou para análise.',
            'administrative_requests',new.id,'alta'
          );
        end if;
        return new;
      when 'returned' then
        v_notification_type := 'administrative_request_returned';
        v_title := 'Solicitação devolvida';
        v_message := 'Sua solicitação precisa de informação complementar.';
      when 'completed' then
        v_notification_type := 'administrative_request_completed';
        v_title := 'Solicitação concluída';
        v_message := 'Sua solicitação administrativa foi concluída.';
      when 'refused' then
        v_notification_type := 'administrative_request_refused';
        v_title := 'Solicitação recusada';
        v_message := 'Sua solicitação administrativa foi recusada com justificativa.';
      when 'cancelled' then
        v_notification_type := 'administrative_request_cancelled';
        v_title := 'Solicitação cancelada';
        v_message := 'Sua solicitação administrativa foi cancelada.';
      else
        return new;
    end case;
  else
    return new;
  end if;

  select ua.auth_user_id
    into v_requester_auth_user_id
  from public.user_accounts ua
  where ua.professional_id=new.requesting_professional_id
    and ua.is_active=true
  limit 1;

  if v_requester_auth_user_id is not null then
    perform public.capo_criar_notificacao(
      null,v_requester_auth_user_id,v_notification_type,
      v_title,v_message,'administrative_requests',new.id,'normal'
    );
  end if;

  if new.status in ('refused','cancelled') then
    update public.patient_no_show_followups
       set rescheduling_requested=false,
           reschedule_request_id=null,
           active_search_status='em_contato',
           updated_at=now()
     where reschedule_request_id=new.id
       and active_search_status='remarcacao_solicitada';
  end if;

  return new;
end;
$function$;

create or replace function public.get_administrative_requests_for_interface(
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  request_id uuid, patient_id uuid, patient_name text, patient_number text,
  cms text, requesting_professional_id uuid, requesting_professional_name text,
  subject text, description text, status text, administrative_response text,
  counter_reference text, created_at timestamptz, updated_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_can_view_all boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  if p_status is not null and p_status not in (
    'pending','in_progress','returned','completed','refused','cancelled'
  ) then
    raise exception 'Situação da solicitação inválida.' using errcode='22023';
  end if;

  v_can_view_all := public.has_full_access()
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  if not v_can_view_all and v_professional_id is null then
    raise exception 'Usuário sem vínculo profissional.' using errcode='42501';
  end if;

  return query
  select ar.id,ar.patient_id,pt.full_name,pt.patient_number,pt.cms,
         ar.requesting_professional_id,pr.full_name,ar.subject,ar.description,
         ar.status,ar.administrative_response,ar.counter_reference,
         ar.created_at,ar.updated_at,ar.completed_at,ar.cancelled_at,
         count(*) over()
  from public.administrative_requests ar
  left join public.patients pt on pt.id=ar.patient_id
  join public.professionals pr on pr.id=ar.requesting_professional_id
  where (p_status is null or ar.status=p_status)
    and (v_can_view_all or ar.requesting_professional_id=v_professional_id)
    and (ar.patient_id is null or public.capo_patient_visible_in_current_context(ar.patient_id))
  order by case ar.status
    when 'pending' then 0 when 'in_progress' then 1 when 'returned' then 2
    when 'completed' then 3 when 'refused' then 4 else 5 end,
    ar.updated_at desc
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

create or replace function public.get_administrative_request_events_for_interface(
  p_request_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  event_id uuid, request_id uuid, event_type text, from_status text,
  to_status text, detail text, counter_reference text, actor_name text,
  actor_role text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_can_view_all boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  v_can_view_all := public.has_full_access()
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');

  if not exists (
    select 1 from public.administrative_requests ar
    where ar.id=p_request_id
      and (v_can_view_all or ar.requesting_professional_id=v_professional_id)
      and (ar.patient_id is null or public.capo_patient_visible_in_current_context(ar.patient_id))
  ) then
    raise exception 'Solicitação não encontrada ou fora do seu escopo.' using errcode='42501';
  end if;

  return query
  select e.id,e.request_id,e.event_type,e.from_status,e.to_status,e.detail,
         e.counter_reference,coalesce(pr.full_name,ua.username,'Sistema'),
         e.actor_role,e.created_at
  from public.administrative_request_events e
  left join public.user_accounts ua on ua.id=e.actor_user_account_id
  left join public.professionals pr on pr.id=ua.professional_id
  where e.request_id=p_request_id
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit,100),1),200)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

create or replace function public.update_administrative_request_for_interface(
  p_request_id uuid,
  p_action text,
  p_response text default null,
  p_counter_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_actor_role text;
  v_request record;
  v_new_status text;
  v_event_type text;
  v_is_manager boolean;
  v_is_requester boolean;
  v_now timestamptz := now();
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
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  if p_action not in ('start','record','return','resubmit','complete','refuse','cancel') then
    raise exception 'Ação da solicitação inválida.' using errcode='22023';
  end if;
  if char_length(coalesce(p_response,'')) > 1000
     or char_length(coalesce(p_counter_reference,'')) > 1000 then
    raise exception 'Resposta e contrarreferência devem possuir no máximo 1000 caracteres.' using errcode='22023';
  end if;
  if p_action in ('record','return','resubmit','complete','refuse','cancel')
     and char_length(btrim(coalesce(p_response,''))) < 5 then
    raise exception 'Informe uma providência ou justificativa entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  select ar.* into v_request
  from public.administrative_requests ar
  where ar.id=p_request_id
    and (ar.patient_id is null or public.capo_patient_visible_in_current_context(ar.patient_id))
  for update;
  if v_request.id is null then
    raise exception 'Solicitação não encontrada ou fora do seu escopo.' using errcode='42501';
  end if;

  v_is_manager := public.has_full_access() or public.has_app_role('administrativo_operacional');
  v_is_requester := v_professional_id is not null
    and v_request.requesting_professional_id=v_professional_id;

  if p_action in ('start','record','return','complete','refuse') and not v_is_manager then
    raise exception 'Somente o Administrativo Operacional ou Administrador pode executar esta ação.' using errcode='42501';
  end if;
  if p_action='resubmit' and not v_is_requester then
    raise exception 'Somente o solicitante pode complementar e reenviar a solicitação.' using errcode='42501';
  end if;
  if p_action='cancel' and not (v_is_manager or v_is_requester) then
    raise exception 'Perfil sem autorização para cancelar esta solicitação.' using errcode='42501';
  end if;

  case p_action
    when 'start' then
      if v_request.status <> 'pending' then raise exception 'Somente solicitações pendentes podem ser iniciadas.' using errcode='22023'; end if;
      v_new_status := 'in_progress'; v_event_type := 'started';
    when 'record' then
      if v_request.status not in ('pending','in_progress') then raise exception 'Providências só podem ser registradas em solicitações abertas.' using errcode='22023'; end if;
      v_new_status := 'in_progress'; v_event_type := 'providence_recorded';
    when 'return' then
      if v_request.status not in ('pending','in_progress') then raise exception 'Somente solicitações abertas podem ser devolvidas.' using errcode='22023'; end if;
      v_new_status := 'returned'; v_event_type := 'returned';
    when 'resubmit' then
      if v_request.status <> 'returned' then raise exception 'Somente solicitações devolvidas podem ser reenviadas.' using errcode='22023'; end if;
      v_new_status := 'pending'; v_event_type := 'resubmitted';
    when 'complete' then
      if v_request.status not in ('pending','in_progress') then raise exception 'Somente solicitações abertas podem ser concluídas.' using errcode='22023'; end if;
      v_new_status := 'completed'; v_event_type := 'completed';
    when 'refuse' then
      if v_request.status not in ('pending','in_progress') then raise exception 'Somente solicitações abertas podem ser recusadas.' using errcode='22023'; end if;
      v_new_status := 'refused'; v_event_type := 'refused';
    when 'cancel' then
      if v_request.status in ('completed','refused','cancelled') then raise exception 'Esta solicitação já está encerrada.' using errcode='22023'; end if;
      if not v_is_manager and v_request.status not in ('pending','returned') then raise exception 'O solicitante só pode cancelar solicitações pendentes ou devolvidas.' using errcode='22023'; end if;
      v_new_status := 'cancelled'; v_event_type := 'cancelled';
  end case;

  select ar.code into v_actor_role
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc,ar.code limit 1;

  update public.administrative_requests
     set status=v_new_status,
         administrative_response=case when p_action='resubmit' then null when p_action='start' then administrative_response else btrim(p_response) end,
         counter_reference=case when p_action in ('record','complete') then nullif(btrim(coalesce(p_counter_reference,'')),'') else counter_reference end,
         completed_at=case when p_action='complete' then v_now else completed_at end,
         cancelled_at=case when p_action='cancel' then v_now else cancelled_at end,
         updated_at=v_now
   where id=p_request_id;

  insert into public.administrative_request_events(
    request_id,event_type,from_status,to_status,detail,counter_reference,
    actor_user_account_id,actor_role,created_at
  ) values (
    p_request_id,v_event_type,v_request.status,v_new_status,
    nullif(btrim(coalesce(p_response,'')),''),
    nullif(btrim(coalesce(p_counter_reference,'')),''),
    v_account_id,v_actor_role,v_now
  );

  return jsonb_build_object(
    'success',true,'request_id',p_request_id,'action',p_action,
    'previous_status',v_request.status,'status',v_new_status,'updated_at',v_now
  );
end;
$function$;

revoke all on function public.get_administrative_request_events_for_interface(uuid,integer,integer) from public, anon;
revoke all on function public.update_administrative_request_for_interface(uuid,text,text,text) from public, anon;
grant execute on function public.get_administrative_request_events_for_interface(uuid,integer,integer) to authenticated;
grant execute on function public.update_administrative_request_for_interface(uuid,text,text,text) to authenticated;
