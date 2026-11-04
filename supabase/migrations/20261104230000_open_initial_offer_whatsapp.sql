-- CAPO: abertura idempotente da Oferta Inicial no WhatsApp; nao presume envio/aceite.
create or replace function public.open_initial_offer_whatsapp_for_interface(p_patient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null
     or not coalesce(public.has_accepted_current_legal_term(), false)
     or not exists (
       select 1 from public.user_accounts ua
       where ua.auth_user_id = auth.uid() and ua.is_active = true
     )
     or not (
       public.has_app_role('administrador')
       or public.has_app_role('administrativo_operacional')
     ) then
    raise exception 'Sem autorização administrativa para a Oferta CAPO.' using errcode = '42501';
  end if;

  perform 1 from public.patients p
  where p.id = p_patient_id
    and p.status = 'ativo'
    and coalesce(p.deceased,false) = false
    and public.capo_patient_visible_in_current_context(p.id)
  for update;
  if not found then
    raise exception 'Paciente indisponível no contexto atual.' using errcode = '22023';
  end if;

  -- Paciente com ciclo CAPO ativo/preexistente nao recebe Oferta Inicial.
  if exists (
    select 1 from public.patient_care_cycles c
    where c.patient_id = p_patient_id
  ) then
    raise exception 'Paciente com vínculo CAPO existente; não abrir Oferta Inicial.' using errcode = '22023';
  end if;

  select pas.id, pas.flow_status into v_id,v_status
  from public.patient_active_searches pas
  where pas.patient_id = p_patient_id and pas.search_type = 'initial'
  order by pas.contact_date desc, pas.created_at desc, pas.id desc
  limit 1;

  if v_id is not null then
    return jsonb_build_object('success',true,'created',false,'attempt_id',v_id,
      'flow_status',v_status,'message','Oferta Inicial já registrada; sem duplicidade.');
  end if;

  insert into public.patient_active_searches (
    patient_id,professional_id,search_type,contact_date,contact_method,
    contact_result,accepted_service,next_action,next_contact_at,flow_status,updated_at
  ) values (
    p_patient_id,public.capo_effective_professional_id(),'initial',v_now,'whatsapp',
    'WhatsApp aberto; envio não confirmado',null,
    'Conferir resposta do paciente e realizar novo contato após 72 horas.',
    v_now + interval '72 hours','ativo',v_now
  ) returning id into v_id;

  return jsonb_build_object('success',true,'created',true,'attempt_id',v_id,
    'flow_status','ativo','message','Oferta Inicial incluída na Busca Ativa.');
end;
$function$;

revoke all on function public.open_initial_offer_whatsapp_for_interface(uuid) from public, anon;
grant execute on function public.open_initial_offer_whatsapp_for_interface(uuid) to authenticated;