-- CAPO: forma de tratamento apenas para a saudação institucional.
-- Campo independente de sexo/gênero clínico; valor neutro quando não selecionado.
alter table public.professionals
  add column if not exists greeting_treatment text;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.professionals'::regclass
      and conname='professionals_greeting_treatment_check'
  ) then
    alter table public.professionals
      add constraint professionals_greeting_treatment_check
      check (greeting_treatment is null or greeting_treatment in ('feminino','masculino'));
  end if;
end $$;

create or replace function public.get_professional_greeting_treatment_for_interface(p_professional_id uuid default null)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public','auth'
as $$
declare v_professional_id uuid;
declare v_treatment text;
begin
  if auth.uid() is null or not public.has_accepted_current_legal_term() then
    raise exception 'Acesso não autorizado.' using errcode='42501';
  end if;
  if p_professional_id is not null then
    if not public.has_app_role('administrador') or not exists (
      select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active
    ) then
      raise exception 'Somente o Gestor/Titular pode consultar a configuração de terceiros.' using errcode='42501';
    end if;
    v_professional_id := p_professional_id;
  else
    v_professional_id := nullif(public.get_my_access_context()->>'professional_id','')::uuid;
  end if;
  if v_professional_id is null then
    return jsonb_build_object('greeting_treatment', null);
  end if;
  select p.greeting_treatment into v_treatment from public.professionals p where p.id=v_professional_id;
  if not found then
    raise exception 'Profissional não localizado.' using errcode='22023';
  end if;
  return jsonb_build_object('greeting_treatment',v_treatment);
end $$;

create or replace function public.set_professional_greeting_treatment_for_interface(
  p_professional_id uuid, p_treatment text
)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth'
as $$
declare v_treatment text;
begin
  if auth.uid() is null or not public.has_accepted_current_legal_term()
    or not public.has_app_role('administrador')
    or not exists (select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active) then
    raise exception 'Somente o Gestor/Titular pode alterar a forma de tratamento.' using errcode='42501';
  end if;
  if p_professional_id is null then
    raise exception 'Profissional obrigatório.' using errcode='22023';
  end if;
  if p_treatment is not null and p_treatment not in ('feminino','masculino') then
    raise exception 'Forma de tratamento inválida.' using errcode='22023';
  end if;
  update public.professionals
    set greeting_treatment = p_treatment
    where id = p_professional_id
    returning greeting_treatment into v_treatment;
  if not found then
    raise exception 'Profissional não localizado.' using errcode='22023';
  end if;
  return jsonb_build_object('professional_id',p_professional_id,'greeting_treatment',v_treatment);
end $$;
revoke all on function public.get_professional_greeting_treatment_for_interface(uuid) from public,anon;
revoke all on function public.set_professional_greeting_treatment_for_interface(uuid,text) from public,anon;
grant execute on function public.get_professional_greeting_treatment_for_interface(uuid) to authenticated;
grant execute on function public.set_professional_greeting_treatment_for_interface(uuid,text) to authenticated;
