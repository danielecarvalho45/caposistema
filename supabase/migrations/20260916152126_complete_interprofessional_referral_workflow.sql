alter table public.referrals
  add column if not exists origin_specialty_id uuid
    references public.specialties(id) on delete restrict,
  add column if not exists requested_specialty_id uuid
    references public.specialties(id) on delete restrict;

create index if not exists referrals_origin_specialty_idx
  on public.referrals (origin_specialty_id);
create index if not exists referrals_requested_specialty_status_idx
  on public.referrals (requested_specialty_id, status);

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete restrict,
  event_type text not null check (event_type in (
    'created','approved','started','providence_recorded',
    'completed','rejected','cancelled'
  )),
  from_status text,
  to_status text not null check (to_status in (
    'pending_approval','approved','in_progress',
    'completed','rejected','cancelled'
  )),
  detail text check (detail is null or char_length(detail) <= 1000),
  actor_user_account_id uuid references public.user_accounts(id) on delete restrict,
  actor_role text,
  created_at timestamptz not null default now()
);

create index if not exists referral_events_referral_created_idx
  on public.referral_events (referral_id, created_at desc);

alter table public.referral_events enable row level security;
revoke all on table public.referral_events from public, anon, authenticated;
grant select, insert, update, delete on table public.referral_events to service_role;

drop policy if exists referral_events_no_direct_client_access
  on public.referral_events;
create policy referral_events_no_direct_client_access
on public.referral_events
as restrictive
for all
to authenticated
using (false)
with check (false);

drop trigger if exists trg_audit_referral_events on public.referral_events;
create trigger trg_audit_referral_events
after insert or update or delete on public.referral_events
for each row execute function public.capo_audit_trigger();

insert into public.specialty_capabilities(
  specialty_id,capability_code,is_enabled
)
select s.id,'encaminhamento_interprofissional',true
from public.specialties s
where s.is_active=true
on conflict (specialty_id,capability_code)
do update set is_enabled=true,updated_at=now();

