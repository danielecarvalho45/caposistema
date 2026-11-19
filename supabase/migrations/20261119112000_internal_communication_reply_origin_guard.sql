-- Somente a resposta efetiva do profissional destinatário libera a conclusão administrativa.
CREATE OR REPLACE FUNCTION public.update_internal_communication_for_interface(p_communication_id uuid, p_action text, p_body text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_actor record;v_item public.capo_internal_communications%rowtype;
begin
 select * into v_actor from public.capo_internal_current_actor();
 select * into v_item from public.capo_internal_communications where id=p_communication_id for update;
 if not found or v_actor.account_id not in (v_item.sender_account_id,v_item.recipient_account_id) then
   raise exception 'Comunicação não encontrada para sua conta.' using errcode='42501'; end if;
 if p_action='ler' then
   if v_actor.account_id=v_item.sender_account_id then
     update public.capo_internal_communications set sender_read_at=now() where id=p_communication_id;
   else
     update public.capo_internal_communications set recipient_read_at=now() where id=p_communication_id;
   end if;
 elsif p_action='responder' then
   if char_length(btrim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Resposta inválida.'; end if;
   insert into public.capo_internal_communication_messages(communication_id,author_account_id,body)
   values(p_communication_id,v_actor.account_id,btrim(p_body));
   update public.capo_internal_communications set
     status=case when kind='demanda_administrativa' and status<>'concluida' and recipient_account_id=v_actor.account_id then 'respondida' else status end,
     sender_read_at=case when sender_account_id=v_actor.account_id then now() else null end,
     recipient_read_at=case when recipient_account_id=v_actor.account_id then now() else null end,
     updated_at=now()
   where id=p_communication_id;
 elsif p_action='iniciar' then
   if v_item.kind<>'demanda_administrativa' or v_actor.account_id<>v_item.recipient_account_id or v_item.status<>'pendente'
     then raise exception 'Somente o profissional destinatário pode iniciar uma demanda pendente.' using errcode='42501'; end if;
   update public.capo_internal_communications set status='em_andamento',updated_at=now(),
     sender_read_at=null,recipient_read_at=now() where id=p_communication_id;
 elsif p_action='concluir' then
   if v_item.kind<>'demanda_administrativa' or not v_actor.administrative or
      v_actor.account_id<>v_item.sender_account_id or v_item.status<>'respondida'
     then raise exception 'Somente o Administrativo pode concluir após receber o feedback do destinatário.' using errcode='42501'; end if;
   update public.capo_internal_communications set status='concluida',completed_at=now(),updated_at=now(),
     sender_read_at=now(),recipient_read_at=null where id=p_communication_id;
 else raise exception 'Ação de comunicação inválida.'; end if;
 return jsonb_build_object('success',true);
end $function$;
