-- CAPO: segundo contato sem adesão transfere ao Resgate; sem alteração retroativa de pacientes.
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

 -- A recusa no segundo contato (entrada no Resgate) não encerra o Resgate.
 -- Recusa expressa posterior, já no Resgate, conserva a regra anterior.
 v_closing:=p_outcome='aceitou' or (p_outcome='recusou' and v_rescue_status is not null);
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
     updated_at=v_now where patient_id=p_patient_id and search_type='initial' and flow_status='ativo';
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
        when p_outcome='recusou' and v_closing then 'Recusa registrada pelo administrativo no Resgate da Oferta.'
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
   'care_cycle_id',v_cycle,'transferred_to_rescue',v_rescue_status is null and not v_closing,
   'next_contact_at',case when v_closing then null else v_now+interval '15 days' end,
   'message','Contato de Resgate registrado pelo administrativo.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_initial_active_search_attempt_for_interface(p_patient_id uuid, p_contact_method text, p_contact_result text, p_accepted_service boolean DEFAULT NULL::boolean, p_next_action text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_next_contact_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_close_flow boolean DEFAULT false, p_closure_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_latest_status text;
  v_first_contact timestamptz;
  v_transfer jsonb;
  v_id uuid;
  v_now timestamptz := clock_timestamp();
  v_open_cycle_id uuid;
  v_cycle_number integer;
  v_cycle_created boolean := false;
  v_has_cycle_history boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta inativa ou não vinculada.' using errcode='42501';
  end if;

  if not (
    public.has_app_role('administrador')
    or public.has_app_role('administrativo_operacional')
  ) then
    raise exception 'Perfil sem autorização para Oferta Inicial/Busca Ativa Inicial.' using errcode='42501';
  end if;

  perform 1
  from public.patients p
  where p.id=p_patient_id
    and p.status='ativo'
    and coalesce(p.deceased,false)=false
    and public.capo_patient_visible_in_current_context(p.id)
  for update;

  if not found then
    raise exception 'Paciente não localizado, inativo ou com óbito registrado.' using errcode='22023';
  end if;

  if p_contact_method not in ('phone','whatsapp','in_person','other') then
    raise exception 'Meio de contato inválido.' using errcode='22023';
  end if;

  if length(btrim(coalesce(p_contact_result,'')))<2
     or length(btrim(p_contact_result))>500 then
    raise exception 'O resultado do contato deve possuir entre 2 e 500 caracteres.' using errcode='22023';
  end if;

  if length(coalesce(p_next_action,''))>500 then
    raise exception 'A próxima ação deve possuir no máximo 500 caracteres.' using errcode='22023';
  end if;

  if length(coalesce(p_notes,''))>1000 then
    raise exception 'A observação deve possuir no máximo 1000 caracteres.' using errcode='22023';
  end if;

  if p_next_contact_at is not null and p_next_contact_at<=v_now then
    raise exception 'O próximo contato deve estar no futuro.' using errcode='22023';
  end if;

  if p_close_flow and length(btrim(coalesce(p_closure_reason,'')))<5 then
    raise exception 'Informe o motivo do encerramento com pelo menos 5 caracteres.' using errcode='22023';
  end if;

  select pas.flow_status
    into v_latest_status
  from public.patient_active_searches pas
  where pas.patient_id=p_patient_id
    and pas.search_type='initial'
  order by pas.contact_date desc,pas.created_at desc,pas.id desc
  limit 1;

  if v_latest_status='encerrado' then
    raise exception 'A Busca Ativa Inicial deste paciente já está encerrada.' using errcode='22023';
  end if;

  -- Abertura de WhatsApp não equivale a envio ou recusa. O prazo é ancorado
  -- no primeiro registro de Oferta, como no fluxo existente de segundo contato.
  select min(s.contact_date) into v_first_contact
  from public.patient_active_searches s
  where s.patient_id=p_patient_id and s.search_type='initial';

  if p_accepted_service is distinct from true
     and btrim(p_contact_result) in ('Recusou a Oferta CAPO','Sem resposta / contato não conseguido','Novo contato necessário')
     and v_first_contact is not null then
    if v_now >= v_first_contact + interval '72 hours' then
      v_transfer := public.register_offer_rescue_contact_for_interface(
        p_patient_id,p_contact_method,btrim(p_contact_result),
        case when p_accepted_service is false then 'recusou' else 'sem_resposta' end
      );
      -- Preserva a observação separada, sem concatenar/truncar os 1000 caracteres.
      update public.patient_active_searches
      set notes=nullif(btrim(coalesce(p_notes,'')),'')
      where id=(v_transfer->>'attempt_id')::uuid and patient_id=p_patient_id
        and search_type='offer_rescue';
      return v_transfer;
    else
      -- Primeira recusa não encerra a oferta; aguarda o único segundo contato.
      p_close_flow := false;
      p_closure_reason := null;
      p_next_action := 'Realizar segundo contato administrativo após 72 horas da Oferta Inicial.';
      p_next_contact_at := v_first_contact + interval '72 hours';
    end if;
  end if;

  select c.id
    into v_open_cycle_id
  from public.patient_care_cycles c
  where c.patient_id=p_patient_id
    and c.status in ('ativo','encerramento_em_andamento')
  order by c.cycle_number desc
  limit 1
  for update;

  select exists(
    select 1
    from public.patient_care_cycles c
    where c.patient_id=p_patient_id
  ) into v_has_cycle_history;

  if coalesce(p_accepted_service,false)
     and v_open_cycle_id is null
     and v_has_cycle_history then
    raise exception 'Paciente já possui histórico de ciclo CAPO; novo ingresso deve usar o fluxo de retorno.' using errcode='22023';
  end if;

  insert into public.patient_active_searches(
    patient_id,
    professional_id,
    search_type,
    contact_date,
    contact_method,
    contact_result,
    accepted_service,
    next_action,
    notes,
    flow_status,
    next_contact_at,
    closed_at,
    closed_by,
    closure_reason,
    updated_at
  ) values (
    p_patient_id,
    v_professional_id,
    'initial',
    v_now,
    p_contact_method,
    btrim(p_contact_result),
    p_accepted_service,
    nullif(btrim(coalesce(p_next_action,'')),''),
    nullif(btrim(coalesce(p_notes,'')),''),
    case when p_close_flow then 'encerrado' else 'ativo' end,
    case when p_close_flow then null else p_next_contact_at end,
    case when p_close_flow then v_now else null end,
    case when p_close_flow then v_account_id else null end,
    case when p_close_flow then btrim(p_closure_reason) else null end,
    v_now
  )
  returning id into v_id;

  if coalesce(p_accepted_service,false) and v_open_cycle_id is null then
    select coalesce(max(c.cycle_number),0)+1
      into v_cycle_number
    from public.patient_care_cycles c
    where c.patient_id=p_patient_id;

    insert into public.patient_care_cycles(
      patient_id,
      cycle_number,
      status,
      opened_at,
      opened_by,
      opening_type,
      opening_active_search_id,
      opening_reason
    ) values (
      p_patient_id,
      v_cycle_number,
      'ativo',
      v_now,
      v_account_id,
      'initial_acceptance',
      v_id,
      'Adesão efetiva ao CAPO registrada na Oferta Inicial/Busca Ativa Inicial.'
    )
    returning id into v_open_cycle_id;

    v_cycle_created := true;
  end if;

  return jsonb_build_object(
    'success',true,
    'attempt_id',v_id,
    'patient_id',p_patient_id,
    'flow_status',case when p_close_flow then 'encerrado' else 'ativo' end,
    'next_contact_at',case when p_close_flow then null else p_next_contact_at end,
    'closed_at',case when p_close_flow then v_now else null end,
    'care_cycle_id',case when coalesce(p_accepted_service,false) then v_open_cycle_id else null end,
    'cycle_created',v_cycle_created,
    'message',case
      when p_close_flow then 'Tentativa registrada e fluxo inicial encerrado.'
      else 'Tentativa registrada com sucesso.'
    end
  );
end;
$function$;
