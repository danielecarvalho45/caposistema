create or replace function public.close_care_closure_for_interface(
  p_closure_id uuid,
  p_closure_notes text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_closure public.patient_care_closures%rowtype;
  v_now timestamptz := clock_timestamp();
  v_care_cycle_id uuid;
  v_other_pending integer;
  v_recipient record;
  v_notified integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(), false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;

  select ua.id, public.capo_effective_professional_id()
    into v_account_id, v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null or v_professional_id is null then
    raise exception 'Conta profissional ativa e vinculada é obrigatória para encerrar a própria atuação.';
  end if;
  if length(btrim(coalesce(p_closure_notes,'')))<5 or length(btrim(p_closure_notes))>1000 then
    raise exception 'O motivo/observação do encerramento deve possuir entre 5 e 1000 caracteres.';
  end if;

  select * into v_closure
  from public.patient_care_closures
  where id=p_closure_id
  for update;

  if v_closure.id is null then raise exception 'Encerramento não encontrado.'; end if;
  perform public.capo_assert_patient_write_context(v_closure.patient_id);
  if v_closure.status<>'pendente' then raise exception 'Somente encerramentos pendentes podem ser concluídos.'; end if;
  if v_closure.professional_id is null then
    raise exception 'A pendência ainda aguarda atribuição explícita de profissional responsável.';
  end if;
  if v_closure.professional_id<>v_professional_id then
    raise exception 'Este encerramento pertence à atuação de outro profissional.';
  end if;

  update public.patient_care_closures
     set status='encerrado',
         closed_at=v_now,
         closed_by=v_account_id,
         closure_notes=case
           when nullif(btrim(coalesce(closure_notes,'')),'') is null
             then 'Encerramento: '||btrim(p_closure_notes)
           else closure_notes||E'\nEncerramento: '||btrim(p_closure_notes)
         end,
         updated_at=v_now
   where id=p_closure_id;

  if v_closure.cycle_specialty_id is not null then
    select cs.care_cycle_id
      into v_care_cycle_id
    from public.patient_care_cycle_specialties cs
    where cs.id=v_closure.cycle_specialty_id
    for update;

    if v_care_cycle_id is null then
      raise exception 'Especialidade canônica do ciclo não encontrada para este encerramento.';
    end if;

    select count(*)
      into v_other_pending
    from public.patient_care_closures cc
    where cc.cycle_specialty_id=v_closure.cycle_specialty_id
      and cc.status='pendente'
      and cc.id<>p_closure_id;

    if v_other_pending=0 then
      update public.patient_care_cycle_specialties
         set status='encerrada',
             resolution_type='professional_closure',
             resolved_at=v_now,
             resolved_by=v_account_id,
             resolution_reason=btrim(p_closure_notes),
             updated_at=v_now
       where id=v_closure.cycle_specialty_id;
    else
      update public.patient_care_cycle_specialties
         set status='encerramento_pendente',
             resolution_type=null,
             resolved_at=null,
             resolved_by=null,
             resolution_reason=null,
             updated_at=v_now
       where id=v_closure.cycle_specialty_id;
    end if;

    update public.patient_care_cycles
       set status='encerramento_em_andamento',
           updated_at=v_now
     where id=v_care_cycle_id
       and status='ativo';

    for v_recipient in
      with active_professionals as (
        select cs.current_responsible_professional_id as professional_id
        from public.patient_care_cycle_specialties cs
        where cs.care_cycle_id=v_care_cycle_id
          and cs.status in ('ativa','encerramento_pendente')
          and cs.current_responsible_professional_id is not null
        union
        select pa.professional_id
        from public.patient_appointments pa
        where pa.care_cycle_id=v_care_cycle_id
          and pa.patient_id=v_closure.patient_id
          and pa.professional_id is not null
          and pa.attendance_status not in ('cancelado','remarcado')
      )
      select distinct ua.auth_user_id
      from active_professionals ap
      join public.professionals pr
        on pr.id=ap.professional_id
       and pr.status='ativo'
       and pr.is_professional=true
      join public.user_accounts ua
        on ua.professional_id=ap.professional_id
       and ua.is_active=true
      where ap.professional_id<>v_professional_id
        and ua.auth_user_id is not null
    loop
      perform public.capo_criar_notificacao(
        null,
        v_recipient.auth_user_id,
        'care_specialty_closed',
        'Encerramento de outra especialidade',
        'Outro profissional encerrou a própria atuação para este paciente. Sua atuação permanece independente e deve ser encerrada conforme sua programação.',
        'patient_care_closures',
        p_closure_id,
        'normal'
      );
      v_notified := v_notified + 1;
    end loop;
  end if;

  perform public.capo_criar_notificacao(
    'administrativo_operacional',
    null,
    'care_closure_completed',
    'Encerramento de especialidade concluído',
    'Um encerramento de atuação profissional foi concluído e está disponível para acompanhamento administrativo.',
    'patient_care_closures',
    p_closure_id,
    'normal'
  );

  return jsonb_build_object(
    'success',true,
    'closure_id',p_closure_id,
    'status','encerrado',
    'cycle_specialty_id',v_closure.cycle_specialty_id,
    'care_cycle_id',v_care_cycle_id,
    'specialty_fully_closed',coalesce(v_closure.cycle_specialty_id is not null and v_other_pending=0,false),
    'other_professionals_notified',v_notified,
    'closed_at',v_now,
    'message','Encerramento registrado com sucesso.'
  );
end;
$function$;