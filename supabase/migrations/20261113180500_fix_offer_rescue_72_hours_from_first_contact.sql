-- CAPO: correção cirúrgica da contagem das 72 horas; mantém os contratos e restrições existentes.
-- Nenhum registro real é movido automaticamente; transferência somente por ação administrativa.
CREATE OR REPLACE FUNCTION public.register_offer_rescue_contact_for_interface(p_patient_id uuid, p_contact_method text, p_contact_result text, p_outcome text DEFAULT 'sem_resposta'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
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
   -- O prazo de 72 horas é contado desde o primeiro contato, não desde
   -- observações/retentativas subsequentes na mesma Oferta Inicial.
   select min(s.contact_date) into v_initial_contact
   from public.patient_active_searches s
   where s.patient_id=p_patient_id and s.search_type='initial';
   if v_initial_contact is null then
     raise exception 'Data inicial da Oferta CAPO não encontrada.' using errcode='22023'; end if;
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
$function$
;
