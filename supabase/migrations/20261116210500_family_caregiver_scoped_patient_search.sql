-- CAPO: pesquisa de Familiar/Cuidador na busca geral, preservando identidade e vínculo.
create or replace function public.search_family_caregivers_in_patient_search_for_interface(p_query text,p_limit integer default 20)
returns table(family_member_id uuid,full_name text,capo_number text,cms text,source_patient_id uuid,source_patient_name text)
language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
 v_query text:=btrim(coalesce(p_query,''));
 v_professional_id uuid;
 v_general boolean;
 v_professional boolean;
begin
 if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
 if not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true)
 then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
 if length(v_query)<2 and v_query !~ '^[0-9]$' then raise exception 'Informe ao menos dois caracteres ou Nº CAPO exato.' using errcode='22023'; end if;
 v_general:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador');
 v_professional:=public.has_app_role('profissional');
 if not(v_general or v_professional) then raise exception 'Perfil sem autorização para pesquisar.' using errcode='42501'; end if;
 if v_professional and not v_general then v_professional_id:=public.capo_effective_professional_id(); end if;
 return query
 select fm.id,fm.full_name,fm.capo_number,fm.cms,pfl.patient_id,p.full_name
 from public.patient_family_links pfl
 join public.family_members fm on fm.id=pfl.family_member_id
 join public.patients p on p.id=pfl.patient_id
 where pfl.unlinked_at is null
 and public.capo_family_member_visible_in_current_context(fm.id)
 and public.capo_patient_visible_in_current_context(p.id)
 and (
  lower(coalesce(fm.capo_number,''))=lower(v_query)
  or (length(v_query)>=2 and lower(coalesce(fm.cms,''))=lower(v_query))
  or (length(v_query)>=3 and public.capo_name_matches_terms(fm.full_name,v_query))
 )
 and (v_general or (v_professional_id is not null and (
  exists(select 1 from public.social_followup_cycles sfc
    where sfc.patient_id=pfl.patient_id and sfc.professional_id=v_professional_id and sfc.status='ativo')
  or exists(select 1 from public.family_psychology_appointments fpa
    where fpa.family_member_id=fm.id and fpa.professional_id=v_professional_id)
 )))
 order by fm.full_name,fm.id
 limit least(greatest(coalesce(p_limit,20),1),20);
end;
$function$;
revoke all on function public.search_family_caregivers_in_patient_search_for_interface(text,integer) from public,anon;
grant execute on function public.search_family_caregivers_in_patient_search_for_interface(text,integer) to authenticated;
