-- Busca do paciente na fila de Transporte sem diferenciação de acentos ou caixa.
CREATE OR REPLACE FUNCTION public.get_transport_worklist_for_interface(p_view text DEFAULT 'recebidas'::text, p_query text DEFAULT ''::text, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
 or not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true)
 or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Acesso não autorizado ao acompanhamento administrativo.' using errcode='42501';
 end if;
 if p_view not in ('recebidas','concluidas','acompanhamento') then raise exception 'Consulta de transporte inválida.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.requested_at desc,q.request_id desc),'[]'::jsonb) into v_result
 from (
  select tr.id as request_id,tr.protocol,tr.patient_id,pt.full_name as patient_name,pt.patient_number,
     pt.cms,tr.status,tr.transport_notes,tr.requested_at,tr.completed_at,tr.cancelled_at,tr.closure_reason,
     tr.cancellation_reason,tr.vehicle_type,tr.periodicity,tr.external_channel,tr.external_forwarded_at,
     tr.need_cycle_id,coalesce(pr.full_name,ua.username) as requester_name,
     exists(select 1 from public.professional_specialties ps
       join public.specialties sp on sp.id=ps.specialty_id
       where ps.professional_id=ua.professional_id and sp.is_active
         and lower(btrim(sp.name))=lower('Assistência Social')) as from_social
  from public.transport_requests tr
  join public.patients pt on pt.id=tr.patient_id
  join public.user_accounts ua on ua.id=tr.requested_by
  left join public.professionals pr on pr.id=ua.professional_id
  where public.capo_patient_visible_in_current_context(tr.patient_id)
    and ((p_view='recebidas' and tr.status in ('solicitado','confirmado') and exists(
       select 1 from public.professional_specialties ps
       join public.specialties sp on sp.id=ps.specialty_id
       where ps.professional_id=ua.professional_id and sp.is_active
         and lower(btrim(sp.name))=lower('Assistência Social')))
      or (p_view='concluidas' and tr.status in ('realizado','cancelado'))
      or (p_view='acompanhamento'))
    and (btrim(coalesce(p_query,''))='' or translate(lower(pt.full_name),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') like '%'||translate(lower(btrim(p_query)),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')||'%'
      or pt.patient_number ilike '%'||btrim(p_query)||'%'
      or tr.protocol ilike '%'||btrim(p_query)||'%')
  order by tr.requested_at desc,tr.id desc
  limit least(greatest(coalesce(p_limit,100),1),100)
 ) q;
 return v_result;
end $function$
;
