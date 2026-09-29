alter table public.agenda_blocks
  drop constraint if exists agenda_blocks_block_type_check;

alter table public.agenda_blocks
  add constraint agenda_blocks_block_type_check
  check (
    block_type = any (
      array[
        'intervalo'::text,
        'alimentacao'::text,
        'estudo_caso'::text,
        'atendimento_online'::text,
        'rotina_administrativa'::text,
        'atividade'::text,
        'bloqueio'::text,
        'reuniao'::text,
        'relatorio'::text,
        'outro'::text
      ]
    )
  );

create or replace function public.save_agenda_recurring_interval_for_interface(
  p_agenda_config_id uuid,
  p_weekdays integer[],
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_block_type text default 'intervalo',
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_professional_id uuid;
  v_weekday integer;
  v_ids uuid[] := '{}';
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Administrador pode alterar a formulação semanal da agenda.' using errcode='42501';
  end if;

  select ac.professional_id into v_professional_id
  from public.agenda_configs ac
  where ac.id=p_agenda_config_id and ac.is_active=true;
  if not found then raise exception 'Configuração ativa não localizada.'; end if;

  if p_block_type not in (
    'intervalo',
    'alimentacao',
    'estudo_caso',
    'atendimento_online',
    'rotina_administrativa'
  ) then
    raise exception 'Tipo recorrente inválido.';
  end if;

  if p_start_time is null or p_end_time is null or p_end_time<=p_start_time then
    raise exception 'Horário inválido.';
  end if;

  if coalesce(array_length(p_weekdays,1),0)=0
     or exists(select 1 from unnest(p_weekdays)d where d<0 or d>6) then
    raise exception 'Selecione pelo menos um dia válido da semana.';
  end if;

  if exists(
    select 1 from unnest(p_weekdays)d
    where not exists(
      select 1 from public.agenda_weekdays aw
      where aw.agenda_config_id=p_agenda_config_id
        and aw.weekday=d
        and aw.is_active=true
    )
  ) then
    raise exception 'A formulação só pode ser aplicada aos dias ativos da agenda.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_agenda_config_id::text,0)
  );

  foreach v_weekday in array p_weekdays loop
    if exists(
      select 1
      from public.agenda_blocks ab
      where ab.agenda_config_id=p_agenda_config_id
        and ab.is_active=true
        and ab.weekday=v_weekday
        and ab.specific_date is null
        and ab.start_time<p_end_time
        and ab.end_time>p_start_time
    ) then
      raise exception 'Já existe ocupação recorrente sobreposta em um dos dias selecionados.';
    end if;
  end loop;

  foreach v_weekday in array p_weekdays loop
    insert into public.agenda_blocks(
      agenda_config_id,weekday,specific_date,start_time,end_time,
      block_type,description,is_active,reschedule_instructions,
      requires_admin_action,admin_action_status,updated_at
    )
    values(
      p_agenda_config_id,v_weekday,null,p_start_time,p_end_time,
      p_block_type,nullif(btrim(p_description),''),true,null,
      false,'nao_necessaria',clock_timestamp()
    )
    returning id into v_id;

    v_ids:=array_append(v_ids,v_id);
  end loop;

  return jsonb_build_object(
    'success',true,
    'block_ids',v_ids,
    'weekdays',p_weekdays,
    'message','Formulação semanal registrada na agenda.'
  );
end;
$function$;

create or replace function public.set_agenda_recurring_interval_status_for_interface(
  p_block_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_block public.agenda_blocks%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Administrador pode alterar a formulação semanal da agenda.' using errcode='42501';
  end if;

  select * into v_block
  from public.agenda_blocks ab
  where ab.id=p_block_id
    and ab.weekday is not null
    and ab.specific_date is null
    and ab.block_type in (
      'intervalo',
      'alimentacao',
      'estudo_caso',
      'atendimento_online',
      'rotina_administrativa'
    )
  for update;

  if not found then raise exception 'Item semanal não localizado.'; end if;

  update public.agenda_blocks
  set is_active=p_is_active,updated_at=clock_timestamp()
  where id=p_block_id;

  return jsonb_build_object(
    'success',true,
    'block_id',p_block_id,
    'is_active',p_is_active
  );
end;
$function$;
