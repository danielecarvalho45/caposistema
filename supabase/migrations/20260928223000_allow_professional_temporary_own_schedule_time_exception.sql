create or replace function public.create_agenda_exception_for_interface(
  p_agenda_config_id uuid,
  p_exception_date date,
  p_exception_type text,
  p_start_time time without time zone default null,
  p_end_time time without time zone default null,
  p_description text default null,
  p_confirm_conflict boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_professional_id uuid;
  v_caller_professional_id uuid;
  v_conflicts integer;
  v_id uuid;
  v_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;

  select public.capo_effective_professional_id()
    into v_caller_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if not found then raise exception 'Conta ativa não localizada.'; end if;

  select ac.professional_id
    into v_professional_id
  from public.agenda_configs ac
  where ac.id=p_agenda_config_id and ac.is_active=true;

  if not found then raise exception 'Configuração ativa não localizada.'; end if;

  v_is_admin:=public.has_app_role('administrador');

  if not v_is_admin and v_professional_id is distinct from v_caller_professional_id then
    raise exception 'Acesso permitido somente à própria agenda.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_agenda_config_id::text,0)
  );

  if p_exception_type not in (
    'cancelamento','alteracao_horario','bloqueio',
    'atendimento_extra','feriado','outro'
  ) then
    raise exception 'Tipo de exceção inválido.';
  end if;

  if p_exception_date is null then
    raise exception 'Informe a data da exceção.';
  end if;

  if (p_start_time is null)<>(p_end_time is null)
     or (p_start_time is not null and p_end_time<=p_start_time) then
    raise exception 'Horário da exceção inválido.';
  end if;

  if p_exception_type='outro'
     and length(btrim(coalesce(p_description,'')))=0 then
    raise exception 'Descreva a exceção do tipo outro.';
  end if;

  if p_exception_date<current_date
     and (not v_is_admin or length(btrim(coalesce(p_description,'')))<5) then
    raise exception 'Exceção retroativa exige Administrativo Controlador e justificativa.';
  end if;

  select count(*) into v_conflicts
  from public.agenda_exceptions ae
  where ae.agenda_config_id=p_agenda_config_id
    and ae.exception_date=p_exception_date
    and ae.is_active=true
    and (
      (p_exception_type='alteracao_horario' and ae.exception_type='alteracao_horario')
      or (
        p_start_time is not null
        and ae.start_time is not null
        and ae.start_time<p_end_time
        and ae.end_time>p_start_time
      )
    );

  if v_conflicts>0 and not p_confirm_conflict then
    return jsonb_build_object(
      'success',false,
      'requires_conflict_confirmation',true,
      'message','Existe outra exceção nessa data ou período. Confirme a regra mais recente.'
    );
  end if;

  if p_exception_type='alteracao_horario' then
    update public.agenda_exceptions
       set is_active=false,updated_at=clock_timestamp()
     where agenda_config_id=p_agenda_config_id
       and exception_date=p_exception_date
       and exception_type='alteracao_horario'
       and is_active=true;
  end if;

  insert into public.agenda_exceptions(
    agenda_config_id,exception_date,exception_type,
    start_time,end_time,description,is_active,updated_at
  )
  values(
    p_agenda_config_id,p_exception_date,p_exception_type,
    p_start_time,p_end_time,nullif(btrim(p_description),''),
    true,clock_timestamp()
  )
  returning id into v_id;

  return jsonb_build_object(
    'success',true,
    'exception_id',v_id,
    'message',case
      when p_exception_type='alteracao_horario'
        then 'Horário provisório registrado na própria agenda.'
      else 'Exceção registrada com sucesso.'
    end
  );
end;
$function$;

revoke all on function public.create_agenda_exception_for_interface(uuid,date,text,time without time zone,time without time zone,text,boolean) from public;
grant execute on function public.create_agenda_exception_for_interface(uuid,date,text,time without time zone,time without time zone,text,boolean) to authenticated;
