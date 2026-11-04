-- CAPO: estado da Oferta Inicial por paciente; consulta administrativa individual.
create or replace function public.patient_initial_offer_available_for_interface(p_patient_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
begin
  perform public.capo_assert_patient_read_context(p_patient_id);
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode = '42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode = '42501';
  end if;
  if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Usuário sem permissão para consultar a Oferta Inicial.' using errcode = '42501';
  end if;
  return not exists (
    select 1 from public.patient_care_cycles c
    where c.patient_id = p_patient_id
  ) and not exists (
    select 1 from public.patient_active_searches s
    where s.patient_id = p_patient_id
      and s.search_type = 'initial'
      and s.flow_status = 'encerrado'
  );
end;
$function$;
revoke all on function public.patient_initial_offer_available_for_interface(uuid) from public, anon;
grant execute on function public.patient_initial_offer_available_for_interface(uuid) to authenticated;
