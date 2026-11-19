
-- Histórico imutável das transições da Comunicação Interna, sem afetar administrative_request_events.
create table if not exists public.capo_internal_communication_events (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.capo_internal_communications(id),
  actor_account_id uuid not null references public.user_accounts(id),
  event_type text not null check(event_type in ('criada','situacao_alterada')),
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);
create index if not exists capo_internal_events_timeline_idx on public.capo_internal_communication_events(communication_id,created_at,id);
alter table public.capo_internal_communication_events enable row level security;
revoke all on public.capo_internal_communication_events from public,anon,authenticated;

create or replace function public.capo_internal_record_status_event()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid;
begin
 if tg_op='INSERT' then
   insert into public.capo_internal_communication_events(
     communication_id,actor_account_id,event_type,from_status,to_status
   ) values(new.id,new.sender_account_id,'criada',null,new.status);
 elsif old.status is distinct from new.status then
   select ua.id into v_actor from public.user_accounts ua
   where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
   if v_actor is null then raise exception 'Ator da alteração de estado não identificado.' using errcode='42501'; end if;
   insert into public.capo_internal_communication_events(
     communication_id,actor_account_id,event_type,from_status,to_status
   ) values(new.id,v_actor,'situacao_alterada',old.status,new.status);
 end if;
 return new;
end $$;
revoke all on function public.capo_internal_record_status_event() from public,anon,authenticated;
drop trigger if exists trg_capo_internal_record_status_event on public.capo_internal_communications;
create trigger trg_capo_internal_record_status_event
  after insert or update of status on public.capo_internal_communications
  for each row execute function public.capo_internal_record_status_event();
