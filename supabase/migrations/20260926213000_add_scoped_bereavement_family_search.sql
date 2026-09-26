create or replace function public.search_bereavement_family_members_for_interface(
  p_query text,
  p_limit integer default 20
)
returns table(
  family_member_id uuid,
  full_name text,
  source_patient_id uuid,
  source_patient_name text,
  relationship text,
  bereavement_active boolean
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_admin boolean := false;
  v_social boolean := false;
  v_q text := btrim(coalesce(p_query,''));
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'É necessário aceitar o termo vigente.' using errcode='42501'; end if;
  if char_length(v_q)<2 then raise exception 'Informe ao menos 2 caracteres para pesquisar familiar.' using errcode='22023'; end if;

  select public.capo_effective_professional_id() into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  v_admin := public.has_app_role('administrador');

  if v_professional_id is not null and public.has_app_role('profissional') then
    select exists(
      select 1
      from public.professional_specialties ps
      join public.specialties s on s.id=ps.specialty_id
      join public.professionals pr on pr.id=ps.professional_id
      where ps.professional_id=v_professional_id
        and pr.status='ativo'
        and pr.is_professional=true
        and s.is_active=true
        and lower(btrim(s.name))=lower('Assistência Social')
    ) into v_social;
  end if;

  if not (v_admin or v_social) then
    raise exception 'Somente Assistência Social autorizada ou Administrador pode pesquisar familiares para o fluxo de luto.' using errcode='42501';
  end if;

  return query
  select distinct on (fm.id,p.id)
    fm.id,
    fm.full_name,
    p.id,
    p.full_name,
    pfl.relationship,
    coalesce(fm.bereavement_active,false)
  from public.family_members fm
  join public.patient_family_links pfl on pfl.family_member_id=fm.id
  join public.patients p on p.id=pfl.patient_id
  where coalesce(p.deceased,false)=true
    and public.capo_patient_visible_in_current_context(p.id)
    and (
      fm.full_name ilike '%'||v_q||'%'
      or p.full_name ilike '%'||v_q||'%'
      or coalesce(p.patient_number,'') ilike '%'||v_q||'%'
      or coalesce(p.cms,'') ilike '%'||v_q||'%'
    )
    and (
      v_admin
      or exists(
        select 1
        from public.social_followup_cycles sfc
        where sfc.patient_id=p.id
          and sfc.professional_id=v_professional_id
          and sfc.status in ('ativo','encerrado')
      )
    )
  order by fm.id,p.id,coalesce(p.death_recorded_at,p.updated_at,p.created_at) desc
  limit least(greatest(coalesce(p_limit,20),1),50);
end;
$function$;

revoke all on function public.search_bereavement_family_members_for_interface(text,integer) from public,anon;
grant execute on function public.search_bereavement_family_members_for_interface(text,integer) to authenticated;
