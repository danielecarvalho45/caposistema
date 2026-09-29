create or replace function public.correct_patient_death_for_interface(
  p_patient_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_is_admin boolean := false;
  v_is_ao boolean := false;
  v_is_social boolean := false;
  v_patient public.patients%rowtype;
  v_restore_status text;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_now timestamptz := clock_timestamp();
  v_professional uuid;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id, public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;

  v_is_admin := public.has_app_role('administrador');
  v_is_ao := public.has_app_role('administrativo_operacional');

  if v_professional_id is not null and public.has_app_role('profissional') then
    select exists(
      select 1
      from public.professionals pr
      join public.professional_specialties ps on ps.professional_id=pr.id
      join public.specialties sp on sp.id=ps.specialty_id
      where pr.id=v_professional_id
        and pr.status='ativo'
        and pr.is_professional=true
        and sp.is_active=true
        and lower(btrim(sp.name))=lower('Assistência Social')
    ) into v_is_social;
  end if;

  if not (v_is_admin or v_is_ao or v_is_social) then
    raise exception 'Perfil sem autorização para corrigir registro de óbito.' using errcode='42501';
  end if;

  perform public.capo_assert_patient_write_context(p_patient_id);

  select *
    into v_patient
  from public.patients p
  where p.id=p_patient_id
  for update;

  if v_patient.id is null then
    raise exception 'Paciente não encontrado.' using errcode='22023';
  end if;

  if not coalesce(v_patient.deceased,false) then
    raise exception 'Este paciente não possui óbito ativo para corrigir.' using errcode='22023';
  end if;

  if v_is_social and not (v_is_admin or v_is_ao) and not exists(
    select 1
    from public.social_followup_cycles sfc
    where sfc.patient_id=p_patient_id
      and sfc.professional_id=v_professional_id
      and sfc.status in ('ativo','encerrado')
  ) then
    raise exception 'Paciente fora do contexto social deste profissional.' using errcode='42501';
  end if;

  if v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500 then
    raise exception 'O motivo da correção deve possuir entre 5 e 500 caracteres.' using errcode='22023';
  end if;

  select al.old_data ->> 'status'
    into v_restore_status
  from public.audit_logs al
  where al.entity_name='patients'
    and al.record_id=p_patient_id::text
    and al.action='UPDATE'
    and coalesce(al.old_data ->> 'deceased','false')='false'
    and coalesce(al.new_data ->> 'deceased','false')='true'
  order by al.created_at desc
  limit 1;

  if v_restore_status is null
     or v_restore_status not in ('ativo','alta_medica','acompanhamento_encerrado','inativo') then
    raise exception 'Não foi possível identificar com segurança o status anterior ao óbito. Nenhuma alteração foi realizada.' using errcode='22023';
  end if;

  update public.patients
     set deceased=false,
         status=v_restore_status,
         death_date=null,
         death_time=null,
         death_source=null,
         death_notes=null,
         death_recorded_at=null,
         death_recorded_by=null,
         updated_at=v_now
   where id=p_patient_id;

  perform public.capo_criar_notificacao(
    'administrativo_operacional',
    null,
    'patient_death_corrected',
    'Registro de óbito corrigido',
    'Um registro de óbito foi corrigido com histórico preservado. Revise eventuais providências operacionais relacionadas.',
    'patients',
    p_patient_id,
    'alta'
  );

  perform public.capo_criar_notificacao(
    'coordenador',
    null,
    'patient_death_corrected',
    'Registro de óbito corrigido',
    'Um registro de óbito foi corrigido com histórico preservado.',
    'patients',
    p_patient_id,
    'alta'
  );

  for v_professional in
    select distinct pa.professional_id
    from public.patient_appointments pa
    where pa.patient_id=p_patient_id
      and pa.professional_id is not null
  loop
    for v_user in
      select ua.auth_user_id
      from public.user_accounts ua
      where ua.professional_id=v_professional
        and ua.is_active=true
        and ua.auth_user_id is not null
    loop
      perform public.capo_criar_notificacao(
        'profissional',
        v_user,
        'patient_death_corrected',
        'Correção de registro de óbito',
        'O registro de óbito de um paciente acompanhado por você foi corrigido. Consulte o contexto atual do paciente.',
        'patients',
        p_patient_id,
        'alta'
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'success',true,
    'patient_id',p_patient_id,
    'deceased',false,
    'restored_status',v_restore_status,
    'correction_reason',v_reason,
    'corrected_at',v_now,
    'corrected_by',v_account_id,
    'message','Registro de óbito corrigido com histórico preservado.'
  );
end;
$function$;

revoke all on function public.correct_patient_death_for_interface(uuid,text) from public, anon;
grant execute on function public.correct_patient_death_for_interface(uuid,text) to authenticated;
