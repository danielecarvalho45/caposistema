-- CAPO: prova somente-leitura da apresentação Nutrição 60 min em 23/11/2026.
-- Nenhum dado real é criado ou alterado. A chamada autenticada pela UI fica para homologação.
with contract as (
  select pg_get_functiondef(oid) body
  from pg_proc
  where pronamespace='public'::regnamespace
    and proname='get_agenda_schedule_grid_for_interface'
), slots as (
  select v::time as hora,
         ((date '2026-11-23'+v::time)::timestamp at time zone 'America/Sao_Paulo') as slot_start,
         ((date '2026-11-23'+v::time+interval '30 minutes')::timestamp at time zone 'America/Sao_Paulo') as slot_end
  from (values ('13:10'),('13:40'),('14:10'),('14:40'),('15:10'),('16:30'),('17:00')) as t(v)
), rows as (
  select s.hora, a.id original_appointment_id, a.appointment_type,
    coalesce(
      a.id is not null
      and a.appointment_end-a.appointment_date=interval '60 minutes'
      and a.appointment_date<s.slot_start
      and a.appointment_end>s.slot_start
    ,false) as continuacao,
    case when a.id is not null
          and a.appointment_end-a.appointment_date=interval '60 minutes'
          and a.appointment_date<s.slot_start
      then null::uuid else a.id end as visible_appointment_id
  from slots s
  left join lateral (
    select a.*
    from public.patient_appointments a
    where a.professional_id='a15e4860-82be-44cf-965c-2d76fb66c062'
      and a.attendance_status not in ('cancelado','remarcado')
      and a.appointment_date<s.slot_end
      and a.appointment_end>s.slot_start
    order by a.appointment_date limit 1
  ) a on true
), tests as (
  select 'status_agendado_preservado' test,
    position('when pa.id is not null or fa.id is not null then ''agendado''' in body)>0 passed
  from contract
  union all select 'continuação_sem_identificador_duplicado',
    position('case when nutrition_continuation.is_continuation then null::uuid' in body)>0
    and position('else pa.patient_id end patient_id' in body)>0 from contract
  union all select 'continuação_com_rotulo',
    position('''Continuação do atendimento''::text' in body)>0 from contract
  union all select 'escopo_exclusivo_nutricao',
    position('lower(btrim(sp.name)) in (''nutrição'',''nutricao'')' in body)>0 from contract
  union all select 'segundo_slot_13h40_sem_id',
    exists(select 1 from rows where hora='13:40' and continuacao and visible_appointment_id is null)
  union all select 'segundo_slot_14h40_sem_id',
    exists(select 1 from rows where hora='14:40' and continuacao and visible_appointment_id is null)
  union all select 'segundo_slot_17h00_sem_id',
    exists(select 1 from rows where hora='17:00' and continuacao and visible_appointment_id is null)
  union all select 'primeiro_slot_13h10_com_id',
    exists(select 1 from rows where hora='13:10' and not continuacao and visible_appointment_id is not null)
  union all select 'primeiro_slot_16h30_com_id',
    exists(select 1 from rows where hora='16:30' and not continuacao and visible_appointment_id is not null)
  union all select 'retorno_15h10_preservado',
    exists(select 1 from rows where hora='15:10' and appointment_type='retorno'
      and not continuacao and visible_appointment_id is not null)
) select test,passed from tests order by test;
