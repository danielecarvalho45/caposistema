create or replace function public.get_homologation_options_for_interface()
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_is_homologation boolean;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;

  select ua.id,ua.is_homologation_account into v_account_id,v_is_homologation
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true
  limit 1;

  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not coalesce(v_is_homologation,false) then raise exception 'Conta sem autorização de homologação.' using errcode='42501'; end if;

  return jsonb_build_object(
    'roles',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ar.id,'code',ar.code,'name',ar.name,
        'requires_professional',(ar.code='profissional')
      ) order by ar.name)
      from public.app_roles ar
      where ar.is_active=true
    ),'[]'::jsonb),
    'professionals',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,
        'name',p.full_name,
        'function_title',p.function_title,
        'is_professional',p.is_professional,
        'has_active_agenda',exists(
          select 1 from public.agenda_configs ac
          where ac.professional_id=p.id and ac.is_active=true
        ),
        'is_homologation_stub',lower(p.full_name) like 'homologação — %',
        'specialties',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',s.id,'name',s.name,'is_primary',ps.is_primary
          ) order by ps.is_primary desc,s.name)
          from public.professional_specialties ps
          join public.specialties s on s.id=ps.specialty_id and s.is_active=true
          where ps.professional_id=p.id
        ),'[]'::jsonb)
      ) order by
        case when lower(p.full_name) like 'homologação — %' then 1 else 0 end,
        case when exists(
          select 1 from public.agenda_configs ac
          where ac.professional_id=p.id and ac.is_active=true
        ) then 0 else 1 end,
        p.full_name)
      from public.professionals p
      where p.status='ativo' and p.is_professional=true
    ),'[]'::jsonb),
    'specialties',coalesce((
      select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name)
      from public.specialties s
      where s.is_active=true
    ),'[]'::jsonb),
    'test_patients',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.full_name,'patient_number',p.patient_number,
        'cms',p.cms,'test_label',p.test_label
      ) order by p.full_name)
      from public.patients p
      where p.is_test=true
    ),'[]'::jsonb)
  );
end;
$function$;

with replacement as (
  select
    hc.actor_account_id,
    candidate.id as professional_id
  from public.homologation_contexts hc
  join public.professionals current_professional
    on current_professional.id=hc.simulated_professional_id
  join lateral (
    select p.id
    from public.professionals p
    join public.professional_specialties ps
      on ps.professional_id=p.id
     and ps.specialty_id=hc.simulated_specialty_id
    where p.status='ativo'
      and p.is_professional=true
      and lower(p.full_name) not like 'homologação — %'
    order by
      case when exists (
        select 1 from public.agenda_configs ac
        where ac.professional_id=p.id and ac.is_active=true
      ) then 0 else 1 end,
      p.full_name
    limit 1
  ) candidate on true
  where hc.is_enabled=true
    and lower(current_professional.full_name) like 'homologação — %'
)
update public.homologation_contexts hc
set simulated_professional_id=r.professional_id,
    updated_at=clock_timestamp(),
    reason='Homologação vinculada a profissional real já cadastrado da especialidade.'
from replacement r
where hc.actor_account_id=r.actor_account_id;
