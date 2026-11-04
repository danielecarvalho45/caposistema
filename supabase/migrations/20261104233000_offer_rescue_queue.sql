-- CAPO Busca Ativa: fila de Resgate da Oferta, isolada de Faltosos e Perda de Seguimento.
alter table public.patient_active_searches drop constraint if exists patient_active_searches_type_check;
alter table public.patient_active_searches add constraint patient_active_searches_type_check
  check (search_type in ('initial','offer_rescue','no_show','follow_up','reopening'));
create index if not exists patient_active_searches_offer_rescue_idx
  on public.patient_active_searches (flow_status,next_contact_at,contact_date desc)
  where search_type='offer_rescue';

create or replace function public.get_offer_rescue_searches_for_interface(
  p_flow_status text default 'ativo',p_limit integer default 50,p_offset integer default 0
) returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare v_items jsonb; v_total integer;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not exists(select 1 from public.user_accounts u where u.auth_user_id=auth.uid() and u.is_active=true)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador'))
  then raise exception 'Sem autorização para consultar Resgate da Oferta.' using errcode='42501'; end if;
  if p_flow_status is not null and p_flow_status not in ('ativo','encerrado') then
    raise exception 'Situação inválida.' using errcode='22023'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 or p_offset is null or p_offset<0 then
    raise exception 'Paginação inválida.' using errcode='22023'; end if;
  with latest as (
    select distinct on (s.patient_id) s.*
    from public.patient_active_searches s
    where s.search_type='offer_rescue' and public.capo_patient_visible_in_current_context(s.patient_id)
    order by s.patient_id,s.contact_date desc,s.created_at desc,s.id desc
  ) select count(*) into v_total from latest where p_flow_status is null or flow_status=p_flow_status;
  with latest as (
    select distinct on (s.patient_id) s.*
    from public.patient_active_searches s
    where s.search_type='offer_rescue' and public.capo_patient_visible_in_current_context(s.patient_id)
    order by s.patient_id,s.contact_date desc,s.created_at desc,s.id desc
  ), paged as (
    select l.* from latest l where p_flow_status is null or l.flow_status=p_flow_status
    order by l.next_contact_at nulls last,l.contact_date desc limit p_limit offset p_offset
  ) select coalesce(jsonb_agg(jsonb_build_object(
      'patient_id',p.id,'patient_name',p.full_name,'patient_number',p.patient_number,'cms',p.cms,
      'phone',p.phone,'latest_attempt_id',s.id,'flow_status',s.flow_status,
      'contact_date',s.contact_date,'contact_method',s.contact_method,
      'contact_result',s.contact_result,'accepted_service',s.accepted_service,
      'next_contact_at',s.next_contact_at,'next_action',s.next_action,'notes',s.notes,
      'history',(select coalesce(jsonb_agg(jsonb_build_object(
          'contact_date',h.contact_date,'contact_result',h.contact_result,'contact_method',h.contact_method,
          'next_contact_at',h.next_contact_at,'flow_status',h.flow_status,'notes',h.notes
        ) order by h.contact_date desc),'[]'::jsonb)
        from public.patient_active_searches h where h.patient_id=s.patient_id and h.search_type='offer_rescue')
    ) order by s.next_contact_at nulls last,s.contact_date desc),'[]'::jsonb)
    into v_items from paged s join public.patients p on p.id=s.patient_id;
  return jsonb_build_object('items',v_items,'total_count',v_total,'flow_status',p_flow_status,
    'limit',p_limit,'offset',p_offset);
end;
$function$;

