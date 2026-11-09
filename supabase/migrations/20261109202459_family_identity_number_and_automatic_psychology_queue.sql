
alter table public.family_members
  add column if not exists capo_number text,
  add column if not exists cms text;
create unique index if not exists ux_family_members_capo_number
  on public.family_members(capo_number) where capo_number is not null;
create unique index if not exists ux_family_members_cms
  on public.family_members(cms) where cms is not null and btrim(cms)<>'';

create or replace function public.capo_family_link_identity_and_queue()
returns trigger
language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $body$
declare
  v_specialty_id uuid;
  v_is_test boolean;
  v_account_id uuid;
begin
  if new.unlinked_at is not null then return new; end if;
  select coalesce(p.is_test,false) into v_is_test
  from public.patients p where p.id=new.patient_id;
  if not exists(select 1 from public.family_members fm where fm.id=new.family_member_id and nullif(btrim(fm.capo_number),'') is not null) then
    update public.family_members fm set
      capo_number=case when v_is_test then
        'TESTE-CAPO-' || lpad(nextval('public.capo_test_patient_number_seq')::text,4,'0')
        else nextval('public.capo_patient_number_seq')::text end,
      updated_at=clock_timestamp()
    where fm.id=new.family_member_id and nullif(btrim(fm.capo_number),'') is null;
  end if;
  if new.psychological_interest='avaliacao' then
    select s.id into v_specialty_id from public.specialties s
    where s.is_active and lower(btrim(s.name))='psicologia' limit 1;
    if v_specialty_id is null then
      raise exception 'Especialidade Psicologia indisponível para inclusão na fila.' using errcode='22023';
    end if;
    if not exists(select 1 from public.family_psychology_waiting_list q
      where q.family_member_id=new.family_member_id and q.status in ('waiting','paused','called','scheduled')) then
      v_account_id:=new.linked_by;
      insert into public.family_psychology_waiting_list(
        family_link_id,family_member_id,source_patient_id,specialty_id,
        priority,status,entered_at,created_by,updated_at
      ) values (
        new.id,new.family_member_id,new.patient_id,v_specialty_id,
        3,'waiting',clock_timestamp(),v_account_id,clock_timestamp()
      ) on conflict do nothing;
    end if;
  end if;
  return new;
end;
$body$;
revoke all on function public.capo_family_link_identity_and_queue() from public;
drop trigger if exists trg_capo_family_link_identity_and_queue on public.patient_family_links;
create trigger trg_capo_family_link_identity_and_queue
after insert or update of psychological_interest,unlinked_at on public.patient_family_links
for each row execute function public.capo_family_link_identity_and_queue();

-- Migração controlada: numerar os familiares já ativos sem produzir cadastros duplicados.
update public.family_members fm set
  capo_number=case when coalesce(p.is_test,false) then
    'TESTE-CAPO-' || lpad(nextval('public.capo_test_patient_number_seq')::text,4,'0')
    else nextval('public.capo_patient_number_seq')::text end,
  updated_at=clock_timestamp()
from public.patient_family_links pfl
join public.patients p on p.id=pfl.patient_id
where pfl.family_member_id=fm.id and pfl.unlinked_at is null
  and nullif(btrim(fm.capo_number),'') is null;

-- Recuperar somente a entrada recente, que motivou a manutenção, sem reabrir filas históricas.
update public.patient_family_links pfl set psychological_interest='avaliacao'
where pfl.linked_at >= timestamptz '2026-11-09 00:00:00+00'
  and pfl.unlinked_at is null and pfl.psychological_interest='avaliacao'
  and not exists(select 1 from public.family_psychology_waiting_list q where q.family_link_id=pfl.id);
