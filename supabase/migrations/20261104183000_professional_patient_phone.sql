-- CAPO: consulta administrativa estritamente de leitura e alteração de telefone
-- pelo profissional. Não altera contratos de cadastro ou de oferta existentes.
create or replace function public.get_patient_for_professional_interface(p_patient_id uuid)
returns table (
  patient_id uuid, patient_number text, full_name text, birth_date date,
  cms text, sex text, phone text, phone_secondary text, address text,
  capo_start_date date, operational_notes text, origin text, status text, deceased boolean
)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Sessão ou termo legal inválido.' using errcode = '42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil sem permissão para consulta profissional.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id = auth.uid() and ua.is_active = true
  ) then
    raise exception 'Conta inexistente ou inativa.' using errcode = '42501';
  end if;
  perform public.capo_assert_patient_read_context(p_patient_id);
  return query
  select p.id, p.patient_number, p.full_name, p.birth_date, p.cms,
         p.sex, p.phone, p.phone_secondary, p.address, p.capo_start_date,
         p.notes, p.origin, p.status, p.deceased
    from public.patients p where p.id = p_patient_id;
end;
$function$;

revoke all on function public.get_patient_for_professional_interface(uuid) from public, anon;
grant execute on function public.get_patient_for_professional_interface(uuid) to authenticated;

create or replace function public.update_patient_phone_by_professional_for_interface(
  p_patient_id uuid, p_phone text
)
returns table (patient_id uuid, phone text, updated_at timestamptz)
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_old_phone text;
  v_deceased boolean;
  v_new_phone text := nullif(btrim(p_phone), '');
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(), false) then
    raise exception 'Sessão ou termo legal inválido.' using errcode = '42501';
  end if;
  if not public.has_app_role('profissional') then
    raise exception 'Perfil sem permissão para alterar telefone.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id = auth.uid() and ua.is_active = true
  ) then
    raise exception 'Conta inexistente ou inativa.' using errcode = '42501';
  end if;
  perform public.capo_assert_patient_write_context(p_patient_id);
  if v_new_phone is null or char_length(v_new_phone) > 30 or
     char_length(regexp_replace(v_new_phone, '[^0-9]', '', 'g')) not between 10 and 13 then
    raise exception 'Informe um telefone válido com DDD.' using errcode = '22023';
  end if;
  select p.phone, p.deceased into v_old_phone, v_deceased
    from public.patients p where p.id = p_patient_id for update;
  if not found then
    raise exception 'Paciente não encontrado.' using errcode = '22023';
  end if;
  if v_deceased then
    raise exception 'Telefone de paciente falecido não pode ser alterado.' using errcode = '22023';
  end if;
  if v_old_phone is distinct from v_new_phone then
    update public.patients p set phone = v_new_phone, updated_at = clock_timestamp()
      where p.id = p_patient_id;
    insert into public.audit_logs (
      user_id, user_role, action, entity_name, record_id, old_data, new_data, description
    ) values (
      auth.uid(), 'profissional', 'update_phone', 'patients', p_patient_id::text,
      jsonb_build_object('phone', v_old_phone), jsonb_build_object('phone', v_new_phone),
      'Atualização de telefone informada ao profissional no atendimento'
    );
  end if;
  return query select p.id, p.phone, p.updated_at
    from public.patients p where p.id = p_patient_id;
end;
$function$;

revoke all on function public.update_patient_phone_by_professional_for_interface(uuid, text) from public, anon;
grant execute on function public.update_patient_phone_by_professional_for_interface(uuid, text) to authenticated;
