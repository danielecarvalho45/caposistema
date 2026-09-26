create or replace function public.manage_dentistry_referral_for_interface(
  p_referral_id uuid,
  p_action text,
  p_response text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_action text;
  v_response text;
  v_referral public.referrals%rowtype;
  v_previous_status text;
  v_new_status text;
  v_event_type text;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.'; end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active is true
  limit 1;

  if v_account_id is null then raise exception 'Conta ativa não encontrada.'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Somente o Administrativo autorizado pode processar encaminhamento odontológico.';
  end if;

  v_action:=lower(trim(coalesce(p_action,'')));
  if v_action not in ('start','complete','cancel') then raise exception 'Ação odontológica administrativa inválida.'; end if;

  v_response:=nullif(trim(coalesce(p_response,'')),'');
  if v_response is not null and char_length(v_response)>1000 then raise exception 'A informação administrativa deve possuir no máximo 1000 caracteres.'; end if;
  if v_action in ('complete','cancel') and (v_response is null or char_length(v_response)<5) then
    raise exception 'Conclusão ou cancelamento exige informação administrativa com pelo menos 5 caracteres.';
  end if;

  select r.* into v_referral
  from public.referrals r
  where r.id=p_referral_id
    and lower(r.destination) in ('odontologia','odontologia - prefeitura','odontologia - secretaria municipal de saúde','odontologia - secretaria municipal de saude')
  for update;

  if not found then raise exception 'Encaminhamento odontológico não encontrado.'; end if;

  if v_action in ('start','complete')
     and (v_referral.document_pdf_path is null or v_referral.document_pdf_generated_at is null) then
    raise exception 'O PDF oficial do encaminhamento deve estar vinculado antes da etapa administrativa.' using errcode='22023';
  end if;

  v_previous_status:=v_referral.status;
  case v_action
    when 'start' then
      if v_referral.status<>'pending_approval' then raise exception 'Somente encaminhamento aguardando Administrativo pode ser iniciado.'; end if;
      v_new_status:='in_progress'; v_event_type:='admin_started';
    when 'complete' then
      if v_referral.status not in ('pending_approval','in_progress') then raise exception 'Este encaminhamento não pode ser concluído.'; end if;
      v_new_status:='completed'; v_event_type:='admin_completed';
    when 'cancel' then
      if v_referral.status not in ('pending_approval','in_progress') then raise exception 'Este encaminhamento não pode ser cancelado.'; end if;
      v_new_status:='cancelled'; v_event_type:='admin_cancelled';
  end case;

  update public.referrals r
  set status=v_new_status,
      response=coalesce(v_response,r.response),
      completed_at=case when v_new_status='completed' then now() else r.completed_at end,
      cancelled_at=case when v_new_status='cancelled' then now() else r.cancelled_at end,
      updated_at=now()
  where r.id=v_referral.id;

  insert into public.dentistry_referral_events(
    referral_id,event_type,previous_status,new_status,actor_account_id,detail
  ) values (
    v_referral.id,v_event_type,v_previous_status,v_new_status,v_account_id,v_response
  );

  return jsonb_build_object(
    'success',true,'referral_id',v_referral.id,'previous_status',v_previous_status,
    'status',v_new_status,'action',v_action,'updated_at',now()
  );
end;
$function$;

revoke all on function public.manage_dentistry_referral_for_interface(uuid,text,text) from public,anon;
grant execute on function public.manage_dentistry_referral_for_interface(uuid,text,text) to authenticated;
