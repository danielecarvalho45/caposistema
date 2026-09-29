do $$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='apply_agenda_change_request_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_request_id uuid';

  v_old := 'if exists(select 1 from public.agenda_configs ac where ac.professional_id=v_request.professional_id and ac.is_active=true and ac.id is distinct from v_request.agenda_config_id and daterange(ac.start_date,coalesce(ac.end_date,''infinity''::date),''[]'') && daterange(v_start_date,coalesce(v_end_date,''infinity''::date),''[]'')) then raise exception ''Já existe configuração ativa nesse período.''; end if;';
  v_new := 'if exists(select 1 from public.agenda_configs ac join public.agenda_weekdays aw on aw.agenda_config_id=ac.id and aw.is_active=true where ac.professional_id=v_request.professional_id and ac.is_active=true and ac.id is distinct from v_request.agenda_config_id and daterange(ac.start_date,coalesce(ac.end_date,''infinity''::date),''[]'') && daterange(v_start_date,coalesce(v_end_date,''infinity''::date),''[]'') and aw.weekday=any(v_weekdays)) then raise exception ''Já existe configuração ativa, na mesma vigência, para um dos dias da semana selecionados.''; end if;';

  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then
      raise exception 'Contrato de sobreposição da efetivação não localizado.';
    end if;
    v_def:=replace(v_def,v_old,v_new);
  end if;

  v_old := 'select count(*) into v_affected_count from public.patient_appointments pa
      where pa.professional_id=v_request.professional_id and pa.appointment_date>=now()
        and lower(coalesce(pa.attendance_status,''agendado'')) not in (''cancelado'',''remarcado'')
        and (((pa.appointment_date at time zone ''America/Sao_Paulo'')::date<v_start_date)
          or (v_end_date is not null and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>v_end_date)
          or extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer<>all(v_weekdays)
          or (pa.appointment_date at time zone ''America/Sao_Paulo'')::time<v_start_time
          or (pa.appointment_end at time zone ''America/Sao_Paulo'')::time>v_end_time);';

  v_new := 'select count(*) into v_affected_count from public.patient_appointments pa
      where pa.professional_id=v_request.professional_id and pa.appointment_date>=now()
        and lower(coalesce(pa.attendance_status,''agendado'')) not in (''cancelado'',''remarcado'')
        and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>=v_config.start_date
        and (v_config.end_date is null or (pa.appointment_date at time zone ''America/Sao_Paulo'')::date<=v_config.end_date)
        and exists(
          select 1
          from public.agenda_weekdays aw
          where aw.agenda_config_id=v_request.agenda_config_id
            and aw.is_active=true
            and aw.weekday=extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer
        )
        and (((pa.appointment_date at time zone ''America/Sao_Paulo'')::date<v_start_date)
          or (v_end_date is not null and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>v_end_date)
          or extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer<>all(v_weekdays)
          or (pa.appointment_date at time zone ''America/Sao_Paulo'')::time<v_start_time
          or (pa.appointment_end at time zone ''America/Sao_Paulo'')::time>v_end_time);';

  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then
      raise exception 'Contrato de impacto da efetivação não localizado.';
    end if;
    v_def:=replace(v_def,v_old,v_new);
  end if;

  execute v_def;
end
$$;