create or replace function public.get_interprofessional_referral_specialties_for_interface()
returns table(specialty_id uuid, specialty_name text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_account_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  return query
  select s.id,s.name
  from public.specialties s
  where s.is_active=true
  order by s.name;
end;
$function$;

create or replace function public.get_interprofessional_referral_targets_for_interface(
  p_specialty_id uuid
)
returns table(professional_id uuid, professional_name text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not (public.has_full_access() or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Administrativo autorizado pode selecionar o destinatário.' using errcode='42501';
  end if;

  return query
  select p.id,p.full_name
  from public.professionals p
  join public.professional_specialties ps on ps.professional_id=p.id
  join public.user_accounts ua on ua.professional_id=p.id and ua.is_active=true
  where ps.specialty_id=p_specialty_id
    and p.status='ativo' and p.is_professional=true
  group by p.id,p.full_name
  order by p.full_name;
end;
$function$;

create or replace function public.create_interprofessional_referral_for_interface(
  p_patient_id uuid,
  p_target_specialty_id uuid,
  p_operational_reason text,
  p_source_appointment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_origin_specialty_id uuid;
  v_cycle_id uuid;
  v_referral_id uuid := gen_random_uuid();
  v_reason text := btrim(coalesce(p_operational_reason,''));
  v_actor_role text;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null or v_professional_id is null then
    raise exception 'Conta ativa com vínculo profissional obrigatória.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'A emissão exige profissional assistencial ativo.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.get_effective_professional_capabilities(v_professional_id) c
    where c.capability_code='encaminhamento_interprofissional'
  ) then
    raise exception 'Capacidade encaminhamento_interprofissional obrigatória.' using errcode='42501';
  end if;

  v_origin_specialty_id := coalesce(
    public.capo_effective_specialty_id(),
    public.resolve_single_active_professional_specialty(v_professional_id)
  );
  if v_origin_specialty_id is null then
    raise exception 'Contexto de especialidade de origem obrigatório.' using errcode='42501';
  end if;
  if p_target_specialty_id is null or p_target_specialty_id=v_origin_specialty_id then
    raise exception 'Selecione uma especialidade de destino diferente da origem.' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.specialties s
    where s.id=p_target_specialty_id and s.is_active=true
  ) then
    raise exception 'Especialidade de destino inexistente ou inativa.' using errcode='22023';
  end if;
  if char_length(v_reason)<5 or char_length(v_reason)>1000 then
    raise exception 'A informação operacional deve possuir entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  perform 1 from public.patients p
  where p.id=p_patient_id and p.status='ativo' and coalesce(p.deceased,false)=false
    and public.capo_patient_visible_in_current_context(p.id)
  for update;
  if not found then
    raise exception 'Paciente inexistente, inativo ou fora do seu escopo.' using errcode='42501';
  end if;

  select c.id into v_cycle_id
  from public.patient_care_cycles c
  where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc limit 1 for update;
  if v_cycle_id is null then
    raise exception 'Paciente sem ciclo CAPO aberto.' using errcode='22023';
  end if;

  if p_source_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id=p_source_appointment_id and a.patient_id=p_patient_id
      and a.professional_id=v_professional_id and a.care_cycle_id=v_cycle_id
      and a.status not in ('cancelado','remarcado')
  ) then
    raise exception 'Atendimento de origem inválido para este encaminhamento.' using errcode='22023';
  end if;

  if exists (
    select 1 from public.referrals r
    where r.patient_id=p_patient_id
      and r.requesting_professional_id=v_professional_id
      and r.requested_specialty_id=p_target_specialty_id
      and lower(r.destination)='administrativo'
      and r.status in ('pending_approval','approved','in_progress')
  ) then
    raise exception 'Já existe encaminhamento ativo para este paciente e especialidade.' using errcode='23505';
  end if;

  insert into public.referrals(
    id,patient_id,requesting_professional_id,origin_specialty_id,
    requested_specialty_id,destination,reason,status,care_cycle_id,
    source_appointment_id,created_at,updated_at
  ) values (
    v_referral_id,p_patient_id,v_professional_id,v_origin_specialty_id,
    p_target_specialty_id,'administrativo',v_reason,'pending_approval',v_cycle_id,
    p_source_appointment_id,v_now,v_now
  );

  select ar.code into v_actor_role
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc,ar.code limit 1;

  insert into public.referral_events(
    referral_id,event_type,from_status,to_status,detail,
    actor_user_account_id,actor_role,created_at
  ) values (
    v_referral_id,'created',null,'pending_approval',v_reason,
    v_account_id,v_actor_role,v_now
  );

  return jsonb_build_object(
    'success',true,'referral_id',v_referral_id,'status','pending_approval',
    'created_at',v_now
  );
end;
$function$;

create or replace function public.get_interprofessional_referrals_for_interface(
  p_direction text default 'all',
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  referral_id uuid, patient_id uuid, patient_name text, patient_number text,
  cms text, requesting_professional_id uuid, requesting_professional_name text,
  origin_specialty_id uuid, origin_specialty_name text,
  requested_specialty_id uuid, requested_specialty_name text,
  target_professional_id uuid, target_professional_name text,
  operational_reason text, response text, status text, direction text,
  source_appointment_id uuid, created_at timestamptz, updated_at timestamptz,
  approved_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
  last_action text, total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_can_view_all boolean;
  v_direction text := lower(btrim(coalesce(p_direction,'all')));
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select public.capo_effective_professional_id() into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;

  v_can_view_all := public.has_full_access()
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');
  if not v_can_view_all and v_professional_id is null then
    raise exception 'Usuário sem vínculo profissional.' using errcode='42501';
  end if;
  if v_direction not in ('all','sent','received') then
    raise exception 'Direção de encaminhamento inválida.' using errcode='22023';
  end if;
  if p_status is not null and p_status not in (
    'pending_approval','approved','in_progress','completed','rejected','cancelled'
  ) then
    raise exception 'Situação de encaminhamento inválida.' using errcode='22023';
  end if;

  return query
  select r.id,r.patient_id,pt.full_name,pt.patient_number,pt.cms,
    r.requesting_professional_id,rp.full_name,
    r.origin_specialty_id,os.name,r.requested_specialty_id,ds.name,
    r.target_professional_id,tp.full_name,r.reason,r.response,r.status,
    case when r.requesting_professional_id=v_professional_id then 'sent'
         when r.target_professional_id=v_professional_id then 'received'
         else 'managed' end,
    r.source_appointment_id,r.created_at,r.updated_at,r.approved_at,
    r.completed_at,r.cancelled_at,ev.detail,count(*) over()
  from public.referrals r
  join public.patients pt on pt.id=r.patient_id
  join public.professionals rp on rp.id=r.requesting_professional_id
  left join public.specialties os on os.id=r.origin_specialty_id
  left join public.specialties ds on ds.id=r.requested_specialty_id
  left join public.professionals tp on tp.id=r.target_professional_id
  left join lateral (
    select e.detail from public.referral_events e
    where e.referral_id=r.id order by e.created_at desc limit 1
  ) ev on true
  where lower(r.destination)='administrativo'
    and r.requested_specialty_id is not null
    and (p_status is null or r.status=p_status)
    and (v_can_view_all or r.requesting_professional_id=v_professional_id
      or r.target_professional_id=v_professional_id)
    and (v_can_view_all or public.capo_patient_visible_in_current_context(r.patient_id))
    and (v_direction='all'
      or (v_direction='sent' and r.requesting_professional_id=v_professional_id)
      or (v_direction='received' and r.target_professional_id=v_professional_id))
  order by case r.status when 'pending_approval' then 0 when 'approved' then 1
    when 'in_progress' then 2 else 3 end,r.updated_at desc
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

create or replace function public.get_interprofessional_referral_events_for_interface(
  p_referral_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  event_id uuid, referral_id uuid, event_type text, from_status text,
  to_status text, detail text, actor_name text, actor_role text,
  created_at timestamptz
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
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select public.capo_effective_professional_id() into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;
  v_can_view_all := public.has_full_access()
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');

  if not exists (
    select 1 from public.referrals r
    where r.id=p_referral_id and r.requested_specialty_id is not null
      and (v_can_view_all or r.requesting_professional_id=v_professional_id
        or r.target_professional_id=v_professional_id)
      and (v_can_view_all or public.capo_patient_visible_in_current_context(r.patient_id))
  ) then
    raise exception 'Encaminhamento não encontrado ou fora do seu escopo.' using errcode='42501';
  end if;

  return query
  select e.id,e.referral_id,e.event_type,e.from_status,e.to_status,e.detail,
    coalesce(p.full_name,ua.username,'Sistema'),e.actor_role,e.created_at
  from public.referral_events e
  left join public.user_accounts ua on ua.id=e.actor_user_account_id
  left join public.professionals p on p.id=ua.professional_id
  where e.referral_id=p_referral_id
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit,100),1),200)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

