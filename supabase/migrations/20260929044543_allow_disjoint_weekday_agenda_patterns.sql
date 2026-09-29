-- CAPO — múltiplos padrões semanais simultâneos por profissional.
-- Padrões podem compartilhar a mesma vigência desde que não compartilhem dias ativos.

do $$
declare v_def text; v_old text; v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='save_agenda_configuration_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_config_id uuid, p_professional_id uuid, p_start_date date, p_end_date date, p_start_time time without time zone, p_end_time time without time zone, p_duration_minutes integer, p_weekdays integer[], p_notes text, p_expected_updated_at timestamp with time zone, p_confirm_affected boolean, p_justification text';

  v_old := 'if exists(select 1 from public.agenda_configs ac where ac.professional_id=p_professional_id and ac.is_active=true and ac.id is distinct from p_config_id and daterange(ac.start_date,coalesce(ac.end_date,''infinity''::date),''[]'') && daterange(p_start_date,coalesce(p_end_date,''infinity''::date),''[]'')) then raise exception ''Já existe configuração ativa nesse período.''; end if;';
  v_new := 'if exists(select 1 from public.agenda_configs ac join public.agenda_weekdays aw on aw.agenda_config_id=ac.id and aw.is_active=true where ac.professional_id=p_professional_id and ac.is_active=true and ac.id is distinct from p_config_id and daterange(ac.start_date,coalesce(ac.end_date,''infinity''::date),''[]'') && daterange(p_start_date,coalesce(p_end_date,''infinity''::date),''[]'') and aw.weekday=any(p_weekdays)) then raise exception ''Já existe configuração ativa, na mesma vigência, para um dos dias da semana selecionados.''; end if;';
  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then raise exception 'Contrato de sobreposição não localizado.'; end if;
    v_def:=replace(v_def,v_old,v_new);
  end if;

  v_old := 'select count(*) into v_affected_count from public.patient_appointments pa where pa.professional_id=p_professional_id and pa.appointment_date>=now() and lower(coalesce(pa.attendance_status,''agendado'')) not in (''cancelado'',''remarcado'') and (((pa.appointment_date at time zone ''America/Sao_Paulo'')::date<p_start_date) or (p_end_date is not null and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>p_end_date) or extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer<>all(p_weekdays) or (pa.appointment_date at time zone ''America/Sao_Paulo'')::time<p_start_time or (pa.appointment_end at time zone ''America/Sao_Paulo'')::time>p_end_time);';
  v_new := 'select count(*) into v_affected_count from public.patient_appointments pa where pa.professional_id=p_professional_id and pa.appointment_date>=now() and lower(coalesce(pa.attendance_status,''agendado'')) not in (''cancelado'',''remarcado'') and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>=v_existing.start_date and (v_existing.end_date is null or (pa.appointment_date at time zone ''America/Sao_Paulo'')::date<=v_existing.end_date) and exists(select 1 from public.agenda_weekdays aw where aw.agenda_config_id=p_config_id and aw.is_active=true and aw.weekday=extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer) and (((pa.appointment_date at time zone ''America/Sao_Paulo'')::date<p_start_date) or (p_end_date is not null and (pa.appointment_date at time zone ''America/Sao_Paulo'')::date>p_end_date) or extract(dow from pa.appointment_date at time zone ''America/Sao_Paulo'')::integer<>all(p_weekdays) or (pa.appointment_date at time zone ''America/Sao_Paulo'')::time<p_start_time or (pa.appointment_end at time zone ''America/Sao_Paulo'')::time>p_end_time);';
  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then raise exception 'Contrato de impacto não localizado.'; end if;
    v_def:=replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_available_appointment_slots'
    and pg_get_function_identity_arguments(p.oid)='p_professional_id uuid, p_date date';
  v_old := 'from public.agenda_configs ac
        where ac.professional_id=p_professional_id
          and ac.is_active=true
          and ac.start_date<=p_date
          and (ac.end_date is null or ac.end_date>=p_date)
          and ac.appointment_duration_minutes>0
        order by ac.start_date desc,ac.created_at desc
        limit 1';
  v_new := 'from public.agenda_configs ac
        join public.agenda_weekdays aw
          on aw.agenda_config_id=ac.id
         and aw.is_active=true
         and aw.weekday=extract(dow from p_date)::integer
        where ac.professional_id=p_professional_id
          and ac.is_active=true
          and ac.start_date<=p_date
          and (ac.end_date is null or ac.end_date>=p_date)
          and ac.appointment_duration_minutes>0
        order by ac.start_date desc,ac.created_at desc
        limit 1';
  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then raise exception 'Contrato de vagas não localizado.'; end if;
    execute replace(v_def,v_old,v_new);
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_agenda_schedule_grid_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_start_date date, p_end_date date, p_professional_id uuid';
  v_old := 'from public.agenda_configs ac
      where ac.professional_id=ps.id
        and ac.is_active=true
        and ac.start_date<=d.d
        and (ac.end_date is null or ac.end_date>=d.d)
        and ac.appointment_duration_minutes>0
      order by ac.start_date desc,ac.created_at desc
      limit 1';
  v_new := 'from public.agenda_configs ac
      join public.agenda_weekdays aw
        on aw.agenda_config_id=ac.id
       and aw.is_active=true
       and aw.weekday=extract(dow from d.d)::integer
      where ac.professional_id=ps.id
        and ac.is_active=true
        and ac.start_date<=d.d
        and (ac.end_date is null or ac.end_date>=d.d)
        and ac.appointment_duration_minutes>0
      order by ac.start_date desc,ac.created_at desc
      limit 1';
  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then raise exception 'Contrato da grade não localizado.'; end if;
    execute replace(v_def,v_old,v_new);
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_coordinator_agenda_overview_for_interface'
    and pg_get_function_identity_arguments(p.oid)='p_start_date date, p_end_date date, p_specialty_id uuid, p_professional_id uuid';
  v_old := 'from public.agenda_configs ac1
      where ac1.professional_id=p.professional_id
        and ac1.is_active=true
        and ac1.start_date<=d.agenda_date
        and (ac1.end_date is null or ac1.end_date>=d.agenda_date)
      order by ac1.start_date desc,ac1.created_at desc
      limit 1';
  v_new := 'from public.agenda_configs ac1
      join public.agenda_weekdays aw1
        on aw1.agenda_config_id=ac1.id
       and aw1.is_active=true
       and aw1.weekday=extract(dow from d.agenda_date)::integer
      where ac1.professional_id=p.professional_id
        and ac1.is_active=true
        and ac1.start_date<=d.agenda_date
        and (ac1.end_date is null or ac1.end_date>=d.agenda_date)
      order by ac1.start_date desc,ac1.created_at desc
      limit 1';
  if position(v_new in v_def)=0 then
    if position(v_old in v_def)=0 then raise exception 'Contrato da Coordenação não localizado.'; end if;
    execute replace(v_def,v_old,v_new);
  end if;
end $$;
