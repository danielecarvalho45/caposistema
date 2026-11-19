-- Recebimento e feedback isolados de Solicitações.
CREATE OR REPLACE FUNCTION public.create_internal_communication_for_interface(p_recipient_ids uuid[], p_kind text, p_subject text, p_body text, p_patient_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_actor record;v_id uuid;v_target uuid;v_count int:=0;v_test boolean;
begin
 select * into v_actor from public.capo_internal_current_actor();
 if p_kind not in ('recado','demanda_administrativa') then raise exception 'Tipo de mensagem inválido.'; end if;
 if p_kind='demanda_administrativa' and not v_actor.administrative then
   raise exception 'Somente o Administrativo pode criar demandas oficiais.' using errcode='42501'; end if;
 if char_length(btrim(coalesce(p_subject,''))) not between 3 and 150
    or char_length(btrim(coalesce(p_body,''))) not between 3 and 2000
   then raise exception 'Assunto ou mensagem fora do tamanho permitido.'; end if;
 if coalesce(array_length(p_recipient_ids,1),0) not between 1 and 30 then
   raise exception 'Selecione de 1 a 30 destinatários.'; end if;
 if p_patient_id is not null and not public.capo_patient_visible_in_current_context(p_patient_id)
   then raise exception 'Paciente fora do contexto autorizado.' using errcode='42501'; end if;
 for v_target in select distinct unnest(p_recipient_ids) loop
   if v_target=v_actor.account_id then raise exception 'Não é permitido enviar para si.'; end if;
   if not exists(
     select 1 from public.user_accounts ua
     left join public.professionals p on p.id=ua.professional_id
     where ua.id=v_target and ua.is_active=true and ua.auth_user_id is not null
       and coalesce(ua.is_homologation_account,false)=v_actor.homologation
       and (p.id is null or p.status='ativo')
       and exists(
         select 1 from public.user_roles u join public.app_roles a on a.id=u.role_id
         where u.user_account_id=ua.id and a.code in ('administrador','administrativo_operacional','profissional') and a.is_active=true
       )
   ) then raise exception 'Destinatário não autorizado ou fora do ambiente.' using errcode='42501'; end if;
   if p_kind='demanda_administrativa' and not exists(
     select 1 from public.user_accounts ua join public.professionals p on p.id=ua.professional_id
     where ua.id=v_target and p.status='ativo' and p.is_professional=true
       and (
         exists(select 1 from public.user_roles u join public.app_roles ar on ar.id=u.role_id
           where u.user_account_id=ua.id and ar.code='profissional' and ar.is_active=true)
         or (v_actor.homologation and exists(
           select 1 from public.homologation_contexts hc join public.app_roles ar on ar.id=hc.simulated_role_id
           where hc.actor_account_id=ua.id and hc.is_enabled=true and ar.code='profissional'))
       )
   ) then raise exception 'Demanda administrativa exige profissional assistencial ativo.' using errcode='42501'; end if;
   insert into public.capo_internal_communications(
     sender_account_id,recipient_account_id,kind,subject,body,patient_id
   ) values (v_actor.account_id,v_target,p_kind,btrim(p_subject),btrim(p_body),p_patient_id)
   returning id into v_id;
   insert into public.capo_internal_communication_messages(communication_id,author_account_id,body)
   values(v_id,v_actor.account_id,btrim(p_body));
   v_count:=v_count+1;
 end loop;
 return jsonb_build_object('success',true,'created',v_count);
end $function$;

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
     status=case when kind='demanda_administrativa' and status<>'concluida' then 'respondida' else status end,
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
