create or replace function public.manage_transport_need_for_interface(
  p_cycle_id uuid,
  p_action text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_admin boolean;
  v_social boolean;
  v_cycle public.transport_need_cycles%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_cancelled_requests integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;

  select ua.id, public.capo_effective_professional_id()
    into v_account_id, v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.'; end if;

  select * into v_cycle
  from public.transport_need_cycles
  where id=p_cycle_id
  for update;

  if not found then raise exception 'Ciclo de necessidade de transporte não encontrado.'; end if;
  if v_cycle.status<>'ativo' then raise exception 'Este ciclo de necessidade já está encerrado.'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
    raise exception 'A justificativa deve possuir entre 5 e 500 caracteres.';
  end if;

  v_admin := public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');
  v_social := v_professional_id is not null
    and exists(
      select 1
      from public.professionals pr
      join public.professional_specialties ps on ps.professional_id=pr.id
      join public.specialties sp on sp.id=ps.specialty_id
      where pr.id=v_professional_id
        and pr.status='ativo'
        and pr.is_professional=true
        and sp.is_active=true
        and sp.name='Assistência Social'
    )
    and exists(
      select 1
      from public.social_followup_cycles sfc
      where sfc.patient_id=v_cycle.patient_id
        and sfc.professional_id=v_professional_id
        and sfc.status='ativo'
    );

  if p_action='request_cancel' then
    if not v_social then
      raise exception 'Somente a Assistência Social autorizada pode solicitar cancelamento por este contrato.';
    end if;

    update public.transport_need_cycles
       set cancellation_requested_at=v_now,
           cancellation_requested_by=v_account_id,
           cancellation_request_reason=btrim(p_reason),
           updated_at=v_now
     where id=p_cycle_id;

    return jsonb_build_object(
      'success',true,
      'cycle_id',p_cycle_id,
      'action','request_cancel',
      'requested_at',v_now
    );

  elsif p_action='cancel' then
    if not v_admin then
      raise exception 'Somente Administrativo Operacional ou Administrador/Controlador pode cancelar a necessidade.';
    end if;

    update public.transport_need_cycles
       set status='encerrado',
           closed_at=v_now,
           closed_by=v_account_id,
           closure_reason=btrim(p_reason),
           updated_at=v_now
     where id=p_cycle_id;

    update public.transport_requests
       set status='cancelado',
           cancelled_at=v_now,
           cancelled_by=v_account_id,
           cancellation_reason=btrim(p_reason),
           updated_at=v_now
     where need_cycle_id=p_cycle_id
       and status in ('solicitado','confirmado');

    get diagnostics v_cancelled_requests = row_count;

    return jsonb_build_object(
      'success',true,
      'cycle_id',p_cycle_id,
      'action','cancel',
      'status','encerrado',
      'closed_at',v_now,
      'cancelled_requests',v_cancelled_requests
    );
  else
    raise exception 'Ação de necessidade de transporte inválida.';
  end if;
end;
$function$;

update public.transport_requests tr
   set status='cancelado',
       cancelled_at=coalesce(nc.closed_at,clock_timestamp()),
       cancelled_by=coalesce(nc.closed_by,tr.requested_by),
       cancellation_reason=coalesce(nullif(btrim(nc.closure_reason),''),'Necessidade de transporte encerrada.'),
       updated_at=clock_timestamp()
from public.transport_need_cycles nc
where tr.need_cycle_id=nc.id
  and nc.status='encerrado'
  and tr.status in ('solicitado','confirmado');
