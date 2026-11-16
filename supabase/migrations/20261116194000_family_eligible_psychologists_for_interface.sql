-- CAPO Familiar/Cuidador: lista prévia de psicólogos elegíveis pela origem.
-- Não altera o contrato de agendamento nem o histórico existentes.
create or replace function public.get_family_eligible_psychologists_for_interface(p_waiting_list_id uuid)
returns table(professional_id uuid)
language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $fn$
declare v_family_link uuid; v_patient uuid; v_ineligible uuid;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
    raise exception 'Sem autorização para consultar profissionais do familiar.' using errcode='42501';
  end if;
  select q.family_link_id,q.source_patient_id into v_family_link,v_patient
  from public.family_psychology_waiting_list q
  where q.id=p_waiting_list_id and q.status in ('waiting','called');
  if v_family_link is null or not public.capo_patient_visible_in_current_context(v_patient) then
    raise exception 'Familiar indisponível no contexto autorizado.' using errcode='42501';
  end if;
  v_ineligible:=public.capo_family_psychology_ineligible_professional(v_family_link);
  return query select distinct pr.id
    from public.professionals pr
    join public.professional_specialties ps on ps.professional_id=pr.id
    join public.specialties s on s.id=ps.specialty_id
    where pr.status='ativo' and pr.is_professional=true and s.is_active=true
      and lower(btrim(s.name))='psicologia'
      and pr.id is distinct from v_ineligible
    order by pr.id;
end;
$fn$;
revoke all on function public.get_family_eligible_psychologists_for_interface(uuid) from public,anon;
grant execute on function public.get_family_eligible_psychologists_for_interface(uuid) to authenticated;