create or replace function public.register_offer_rescue_contact_for_interface(
 p_patient_id uuid,p_contact_method text,p_contact_result text,p_outcome text default 'sem_resposta'
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
 v_now timestamptz:=clock_timestamp();
 v_account uuid;
 v_initial_id uuid;
 v_initial_status text;
 v_initial_contact timestamptz;
 v_rescue_status text;
 v_last_contact timestamptz;
 v_attempt uuid;
 v_cycle uuid;
 v_cycle_number integer;
 v_closing boolean;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
 then raise exception 'Sem autorização para registrar contato.' using errcode='42501'; end if;
 select u.id into v_account from public.user_accounts u
  where u.auth_user_id=auth.uid() and u.is_active=true limit 1;
 if v_account is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
 if p_contact_method not in ('whatsapp','phone','in_person','other')
    or length(btrim(coalesce(p_contact_result,'')))<2
    or length(btrim(p_contact_result))>500
    or p_outcome not in ('sem_resposta','aceitou','recusou')
 then raise exception 'Dados do contato inválidos.' using errcode='22023'; end if;

 perform 1 from public.patients p where p.id=p_patient_id and p.status='ativo'
   and coalesce(p.deceased,false)=false
   and public.capo_patient_visible_in_current_context(p.id) for update;
 if not found then raise exception 'Paciente indisponível.' using errcode='22023'; end if;

 select s.id,s.flow_status,s.contact_date into v_initial_id,v_initial_status,v_initial_contact
 from public.patient_active_searches s where s.patient_id=p_patient_id and s.search_type='initial'
 order by s.contact_date desc,s.created_at desc,s.id desc limit 1;
 if v_initial_id is null then raise exception 'Oferta Inicial não registrada.' using errcode='22023'; end if;

 select s.flow_status,s.contact_date into v_rescue_status,v_last_contact
 from public.patient_active_searches s where s.patient_id=p_patient_id and s.search_type='offer_rescue'
 order by s.contact_date desc,s.created_at desc,s.id desc limit 1;

 if v_rescue_status='encerrado' then
   raise exception 'Resgate já encerrado.' using errcode='22023'; end if;
 if v_rescue_status is null then
   if v_initial_status<>'ativo' then
     raise exception 'Oferta Inicial encerrada; não é possível iniciar Resgate.' using errcode='22023'; end if;
   if v_now<v_initial_contact+interval '72 hours' then
     raise exception 'Segundo contato disponível somente após 72 horas da Oferta Inicial.' using errcode='22023'; end if;
 else
   if v_last_contact+interval '15 days'>v_now then
     raise exception 'Próxima tentativa permitida após 15 dias do último contato.' using errcode='22023'; end if;
 end if;

 v_closing:=p_outcome in ('aceitou','recusou');
 if p_outcome='aceitou' then
   select c.id into v_cycle from public.patient_care_cycles c
     where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
     order by c.cycle_number desc limit 1;
   if v_cycle is null and exists (select 1 from public.patient_care_cycles c where c.patient_id=p_patient_id) then
     raise exception 'Paciente com histórico CAPO; utilizar fluxo de retorno.' using errcode='22023'; end if;
 end if;

 if v_rescue_status is null then
   update public.patient_active_searches set flow_status='encerrado',next_contact_at=null,
     closed_at=v_now,closed_by=v_account,closure_reason='Transferência para Resgate da Oferta após segundo contato.',
     updated_at=v_now where id=v_initial_id;
 end if;
 insert into public.patient_active_searches(
   patient_id,professional_id,search_type,contact_date,contact_method,contact_result,
   accepted_service,next_action,next_contact_at,flow_status,closed_at,closed_by,closure_reason,updated_at
 ) values (
   p_patient_id,public.capo_effective_professional_id(),'offer_rescue',v_now,
   p_contact_method,btrim(p_contact_result),
   case when p_outcome='aceitou' then true when p_outcome='recusou' then false else null end,
   case when v_closing then null else 'Nova tentativa administrativa em 15 dias.' end,
   case when v_closing then null else v_now+interval '15 days' end,
   case when v_closing then 'encerrado' else 'ativo' end,
   case when v_closing then v_now else null end,
   case when v_closing then v_account else null end,
   case when p_outcome='aceitou' then 'Aceite registrado pelo administrativo no Resgate da Oferta.'
        when p_outcome='recusou' then 'Recusa registrada pelo administrativo no Resgate da Oferta.'
        else null end,
   v_now
 ) returning id into v_attempt;

 if p_outcome='aceitou' and v_cycle is null then
   select coalesce(max(c.cycle_number),0)+1 into v_cycle_number
   from public.patient_care_cycles c where c.patient_id=p_patient_id;
   insert into public.patient_care_cycles(
     patient_id,cycle_number,status,opened_at,opened_by,opening_type,opening_active_search_id,opening_reason
   ) values(p_patient_id,v_cycle_number,'ativo',v_now,v_account,
     'initial_acceptance',v_attempt,'Aceite humano registrado no Resgate da Oferta CAPO.')
   returning id into v_cycle;
 end if;
 return jsonb_build_object('success',true,'attempt_id',v_attempt,'flow_status',
   case when v_closing then 'encerrado' else 'ativo' end,
   'care_cycle_id',v_cycle,'message','Contato de Resgate registrado pelo administrativo.');
end;
$function$;
revoke all on function public.get_offer_rescue_searches_for_interface(text,integer,integer) from public,anon;
revoke all on function public.register_offer_rescue_contact_for_interface(uuid,text,text,text) from public,anon;
grant execute on function public.get_offer_rescue_searches_for_interface(text,integer,integer) to authenticated;
grant execute on function public.register_offer_rescue_contact_for_interface(uuid,text,text,text) to authenticated;