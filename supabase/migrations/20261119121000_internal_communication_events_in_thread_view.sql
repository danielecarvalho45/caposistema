-- Historico de mudanças de status visível apenas aos dois participantes.
CREATE OR REPLACE FUNCTION public.get_internal_communications_for_interface(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_actor record;
begin
 select * into v_actor from public.capo_internal_current_actor();
 return coalesce((
  select jsonb_agg(jsonb_build_object(
    'id',x.id,'kind',x.kind,'subject',x.subject,'body',x.body,'patient_id',x.patient_id,
    'patient_name',case when x.patient_id is not null and public.capo_patient_visible_in_current_context(x.patient_id) then pt.full_name else null end,
    'status',x.status,'sender_id',x.sender_account_id,'recipient_id',x.recipient_account_id,
    'sender_name',coalesce(ps.full_name,us.username),'recipient_name',coalesce(pr.full_name,ur.username),
    'created_at',x.created_at,'updated_at',x.updated_at,
    'recipient_read_at',x.recipient_read_at,
    'unread',case when x.sender_account_id=v_actor.account_id then x.sender_read_at is null else x.recipient_read_at is null end,
    'events',coalesce((
      select jsonb_agg(jsonb_build_object('id',e.id,'event_type',e.event_type,
        'actor_id',e.actor_account_id,'from_status',e.from_status,
        'to_status',e.to_status,'created_at',e.created_at) order by e.created_at,e.id)
      from public.capo_internal_communication_events e where e.communication_id=x.id
    ),'[]'::jsonb),
    'messages',coalesce((
      select jsonb_agg(jsonb_build_object('id',m.id,'author_id',m.author_account_id,'body',m.body,'created_at',m.created_at) order by m.created_at,m.id)
      from public.capo_internal_communication_messages m where m.communication_id=x.id
    ),'[]'::jsonb)
  ) order by x.updated_at desc)
  from (select * from public.capo_internal_communications c
    where c.sender_account_id=v_actor.account_id or c.recipient_account_id=v_actor.account_id
    order by c.updated_at desc limit least(greatest(coalesce(p_limit,100),1),200)) x
  join public.user_accounts us on us.id=x.sender_account_id
  join public.user_accounts ur on ur.id=x.recipient_account_id
  left join public.professionals ps on ps.id=us.professional_id
  left join public.professionals pr on pr.id=ur.professional_id
  left join public.patients pt on pt.id=x.patient_id
 ),'[]'::jsonb);
end $function$;