create or replace function public.update_interprofessional_referral_for_interface(
  p_referral_id uuid,
  p_action text,
  p_detail text default null,
  p_target_professional_id uuid default null
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
  v_referral public.referrals%rowtype;
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_detail text := nullif(btrim(coalesce(p_detail,'')),'');
  v_new_status text;
  v_event_type text;
  v_is_manager boolean;
  v_is_requester boolean;
  v_is_recipient boolean;
  v_requester_user_id uuid;
  v_target_user_id uuid;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;

  if v_action not in ('approve','start','record','complete','reject','cancel') then
    raise exception 'Ação de encaminhamento inválida.' using errcode='22023';
  end if;
  if char_length(coalesce(v_detail,''))>1000 then
    raise exception 'A providência deve possuir no máximo 1000 caracteres.' using errcode='22023';
  end if;
  if v_action in ('record','complete','reject','cancel') and char_length(coalesce(v_detail,''))<5 then
    raise exception 'Informe providência ou justificativa entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  select * into v_referral from public.referrals r
  where r.id=p_referral_id and r.requested_specialty_id is not null
    and lower(r.destination)='administrativo' for update;
  if v_referral.id is null then raise exception 'Encaminhamento não encontrado.' using errcode='22023'; end if;

  v_is_manager := public.has_full_access() or public.has_app_role('administrativo_operacional');
  v_is_requester := v_professional_id is not null
    and v_referral.requesting_professional_id=v_professional_id;
  v_is_recipient := v_professional_id is not null
    and v_referral.target_professional_id=v_professional_id;

  case v_action
    when 'approve' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode aprovar e atribuir.' using errcode='42501'; end if;
      if v_referral.status<>'pending_approval' then raise exception 'Somente encaminhamento pendente pode ser aprovado.' using errcode='22023'; end if;
      if p_target_professional_id is null or not exists (
        select 1 from public.professionals p
        join public.professional_specialties ps on ps.professional_id=p.id
        join public.user_accounts ua on ua.professional_id=p.id and ua.is_active=true
        where p.id=p_target_professional_id and p.status='ativo' and p.is_professional=true
          and ps.specialty_id=v_referral.requested_specialty_id
      ) then raise exception 'Selecione profissional ativo da especialidade de destino.' using errcode='22023'; end if;
      perform public.ensure_cycle_specialty(
        v_referral.care_cycle_id,v_referral.requested_specialty_id,'encaminhamento',
        v_referral.id,v_account_id,p_target_professional_id
      );
      v_new_status:='approved'; v_event_type:='approved';
    when 'start' then
      if not (v_is_manager or v_is_recipient) then raise exception 'Apenas o destinatário ou o Administrativo pode iniciar.' using errcode='42501'; end if;
      if v_referral.status<>'approved' then raise exception 'Somente encaminhamento aprovado pode ser iniciado.' using errcode='22023'; end if;
      if p_target_professional_id is not null and p_target_professional_id<>v_referral.target_professional_id then
        raise exception 'O destinatário não pode ser alterado nesta ação.' using errcode='22023';
      end if;
      v_new_status:='in_progress'; v_event_type:='started';
    when 'record' then
      if not (v_is_manager or v_is_recipient) then raise exception 'Apenas o destinatário ou o Administrativo pode registrar providência.' using errcode='42501'; end if;
      if v_referral.status<>'in_progress' then raise exception 'Providências exigem encaminhamento em andamento.' using errcode='22023'; end if;
      v_new_status:='in_progress'; v_event_type:='providence_recorded';
    when 'complete' then
      if not (v_is_manager or v_is_recipient) then raise exception 'Apenas o destinatário ou o Administrativo pode concluir.' using errcode='42501'; end if;
      if v_referral.status not in ('approved','in_progress') then raise exception 'Este encaminhamento não pode ser concluído.' using errcode='22023'; end if;
      v_new_status:='completed'; v_event_type:='completed';
    when 'reject' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode recusar.' using errcode='42501'; end if;
      if v_referral.status<>'pending_approval' then raise exception 'Somente encaminhamento pendente pode ser recusado.' using errcode='22023'; end if;
      v_new_status:='rejected'; v_event_type:='rejected';
    when 'cancel' then
      if not (v_is_manager or v_is_requester) then raise exception 'Perfil sem autorização para cancelar.' using errcode='42501'; end if;
      if v_referral.status in ('completed','rejected','cancelled') then raise exception 'Encaminhamento já encerrado.' using errcode='22023'; end if;
      if not v_is_manager and v_referral.status<>'pending_approval' then raise exception 'O solicitante só pode cancelar enquanto aguarda aprovação.' using errcode='42501'; end if;
      v_new_status:='cancelled'; v_event_type:='cancelled';
  end case;

  select ar.code into v_actor_role
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc,ar.code limit 1;

  update public.referrals
  set status=v_new_status,
      target_professional_id=case when v_action='approve' then p_target_professional_id else target_professional_id end,
      target_specialty_id=case when v_action='approve' then requested_specialty_id else target_specialty_id end,
      response=case when v_action in ('record','complete','reject','cancel') then v_detail else response end,
      approved_at=case when v_action='approve' then v_now else approved_at end,
      completed_at=case when v_action='complete' then v_now else completed_at end,
      cancelled_at=case when v_action='cancel' then v_now else cancelled_at end,
      updated_at=v_now
  where id=p_referral_id;

  insert into public.referral_events(
    referral_id,event_type,from_status,to_status,detail,
    actor_user_account_id,actor_role,created_at
  ) values (
    p_referral_id,v_event_type,v_referral.status,v_new_status,v_detail,
    v_account_id,v_actor_role,v_now
  );

  select ua.auth_user_id into v_requester_user_id
  from public.user_accounts ua
  where ua.professional_id=v_referral.requesting_professional_id and ua.is_active=true limit 1;

  if v_action='approve' then
    select ua.auth_user_id into v_target_user_id
    from public.user_accounts ua
    where ua.professional_id=p_target_professional_id and ua.is_active=true limit 1;
    if v_target_user_id is not null then
      perform public.capo_criar_notificacao(null,v_target_user_id,'referral_assigned',
        'Novo encaminhamento recebido','Um encaminhamento foi atribuído para sua atuação.',
        'referrals',p_referral_id,'alta');
    end if;
    if v_requester_user_id is not null then
      perform public.capo_criar_notificacao(null,v_requester_user_id,'referral_approved',
        'Encaminhamento aprovado','Seu encaminhamento foi aprovado e atribuído ao destinatário.',
        'referrals',p_referral_id,'normal');
    end if;
  elsif v_action='start' and v_requester_user_id is not null then
    perform public.capo_criar_notificacao(null,v_requester_user_id,'referral_started',
      'Encaminhamento em andamento','O destinatário iniciou o encaminhamento.',
      'referrals',p_referral_id,'normal');
  elsif v_action in ('reject','cancel') and v_requester_user_id is not null then
    perform public.capo_criar_notificacao(null,v_requester_user_id,
      case when v_action='reject' then 'referral_rejected' else 'referral_cancelled' end,
      case when v_action='reject' then 'Encaminhamento recusado' else 'Encaminhamento cancelado' end,
      coalesce(v_detail,'Consulte o encaminhamento para mais informações.'),
      'referrals',p_referral_id,'normal');
  end if;

  return jsonb_build_object(
    'success',true,'referral_id',p_referral_id,'action',v_action,
    'previous_status',v_referral.status,'status',v_new_status,'updated_at',v_now
  );
end;
$function$;

revoke all on function public.get_interprofessional_referral_specialties_for_interface() from public, anon;
revoke all on function public.get_interprofessional_referral_targets_for_interface(uuid) from public, anon;
revoke all on function public.create_interprofessional_referral_for_interface(uuid,uuid,text,uuid) from public, anon;
revoke all on function public.get_interprofessional_referrals_for_interface(text,text,integer,integer) from public, anon;
revoke all on function public.get_interprofessional_referral_events_for_interface(uuid,integer,integer) from public, anon;
revoke all on function public.update_interprofessional_referral_for_interface(uuid,text,text,uuid) from public, anon;

grant execute on function public.get_interprofessional_referral_specialties_for_interface() to authenticated;
grant execute on function public.get_interprofessional_referral_targets_for_interface(uuid) to authenticated;
grant execute on function public.create_interprofessional_referral_for_interface(uuid,uuid,text,uuid) to authenticated;
grant execute on function public.get_interprofessional_referrals_for_interface(text,text,integer,integer) to authenticated;
grant execute on function public.get_interprofessional_referral_events_for_interface(uuid,integer,integer) to authenticated;
grant execute on function public.update_interprofessional_referral_for_interface(uuid,text,text,uuid) to authenticated;
