-- CAPO — tipo facultativo de veículo da solicitação de Transporte.
-- Não altera documentos PDF existentes nem cria nova versão em pedidos já documentados.
alter table public.transport_requests
  add column if not exists vehicle_type text;
alter table public.transport_requests
  drop constraint if exists transport_requests_vehicle_type_check;
alter table public.transport_requests
  add constraint transport_requests_vehicle_type_check
  check (vehicle_type is null or vehicle_type in ('carro','ambulancia'));

create or replace function public.set_transport_vehicle_type_for_interface(
  p_request_id uuid, p_vehicle_type text default null)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_request public.transport_requests%rowtype;
  v_user uuid;
  v_professional uuid;
  v_admin boolean;
  v_social boolean;
  v_type text;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Sessão válida e aceite do termo são necessários.' using errcode='42501';
  end if;
  select ua.id, public.capo_effective_professional_id() into v_user,v_professional
    from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_user is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
  select * into v_request from public.transport_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Solicitação não encontrada.'; end if;
  perform public.capo_assert_patient_write_context(v_request.patient_id);
  v_admin:= public.has_app_role('administrador') or public.has_app_role('administrativo_operacional');
  v_social:= v_professional is not null and public.has_app_role('profissional')
    and exists (
      select 1 from public.professionals pr
      join public.professional_specialties ps on ps.professional_id=pr.id
      join public.specialties sp on sp.id=ps.specialty_id
      where pr.id=v_professional and pr.status='ativo' and pr.is_professional=true
        and sp.is_active and lower(btrim(sp.name))=lower('Assistência Social')
    )
    and exists (select 1 from public.get_effective_professional_capabilities(v_professional) c
      where c.capability_code='preencher_solicitacao_transporte')
    and exists (select 1 from public.social_followup_cycles sfc
      where sfc.patient_id=v_request.patient_id and sfc.professional_id=v_professional
        and sfc.status='ativo');
  if not(v_admin or v_social) then
    raise exception 'Somente Gestor, Administrativo ou Assistência Social autorizada pode escolher o veículo.' using errcode='42501';
  end if;
  if v_request.status not in ('solicitado','confirmado')
     or v_request.request_pdf_path is not null
     or v_request.pdf_prepared_at is not null
     or v_request.external_forwarded_at is not null then
    raise exception 'O tipo de veículo só pode ser alterado antes da emissão do PDF oficial.' using errcode='22023';
  end if;
  v_type:=nullif(btrim(coalesce(p_vehicle_type,'')),'');
  if v_type is not null and v_type not in ('carro','ambulancia') then
    raise exception 'Selecione Carro ou Ambulância.' using errcode='22023';
  end if;
  update public.transport_requests
    set vehicle_type=v_type, updated_at=clock_timestamp() where id=p_request_id;
  return jsonb_build_object('success',true,'request_id',p_request_id,'vehicle_type',v_type);
end;
$function$;
revoke all on function public.set_transport_vehicle_type_for_interface(uuid,text) from public,anon;
grant execute on function public.set_transport_vehicle_type_for_interface(uuid,text) to authenticated;

-- Acrescenta o campo à resposta do contexto, preservando toda a lógica de autorização.
do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(p.oid) into v_definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='get_transport_context_for_interface'
     and pg_get_function_identity_arguments(p.oid)='p_patient_id uuid';
  if v_definition is null then
    raise exception 'RPC do contexto de Transporte não encontrada.';
  end if;
  if position('''vehicle_type'',tr.vehicle_type' in v_definition)=0 then
    if position('''boarding_source'',tr.boarding_source' in v_definition)=0 then
      raise exception 'Ponto de inserção de vehicle_type não encontrado; a função não foi modificada.';
    end if;
    v_definition:=replace(v_definition,'''boarding_source'',tr.boarding_source',
      '''boarding_source'',tr.boarding_source,''vehicle_type'',tr.vehicle_type');
    execute v_definition;
  end if;
end;
$migration$;
