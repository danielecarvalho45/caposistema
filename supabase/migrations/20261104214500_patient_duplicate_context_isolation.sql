-- CAPO: isolamento das chaves de duplicidade entre ambiente real e manuteste.

-- Não altera nem remove pacientes existentes.

create unique index patients_name_birth_unique_by_context

  on public.patients (public.capo_normalize_patient_name(full_name), birth_date, is_test);

drop index public.patients_name_birth_unique_norm;

alter table public.patients drop constraint patients_cms_unique;

alter table public.patients add constraint patients_cms_unique unique (cms,is_test);

CREATE OR REPLACE FUNCTION public.create_patient_for_interface(p_full_name text, p_birth_date date, p_cms text DEFAULT NULL::text, p_sex text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_phone_secondary text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_capo_start_date date DEFAULT CURRENT_DATE, p_operational_notes text DEFAULT NULL::text, p_origin text DEFAULT NULL::text)
 RETURNS TABLE(patient_id uuid, patient_number text, full_name text, cms text, birth_date date, origin text, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_full_name text;
  v_cms text;
  v_sex text;
  v_phone text;
  v_phone_secondary text;
  v_address text;
  v_notes text;
  v_origin text;
  v_start_date date;
  v_patient public.patients%rowtype;
  v_is_homologation boolean := false;
  v_homologation_enabled boolean := false;
  v_simulated_role text;
  v_can_create boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada.' using errcode='42501';
  end if;

  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select ua.id,coalesce(ua.is_homologation_account,false)
    into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid()
    and ua.is_active=true
  limit 1;

  if v_account_id is null then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;

  if v_is_homologation then
    select coalesce(hc.is_enabled,false),ar.code
      into v_homologation_enabled,v_simulated_role
    from public.homologation_contexts hc
    left join public.app_roles ar on ar.id=hc.simulated_role_id
    where hc.actor_account_id=v_account_id;

    v_can_create :=
      coalesce(v_homologation_enabled,false)
      and v_simulated_role in ('administrativo_operacional','administrador');
  else
    v_can_create :=
      public.has_app_role('administrador')
      or public.has_app_role('administrativo_operacional');
  end if;

  if not v_can_create then
    raise exception 'Somente o Administrativo autorizado pode cadastrar pacientes.' using errcode='42501';
  end if;

  v_full_name := regexp_replace(btrim(coalesce(p_full_name,'')), '\s+', ' ', 'g');

  if char_length(v_full_name) < 3 or char_length(v_full_name) > 200 then
    raise exception 'O nome completo deve possuir entre 3 e 200 caracteres.' using errcode='22023';
  end if;

  if p_birth_date is null then
    raise exception 'Data de nascimento obrigatória.' using errcode='22023';
  end if;

  if p_birth_date > current_date then
    raise exception 'Data de nascimento não pode estar no futuro.' using errcode='22023';
  end if;

  if p_birth_date < (current_date - interval '120 years')::date then
    raise exception 'Data de nascimento fora do limite permitido.' using errcode='22023';
  end if;

  v_cms := nullif(btrim(coalesce(p_cms,'')),'');
  v_sex := nullif(btrim(coalesce(p_sex,'')),'');
  v_phone := nullif(btrim(coalesce(p_phone,'')),'');
  v_phone_secondary := nullif(btrim(coalesce(p_phone_secondary,'')),'');
  v_address := nullif(btrim(coalesce(p_address,'')),'');
  v_notes := nullif(btrim(coalesce(p_operational_notes,'')),'');
  v_origin := nullif(btrim(coalesce(p_origin,'')),'');
  v_start_date := coalesce(p_capo_start_date,current_date);

  if v_cms is not null and char_length(v_cms)>50 then
    raise exception 'CMS deve possuir no máximo 50 caracteres.' using errcode='22023';
  end if;
  if v_sex is not null and char_length(v_sex)>50 then
    raise exception 'Campo sexo deve possuir no máximo 50 caracteres.' using errcode='22023';
  end if;
  if v_phone is not null and char_length(v_phone) not between 8 and 30 then
    raise exception 'Telefone principal inválido.' using errcode='22023';
  end if;
  if v_phone_secondary is not null and char_length(v_phone_secondary) not between 8 and 30 then
    raise exception 'Telefone secundário inválido.' using errcode='22023';
  end if;
  if v_address is not null and char_length(v_address)>300 then
    raise exception 'Endereço deve possuir no máximo 300 caracteres.' using errcode='22023';
  end if;
  if v_notes is not null and char_length(v_notes)>500 then
    raise exception 'Observação operacional deve possuir no máximo 500 caracteres.' using errcode='22023';
  end if;
  if v_origin is not null and char_length(v_origin) not between 2 and 200 then
    raise exception 'Origem deve possuir entre 2 e 200 caracteres.' using errcode='22023';
  end if;

  if v_start_date > current_date then
    raise exception 'Data de início no CAPO não pode estar no futuro.' using errcode='22023';
  end if;
  if v_start_date < p_birth_date then
    raise exception 'Data de início no CAPO não pode ser anterior ao nascimento.' using errcode='22023';
  end if;

  if v_cms is not null and exists(
    select 1 from public.patients p
    where lower(btrim(p.cms))=lower(v_cms)
      and p.is_test=(v_is_homologation and v_homologation_enabled)
  ) then
    raise exception 'Já existe paciente cadastrado com este CMS.' using errcode='23505';
  end if;

  if exists(
    select 1 from public.patients p
    where lower(btrim(p.full_name))=lower(v_full_name)
      and p.birth_date=p_birth_date
      and p.is_test=(v_is_homologation and v_homologation_enabled)
  ) then
    raise exception 'Já existe paciente com o mesmo nome e data de nascimento.' using errcode='23505';
  end if;

  insert into public.patients(
    full_name,cms,birth_date,sex,phone,phone_secondary,address,
    status,capo_start_date,notes,deceased,origin,is_test,test_label
  ) values (
    v_full_name,v_cms,p_birth_date,v_sex,v_phone,v_phone_secondary,v_address,
    'ativo',v_start_date,v_notes,false,v_origin,
    v_is_homologation and v_homologation_enabled,
    case
      when v_is_homologation and v_homologation_enabled
        then 'Paciente criado em homologação controlada'
      else null
    end
  )
  returning * into v_patient;

  if v_is_homologation and v_homologation_enabled then
    update public.homologation_contexts
       set test_patient_id=v_patient.id,
           reason='Paciente teste recém-cadastrado selecionado automaticamente para continuidade da homologação.',
           updated_at=clock_timestamp()
     where actor_account_id=v_account_id
       and is_enabled=true;
  end if;

  return query
  select
    v_patient.id,
    v_patient.patient_number,
    v_patient.full_name,
    v_patient.cms,
    v_patient.birth_date,
    v_patient.origin,
    v_patient.status,
    v_patient.created_at;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_patient_for_interface(p_patient_id uuid, p_full_name text, p_birth_date date, p_cms text, p_sex text, p_phone text, p_phone_secondary text, p_address text, p_capo_start_date date, p_operational_notes text, p_status text, p_origin text DEFAULT NULL::text)
 RETURNS TABLE(patient_id uuid, patient_number text, full_name text, cms text, birth_date date, origin text, status text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
    v_user_account_id uuid;
    v_patient_deceased boolean;
    v_current_status text;
    v_current_origin text;
    v_patient_is_test boolean;
    v_origin text;
begin
    if auth.uid() is null then
        raise exception 'Sessão não autenticada.' using errcode='42501';
    end if;

    if not coalesce(public.has_accepted_current_legal_term(),false) then
        raise exception 'É necessário aceitar o termo vigente.' using errcode='42501';
    end if;

    perform public.capo_assert_patient_write_context(p_patient_id);

    select ua.id into v_user_account_id
    from public.user_accounts ua
    where ua.auth_user_id=auth.uid()
      and ua.is_active=true
    limit 1;

    if v_user_account_id is null then
        raise exception 'Conta inexistente ou inativa.' using errcode='42501';
    end if;

    if not (
        public.has_app_role('administrador')
        or public.has_app_role('administrativo_operacional')
    ) then
        raise exception 'Usuário sem permissão para atualizar pacientes.' using errcode='42501';
    end if;

    select pt.deceased,pt.status,pt.origin,pt.is_test
      into v_patient_deceased,v_current_status,v_current_origin,v_patient_is_test
    from public.patients pt
    where pt.id=p_patient_id
    for update;

    if not found then
        raise exception 'Paciente não encontrado.' using errcode='22023';
    end if;

    if length(btrim(coalesce(p_full_name,'')))<3 or length(btrim(p_full_name))>200 then
        raise exception 'Nome deve possuir entre 3 e 200 caracteres.' using errcode='22023';
    end if;
    if p_birth_date is null or p_birth_date>current_date then
        raise exception 'Data de nascimento inválida.' using errcode='22023';
    end if;
    if p_cms is not null and length(btrim(p_cms))>50 then
        raise exception 'CMS excede o limite permitido.' using errcode='22023';
    end if;
    if p_sex is not null and length(btrim(p_sex))>30 then
        raise exception 'Sexo excede o limite permitido.' using errcode='22023';
    end if;
    if p_phone is not null and length(btrim(p_phone))>30 then
        raise exception 'Telefone excede o limite permitido.' using errcode='22023';
    end if;
    if p_phone_secondary is not null and length(btrim(p_phone_secondary))>30 then
        raise exception 'Telefone secundário excede o limite permitido.' using errcode='22023';
    end if;
    if p_address is not null and length(btrim(p_address))>500 then
        raise exception 'Endereço excede o limite permitido.' using errcode='22023';
    end if;
    if p_operational_notes is not null and length(btrim(p_operational_notes))>500 then
        raise exception 'Observação operacional excede 500 caracteres.' using errcode='22023';
    end if;
    if coalesce(p_operational_notes,'') ~* '(diagnóstico|anamnese|prescrição|medicação|sintoma|tratamento|conduta clínica)' then
        raise exception 'A observação deve conter somente informação operacional.' using errcode='22023';
    end if;
    if p_capo_start_date is not null and p_capo_start_date>current_date then
        raise exception 'Data de início no CAPO não pode estar no futuro.' using errcode='22023';
    end if;
    if lower(btrim(coalesce(p_status,''))) not in ('ativo','inativo') then
        raise exception 'Situação permitida: ativo ou inativo.' using errcode='22023';
    end if;

    v_origin := case
        when p_origin is null then v_current_origin
        else nullif(btrim(p_origin),'')
    end;

    if v_origin is not null and char_length(v_origin) not between 2 and 200 then
        raise exception 'Origem deve possuir entre 2 e 200 caracteres.' using errcode='22023';
    end if;

    if v_patient_deceased and lower(btrim(p_status))<>v_current_status then
        raise exception 'A situação de paciente falecido não pode ser alterada por esta função.' using errcode='22023';
    end if;

    if p_cms is not null and btrim(p_cms)<>'' and exists(
        select 1 from public.patients pt
        where pt.id<>p_patient_id
          and lower(btrim(coalesce(pt.cms,'')))=lower(btrim(p_cms))
          and pt.is_test=v_patient_is_test
    ) then
        raise exception 'Já existe outro paciente com este CMS.' using errcode='23505';
    end if;

    if exists(
        select 1 from public.patients pt
        where pt.id<>p_patient_id
          and lower(btrim(pt.full_name))=lower(btrim(p_full_name))
          and pt.birth_date=p_birth_date
          and pt.is_test=v_patient_is_test
    ) then
        raise exception 'Já existe outro paciente com o mesmo nome e data de nascimento.' using errcode='23505';
    end if;

    return query
    update public.patients pt
       set full_name=btrim(p_full_name),
           birth_date=p_birth_date,
           cms=nullif(btrim(p_cms),''),
           sex=nullif(btrim(p_sex),''),
           phone=nullif(btrim(p_phone),''),
           phone_secondary=nullif(btrim(p_phone_secondary),''),
           address=nullif(btrim(p_address),''),
           capo_start_date=p_capo_start_date,
           notes=nullif(btrim(p_operational_notes),''),
           origin=v_origin,
           status=lower(btrim(p_status)),
           updated_at=clock_timestamp()
     where pt.id=p_patient_id
     returning
         pt.id,
         pt.patient_number,
         pt.full_name,
         pt.cms,
         pt.birth_date,
         pt.origin,
         pt.status,
         pt.updated_at;
end;
$function$
;