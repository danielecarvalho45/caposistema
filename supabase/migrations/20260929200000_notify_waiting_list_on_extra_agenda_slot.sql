-- CAPO — automação de fila quando uma nova vaga é aberta por atendimento_extra.
-- Mantém o fluxo canônico: nova vaga -> especialidade -> próximo elegível -> aviso ao Administrativo.

create or replace function public.capo_notify_waiting_vacancy_from_agenda_exception()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_professional_id uuid;
  v_specialty_id uuid;
  v_specialty_name text;
  v_waiting_id uuid;
  v_family_waiting_id uuid;
begin
  if tg_op <> 'INSERT'
     or new.is_active is distinct from true
     or lower(coalesce(new.exception_type,'')) <> 'atendimento_extra' then
    return new;
  end if;

  select ac.professional_id
    into v_professional_id
  from public.agenda_configs ac
  where ac.id=new.agenda_config_id
    and ac.is_active=true;

  if v_professional_id is null then
    return new;
  end if;

  begin
    v_specialty_id := public.resolve_single_active_professional_specialty(v_professional_id);
  exception
    when others then
      return new;
  end;

  if v_specialty_id is null then
    return new;
  end if;

  select s.name into v_specialty_name
  from public.specialties s
  where s.id=v_specialty_id
    and s.is_active=true;

  select wl.id
    into v_waiting_id
  from public.waiting_list wl
  join public.patients p on p.id=wl.patient_id
  where wl.specialty_id=v_specialty_id
    and wl.status='waiting'
    and p.status='ativo'
    and coalesce(p.deceased,false)=false
  order by wl.priority asc, wl.entered_at asc, wl.id asc
  limit 1;

  if v_waiting_id is not null then
    perform public.capo_criar_notificacao(
      'administrativo_operacional',
      null,
      'waiting_list_vacancy',
      'Vaga disponível na fila',
      'Uma nova vaga foi aberta na especialidade '||
        coalesce(v_specialty_name,'informada')||
        '. Há paciente aguardando na fila.',
      'waiting_list',
      v_waiting_id,
      'alta'
    );
  end if;

  if lower(btrim(coalesce(v_specialty_name,'')))=lower('Psicologia') then
    select q.id
      into v_family_waiting_id
    from public.family_psychology_waiting_list q
    where q.specialty_id=v_specialty_id
      and q.status='waiting'
      and public.capo_family_psychology_ineligible_professional(q.family_link_id)
            is distinct from v_professional_id
    order by q.priority,q.entered_at,q.id
    limit 1;

    if v_family_waiting_id is not null then
      perform public.capo_criar_notificacao(
        'administrativo_operacional',
        null,
        'family_waiting_list_vacancy',
        'Vaga disponível — fila de familiares',
        'Uma nova vaga de Psicologia foi aberta e existe familiar elegível aguardando.',
        'family_psychology_waiting_list',
        v_family_waiting_id,
        'alta'
      );
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_capo_notify_waiting_vacancy_from_agenda_exception
  on public.agenda_exceptions;

create trigger trg_capo_notify_waiting_vacancy_from_agenda_exception
after insert on public.agenda_exceptions
for each row
execute function public.capo_notify_waiting_vacancy_from_agenda_exception();
