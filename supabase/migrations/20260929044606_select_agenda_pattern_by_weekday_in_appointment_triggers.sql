create or replace function public.capo_prepare_appointment_period()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_duration integer;
begin
  if new.appointment_end is null then
    select ac.appointment_duration_minutes
      into v_duration
    from public.agenda_configs ac
    join public.agenda_weekdays aw
      on aw.agenda_config_id=ac.id
     and aw.is_active=true
     and aw.weekday=extract(
       dow from new.appointment_date at time zone 'America/Sao_Paulo'
     )::integer
    where ac.professional_id=new.professional_id
      and ac.is_active=true
      and ac.start_date <=
          (new.appointment_date at time zone 'America/Sao_Paulo')::date
      and (
        ac.end_date is null
        or ac.end_date >=
           (new.appointment_date at time zone 'America/Sao_Paulo')::date
      )
      and ac.appointment_duration_minutes>0
    order by ac.start_date desc,ac.created_at desc
    limit 1;

    if v_duration is null or v_duration <= 0 then
      raise exception
        'Não foi encontrada duração válida para a agenda deste profissional.';
    end if;

    new.appointment_end :=
      new.appointment_date + make_interval(mins => v_duration);
  end if;

  if new.appointment_end <= new.appointment_date then
    raise exception
      'O horário final deve ser posterior ao horário inicial.';
  end if;

  return new;
end;
$function$;

create or replace function public.capo_prepare_family_psychology_appointment_period()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_duration integer;
begin
  if new.appointment_end is null then
    select ac.appointment_duration_minutes
      into v_duration
    from public.agenda_configs ac
    join public.agenda_weekdays aw
      on aw.agenda_config_id=ac.id
     and aw.is_active=true
     and aw.weekday=extract(
       dow from new.appointment_date at time zone 'America/Sao_Paulo'
     )::integer
    where ac.professional_id=new.professional_id
      and ac.is_active=true
      and ac.start_date <=
          (new.appointment_date at time zone 'America/Sao_Paulo')::date
      and (
        ac.end_date is null
        or ac.end_date >=
           (new.appointment_date at time zone 'America/Sao_Paulo')::date
      )
      and ac.appointment_duration_minutes>0
    order by ac.start_date desc,ac.created_at desc
    limit 1;

    if v_duration is null then
      raise exception
        'Não foi encontrada duração válida para a agenda deste profissional.'
        using errcode='22023';
    end if;

    new.appointment_end :=
      new.appointment_date + make_interval(mins=>v_duration);
  end if;

  if new.appointment_end<=new.appointment_date then
    raise exception
      'O horário final deve ser posterior ao horário inicial.'
      using errcode='22023';
  end if;

  return new;
end;
$function$;
