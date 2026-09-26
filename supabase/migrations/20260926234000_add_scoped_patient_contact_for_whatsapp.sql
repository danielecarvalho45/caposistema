create or replace function public.get_patient_contact_for_interface(p_patient_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  perform public.capo_assert_patient_read_context(p_patient_id);
  select jsonb_build_object('patient_id',p.id,'full_name',p.full_name,'phone',p.phone)
  into v_result
  from public.patients p
  where p.id=p_patient_id and p.status='ativo' and not coalesce(p.deceased,false);
  if v_result is null then raise exception 'Paciente não localizado, inativo ou com óbito registrado.' using errcode='22023'; end if;
  return v_result;
end;
$function$;
revoke all on function public.get_patient_contact_for_interface(uuid) from public,anon;
grant execute on function public.get_patient_contact_for_interface(uuid) to authenticated;
