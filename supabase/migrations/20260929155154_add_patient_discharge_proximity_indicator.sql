create table public.patient_discharge_proximity_indicators (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  care_cycle_id uuid not null references public.patient_care_cycles(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  level text not null check (level in ('verde','amarelo','vermelho')),
  status text not null default 'active' check (status in ('active','resolved')),
  activated_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint patient_discharge_proximity_indicator_state_check
    check (
      (status='active' and resolved_at is null)
      or
      (status='resolved' and resolved_at is not null)
    )
);

create unique index patient_discharge_proximity_one_active_per_patient
  on public.patient_discharge_proximity_indicators(patient_id)
  where status='active';

create index patient_discharge_proximity_patient_history_idx
  on public.patient_discharge_proximity_indicators(patient_id, activated_at desc);

create index patient_discharge_proximity_cycle_idx
  on public.patient_discharge_proximity_indicators(care_cycle_id);

alter table public.patient_discharge_proximity_indicators enable row level security;

create policy capo_rpc_only_deny_direct
  on public.patient_discharge_proximity_indicators
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create trigger trg_audit_patient_discharge_proximity_indicators
after insert or delete or update on public.patient_discharge_proximity_indicators
for each row execute function public.capo_audit_trigger();

create or replace function public.get_patient_discharge_proximity_for_interface(
  p_patient_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_allowed boolean := false;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if p_patient_id is null then
    raise exception 'Paciente obrigatório.' using errcode='22023';
  end if;

  perform public.capo_assert_patient_read_context(p_patient_id);

  select ua.id, public.capo_effective_professional_id()
    into v_account_id, v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa obrigatória.' using errcode='42501';
  end if;

  v_allowed :=
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador');

  if not v_allowed and v_professional_id is not null and public.has_app_role('profissional') then
    select exists(
      select 1
      from public.patient_care_cycles c
      where c.patient_id=p_patient_id
        and c.status in ('ativo','encerramento_em_andamento')
        and (
          exists(
            select 1
            from public.patient_care_cycle_specialties cs
            where cs.care_cycle_id=c.id
              and cs.current_responsible_professional_id=v_professional_id
              and cs.status in ('ativa','encerramento_pendente')
          )
          or exists(
            select 1
            from public.patient_appointments pa
            where pa.patient_id=p_patient_id
              and pa.care_cycle_id=c.id
              and pa.professional_id=v_professional_id
              and pa.attendance_status not in ('cancelado','remarcado')
          )
        )
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'Paciente fora da atuação autorizada para consulta deste indicador.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'indicator_id',i.id,
    'patient_id',i.patient_id,
    'care_cycle_id',i.care_cycle_id,
    'level',i.level,
    'label',case i.level
      when 'verde' then 'Em acompanhamento'
      when 'amarelo' then 'Atenção'
      when 'vermelho' then 'Alta próxima'
    end,
    'status',i.status,
    'activated_at',i.activated_at,
    'updated_at',i.updated_at
  )
  into v_result
  from public.patient_discharge_proximity_indicators i
  where i.patient_id=p_patient_id and i.status='active'
  order by i.activated_at desc
  limit 1;

  return coalesce(
    v_result,
    jsonb_build_object(
      'indicator_id',null,
      'patient_id',p_patient_id,
      'care_cycle_id',null,
      'level','verde',
      'label','Em acompanhamento',
      'status','default',
      'activated_at',null,
      'updated_at',null
    )
  );
end;
$function$;

revoke all on function public.get_patient_discharge_proximity_for_interface(uuid)
  from public, anon;
grant execute on function public.get_patient_discharge_proximity_for_interface(uuid)
  to authenticated;

create or replace function public.set_patient_discharge_proximity_for_interface(
  p_patient_id uuid,
  p_level text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_level text := lower(btrim(coalesce(p_level,'')));
  v_cycle_id uuid;
  v_clinical_specialty_id uuid;
  v_current public.patient_discharge_proximity_indicators%rowtype;
  v_indicator_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if p_patient_id is null then
    raise exception 'Paciente obrigatório.' using errcode='22023';
  end if;
  if v_level not in ('verde','amarelo','vermelho') then
    raise exception 'Nível inválido. Use verde, amarelo ou vermelho.' using errcode='22023';
  end if;

  select ua.id, public.capo_effective_professional_id()
    into v_account_id, v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null or v_professional_id is null then
    raise exception 'Conta profissional ativa e vinculada é obrigatória.' using errcode='42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil profissional é obrigatório.' using errcode='42501';
  end if;

  select s.id
    into v_clinical_specialty_id
  from public.professional_specialties ps
  join public.specialties s on s.id=ps.specialty_id
  join public.professionals pr on pr.id=ps.professional_id
  where ps.professional_id=v_professional_id
    and pr.status='ativo'
    and pr.is_professional=true
    and s.is_active=true
    and lower(btrim(s.name))=lower('Clínica Geral')
  limit 1;

  if v_clinical_specialty_id is null then
    raise exception 'Somente a especialidade Clínica Geral pode alterar este indicador.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);

  if not exists(
    select 1
    from public.patients p
    where p.id=p_patient_id
      and p.status='ativo'
      and coalesce(p.deceased,false)=false
  ) then
    raise exception 'Paciente inexistente, inativo ou com óbito registrado.' using errcode='22023';
  end if;

  select c.id
    into v_cycle_id
  from public.patient_care_cycles c
  where c.patient_id=p_patient_id
    and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc
  limit 1
  for update;

  if v_cycle_id is null then
    raise exception 'Paciente sem ciclo CAPO aberto.' using errcode='22023';
  end if;

  if not exists(
    select 1
    from public.patient_care_cycle_specialties cs
    where cs.care_cycle_id=v_cycle_id
      and cs.specialty_id=v_clinical_specialty_id
      and cs.status in ('ativa','encerramento_pendente')
      and (
        cs.current_responsible_professional_id=v_professional_id
        or exists(
          select 1
          from public.patient_appointments pa
          where pa.patient_id=p_patient_id
            and pa.care_cycle_id=v_cycle_id
            and pa.specialty_id=v_clinical_specialty_id
            and pa.professional_id=v_professional_id
            and pa.attendance_status not in ('cancelado','remarcado')
        )
      )
  ) then
    raise exception 'Paciente fora do acompanhamento da Clínica Geral deste profissional.' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('patient-discharge-proximity:'||p_patient_id::text,0)
  );

  select *
    into v_current
  from public.patient_discharge_proximity_indicators i
  where i.patient_id=p_patient_id and i.status='active'
  for update;

  if v_current.id is not null and v_current.level=v_level then
    update public.patient_discharge_proximity_indicators
       set updated_at=v_now
     where id=v_current.id
     returning id into v_indicator_id;
  else
    if v_current.id is not null then
      update public.patient_discharge_proximity_indicators
         set status='resolved',
             resolved_at=v_now,
             updated_at=v_now
       where id=v_current.id;
    end if;

    insert into public.patient_discharge_proximity_indicators(
      patient_id,care_cycle_id,professional_id,level,status,
      activated_at,created_at,updated_at
    ) values (
      p_patient_id,v_cycle_id,v_professional_id,v_level,'active',
      v_now,v_now,v_now
    )
    returning id into v_indicator_id;
  end if;

  return jsonb_build_object(
    'success',true,
    'indicator_id',v_indicator_id,
    'patient_id',p_patient_id,
    'care_cycle_id',v_cycle_id,
    'level',v_level,
    'label',case v_level
      when 'verde' then 'Em acompanhamento'
      when 'amarelo' then 'Atenção'
      when 'vermelho' then 'Alta próxima'
    end,
    'status','active',
    'updated_at',v_now
  );
end;
$function$;

revoke all on function public.set_patient_discharge_proximity_for_interface(uuid,text)
  from public, anon;
grant execute on function public.set_patient_discharge_proximity_for_interface(uuid,text)
  to authenticated;

comment on table public.patient_discharge_proximity_indicators is
  'Indicador transversal de proximidade de alta do paciente; distinto da alta médica efetiva e da vulnerabilidade social/nutricional.';
