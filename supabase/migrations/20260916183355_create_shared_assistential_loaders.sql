create or replace function public.get_my_assistential_specialties_for_interface()
returns table(
  specialty_id uuid,
  specialty_name text,
  is_current_context boolean
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_context_specialty_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id(),public.capo_effective_specialty_id()
    into v_professional_id,v_context_specialty_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found or v_professional_id is null then
    raise exception 'Conta profissional ativa e vinculada é obrigatória.' using errcode='42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil profissional é obrigatório.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'Profissional assistencial ativo é obrigatório.' using errcode='42501';
  end if;

  return query
  select s.id,s.name,s.id=v_context_specialty_id
  from public.professional_specialties ps
  join public.specialties s on s.id=ps.specialty_id and s.is_active=true
  where ps.professional_id=v_professional_id
  order by case when s.id=v_context_specialty_id then 0 else 1 end,s.name;
end;
$function$;

create or replace function public.search_my_patients_for_interface(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  patient_id uuid,
  full_name text,
  patient_number text,
  cms text,
  status text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_query text := btrim(coalesce(p_query,''));
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found or v_professional_id is null then
    raise exception 'Conta profissional ativa e vinculada é obrigatória.' using errcode='42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil profissional é obrigatório.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.id=v_professional_id and p.status='ativo' and p.is_professional=true
  ) then
    raise exception 'Profissional assistencial ativo é obrigatório.' using errcode='42501';
  end if;
  if char_length(v_query)<2 then
    raise exception 'Informe pelo menos 2 caracteres.' using errcode='22023';
  end if;

  return query
  select p.id,p.full_name,p.patient_number,p.cms,p.status,count(*) over()
  from public.patients p
  where p.status='ativo'
    and coalesce(p.deceased,false)=false
    and public.capo_patient_visible_in_current_context(p.id)
    and (
      lower(coalesce(p.patient_number,''))=lower(v_query)
      or lower(coalesce(p.cms,''))=lower(v_query)
      or (char_length(v_query)>=3 and position(lower(v_query) in lower(p.full_name))>0)
    )
    and (
      exists (
        select 1
        from public.patient_care_cycle_specialties cs
        join public.patient_care_cycles c on c.id=cs.care_cycle_id
        where c.patient_id=p.id
          and c.status in ('ativo','encerramento_em_andamento')
          and cs.status in ('ativa','encerramento_pendente')
          and cs.current_responsible_professional_id=v_professional_id
      )
      or exists (
        select 1 from public.patient_appointments pa
        where pa.patient_id=p.id and pa.professional_id=v_professional_id
          and pa.attendance_status not in ('cancelado','remarcado')
      )
    )
  order by case
      when lower(coalesce(p.patient_number,''))=lower(v_query) then 1
      when lower(coalesce(p.cms,''))=lower(v_query) then 2
      when lower(p.full_name)=lower(v_query) then 3
      else 4 end,
    p.full_name,p.id
  limit least(greatest(coalesce(p_limit,20),1),20)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$;

revoke all on function public.get_my_assistential_specialties_for_interface()
  from public, anon;
revoke all on function public.search_my_patients_for_interface(text,integer,integer)
  from public, anon;
grant execute on function public.get_my_assistential_specialties_for_interface()
  to authenticated;
grant execute on function public.search_my_patients_for_interface(text,integer,integer)
  to authenticated;
