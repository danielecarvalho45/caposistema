-- REGRESSÃO NÃO DESTRUTIVA — Nutrição 60/30; executar com SQL somente-leitura.
-- Não chama RPCs que gravam, não cria pacientes e não altera agendamentos.
with functions as (
  select
    (select pg_get_functiondef(oid) from pg_proc
      where pronamespace='public'::regnamespace and proname='create_appointment_for_interface') as booking,
    (select pg_get_functiondef(oid) from pg_proc
      where pronamespace='public'::regnamespace and proname='create_extended_appointment_for_interface') as extended_booking,
    (select pg_get_functiondef(oid) from pg_proc
      where pronamespace='public'::regnamespace and proname='reschedule_appointment_for_interface') as rescheduling
), checks as (
  select 'primeira_nutricao_usa_dois_blocos_30' as teste,
    position('v_nutrition_slot_minutes=30' in booking)>0
      and position('return public.create_extended_appointment_for_interface' in booking)>0 as passou
  from functions
  union all
  select 'tipos_iniciais_preservados',
    position('primeiro_capo' in booking)>0
    and position('primeiro_especialidade' in booking)>0
    and position('primeira_consulta' in booking)>0
  from functions
  union all
  select 'retorno_nao_desviado_para_60',
    position('if v_type in (''primeiro_capo'',''primeiro_especialidade'',''primeira_consulta'')' in booking)>0
    and position('when v_type_raw=''retorno'' then ''retorno''' in booking)>0
  from functions
  union all
  select 'agendamento_estendido_um_registro_e_duas_vagas_contiguas',
    position('second_slot.slot_start=first_slot.slot_end' in extended_booking)>0
    and position('second_slot.duration_minutes=first_slot.duration_minutes' in extended_booking)>0
    and position('insert into public.patient_appointments(' in extended_booking)>0
  from functions
  union all
  select 'remarcacao_passa_pela_mesma_regra',
    position('v_new:=public.create_appointment_for_interface(' in rescheduling)>0
    and position('v_old.appointment_type' in rescheduling)>0
  from functions
  union all
  select 'bloqueio_de_sobreposicao_intacto',
    exists(select 1 from pg_trigger
      where tgrelid='public.patient_appointments'::regclass and not tgisinternal
        and tgname='trg_capo_prevent_professional_overlap')
  from functions
  union all
  select 'grade_juliana_em_30_minutos',
    not exists(select 1 from public.agenda_configs c
      where c.professional_id='a15e4860-82be-44cf-965c-2d76fb66c062'::uuid
        and c.is_active and c.start_date<=current_date
        and (c.end_date is null or c.end_date>=current_date)
        and c.appointment_duration_minutes<>30)
    and exists(select 1 from public.agenda_configs c
      where c.professional_id='a15e4860-82be-44cf-965c-2d76fb66c062'::uuid
        and c.is_active and c.start_date<=current_date
        and (c.end_date is null or c.end_date>=current_date)
        and c.appointment_duration_minutes=30)
  from functions
)
select teste, passou from checks order by teste;
