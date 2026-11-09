
create or replace function public.create_family_link_with_cms_for_interface(
  p_patient_id uuid,p_relationship text,p_psychological_interest text,
  p_existing_family_member_id uuid,p_full_name text,p_phone text,p_email text,
  p_birth_date date,p_address text,p_cms text
) returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $body$
declare v_result jsonb; v_family_id uuid; v_cms text:=nullif(btrim(coalesce(p_cms,'')),'');
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if v_cms is not null then
    if length(v_cms)>30 then raise exception 'CMS excede 30 caracteres.' using errcode='22023'; end if;
    if exists(select 1 from public.patients p where p.cms=v_cms) then
      raise exception 'CMS já pertence a um paciente cadastrado.' using errcode='23505';
    end if;
    if exists(select 1 from public.family_members f where f.cms=v_cms and (p_existing_family_member_id is null or f.id<>p_existing_family_member_id)) then
      raise exception 'CMS já pertence a outro familiar cadastrado.' using errcode='23505';
    end if;
  end if;
  v_result:=public.create_family_link_for_interface(
    p_patient_id,p_relationship,p_psychological_interest,p_existing_family_member_id,
    p_full_name,p_phone,p_email,p_birth_date,p_address);
  v_family_id:=(v_result->>'family_member_id')::uuid;
  if v_cms is not null then
    update public.family_members set cms=v_cms,updated_at=clock_timestamp()
    where id=v_family_id;
  end if;
  return v_result || jsonb_build_object(
    'capo_number',(select capo_number from public.family_members where id=v_family_id),
    'cms',(select cms from public.family_members where id=v_family_id));
end;
$body$;
revoke all on function public.create_family_link_with_cms_for_interface(uuid,text,text,uuid,text,text,text,date,text,text) from public;
grant execute on function public.create_family_link_with_cms_for_interface(uuid,text,text,uuid,text,text,text,date,text,text) to authenticated;

create or replace function public.update_family_cms_for_interface(p_link_id uuid,p_cms text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $body$
declare v_link public.patient_family_links%rowtype; v_cms text:=nullif(btrim(coalesce(p_cms,'')),'');
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
 then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional'))
 then raise exception 'Somente o administrativo pode alterar CMS do familiar.' using errcode='42501'; end if;
 select * into v_link from public.patient_family_links where id=p_link_id and unlinked_at is null;
 if v_link.id is null then raise exception 'Vínculo ativo não encontrado.' using errcode='22023'; end if;
 perform public.capo_assert_patient_write_context(v_link.patient_id);
 if v_cms is null or char_length(v_cms)>30 then raise exception 'Informe CMS válido.' using errcode='22023'; end if;
 if exists(select 1 from public.patients p where p.cms=v_cms)
 or exists(select 1 from public.family_members fm where fm.cms=v_cms and fm.id<>v_link.family_member_id)
 then raise exception 'CMS já pertence a outra pessoa cadastrada.' using errcode='23505'; end if;
 update public.family_members set cms=v_cms,updated_at=clock_timestamp() where id=v_link.family_member_id;
 return jsonb_build_object('success',true,'family_member_id',v_link.family_member_id,'cms',v_cms);
end;
$body$;
revoke all on function public.update_family_cms_for_interface(uuid,text) from public;
grant execute on function public.update_family_cms_for_interface(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.get_family_context_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_is_admin boolean;
  v_is_ao boolean;
  v_is_social boolean := false;
  v_result jsonb;
begin
  perform public.capo_assert_patient_read_context(p_patient_id);
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'É necessário aceitar o termo vigente.' using errcode='42501'; end if;
  select ua.id, public.capo_effective_professional_id() into v_account_id, v_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  v_is_admin := public.has_app_role('administrador');
  v_is_ao := public.has_app_role('administrativo_operacional');
  if v_professional_id is not null and public.has_app_role('profissional') then
    select exists(
      select 1 from public.professional_specialties ps
      join public.specialties s on s.id=ps.specialty_id
      join public.professionals pr on pr.id=ps.professional_id
      where ps.professional_id=v_professional_id and pr.status='ativo' and pr.is_professional=true
        and s.is_active=true and lower(btrim(s.name))='assistência social'
    ) into v_is_social;
  end if;
  if not (v_is_admin or v_is_ao or v_is_social) then raise exception 'Perfil sem autorização para consultar vínculos familiares.' using errcode='42501'; end if;
  if p_patient_id is null or not exists(select 1 from public.patients p where p.id=p_patient_id) then raise exception 'Paciente não encontrado.' using errcode='22023'; end if;
  if v_is_social and not (v_is_admin or v_is_ao) and not exists(
    select 1 from public.social_followup_cycles sfc
    where sfc.patient_id=p_patient_id and sfc.professional_id=v_professional_id and sfc.status='ativo'
  ) then raise exception 'Paciente fora do acompanhamento social ativo deste profissional.' using errcode='42501'; end if;

  select jsonb_build_object(
    'patient_id',p_patient_id,
    'source_patient', (select jsonb_build_object('name',p.full_name,'deceased',coalesce(p.deceased,false),'death_date',p.death_date) from public.patients p where p.id=p_patient_id),
    'active_link',(
      select jsonb_build_object(
        'link_id',pfl.id,'family_member_id',fm.id,'full_name',fm.full_name,'birth_date',fm.birth_date,
        'phone',fm.phone,'email',fm.email,'capo_number',fm.capo_number,'cms',fm.cms,'address',fm.address,'relationship',pfl.relationship,
        'psychological_interest',pfl.psychological_interest,'linked_at',pfl.linked_at,'linked_by',pfl.linked_by,
        'accepted_capo',pfl.accepted_capo,'acceptance_date',pfl.acceptance_date
      )
      from public.patient_family_links pfl join public.family_members fm on fm.id=pfl.family_member_id
      where pfl.patient_id=p_patient_id and pfl.unlinked_at is null limit 1
    ),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'link_id',pfl.id,'family_member_id',fm.id,'full_name',fm.full_name,'birth_date',fm.birth_date,
        'phone',fm.phone,'email',fm.email,'capo_number',fm.capo_number,'cms',fm.cms,'address',fm.address,'relationship',pfl.relationship,
        'psychological_interest',pfl.psychological_interest,'linked_at',pfl.linked_at,'linked_by',pfl.linked_by,
        'unlinked_at',pfl.unlinked_at,'unlinked_by',pfl.unlinked_by,'unlink_reason',pfl.unlink_reason,
        'accepted_capo',pfl.accepted_capo,'acceptance_date',pfl.acceptance_date
      ) order by pfl.linked_at desc, pfl.id desc)
      from public.patient_family_links pfl join public.family_members fm on fm.id=pfl.family_member_id
      where pfl.patient_id=p_patient_id
    ),'[]'::jsonb),
    'can_admin_correct',(v_is_admin or v_is_ao),
    'can_operate',(v_is_admin or v_is_ao or v_is_social)
  ) into v_result;
  return v_result;
end;
$function$
