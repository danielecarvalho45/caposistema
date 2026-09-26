create or replace function public.get_family_psychology_request_context_for_interface(
  p_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_request record;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  if not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
    or public.has_app_role('coordenador')
  ) then raise exception 'Perfil sem autorização para consultar o contexto da fila familiar.' using errcode='42501'; end if;

  select ar.id,ar.patient_id,ar.source_family_link_id,ar.subject,ar.status
    into v_request
  from public.administrative_requests ar
  where ar.id=p_request_id
    and (ar.patient_id is null or public.capo_patient_visible_in_current_context(ar.patient_id))
  limit 1;

  if v_request.id is null then raise exception 'Solicitação não encontrada ou fora do escopo.' using errcode='42501'; end if;

  if v_request.source_family_link_id is null then
    return jsonb_build_object('request_id',v_request.id,'is_family_psychology_request',false);
  end if;

  select jsonb_build_object(
    'request_id',v_request.id,
    'is_family_psychology_request',true,
    'family_link_id',pfl.id,
    'family_member_id',fm.id,
    'family_name',fm.full_name,
    'family_phone',fm.phone,
    'source_patient_id',p.id,
    'source_patient_name',p.full_name,
    'relationship',pfl.relationship,
    'psychological_interest',pfl.psychological_interest,
    'request_status',v_request.status,
    'active_waiting_list_id',(
      select q.id from public.family_psychology_waiting_list q
      where q.family_link_id=pfl.id and q.status in ('waiting','paused','called')
      order by q.entered_at desc limit 1
    )
  ) into v_result
  from public.patient_family_links pfl
  join public.family_members fm on fm.id=pfl.family_member_id
  join public.patients p on p.id=pfl.patient_id
  where pfl.id=v_request.source_family_link_id;

  if v_result is null then raise exception 'Vínculo familiar da solicitação não encontrado.' using errcode='22023'; end if;
  return v_result;
end;
$function$;

revoke all on function public.get_family_psychology_request_context_for_interface(uuid) from public,anon;
grant execute on function public.get_family_psychology_request_context_for_interface(uuid) to authenticated;
