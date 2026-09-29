with technical_profile as (
  select
    hc.actor_account_id,
    p.id as professional_id
  from public.homologation_contexts hc
  join public.professionals p
    on p.status='ativo'
   and p.is_professional=true
   and lower(p.full_name) like 'homologação — %'
  join public.professional_specialties ps
    on ps.professional_id=p.id
   and ps.specialty_id=hc.simulated_specialty_id
  where hc.is_enabled=true
    and hc.simulated_role_id=(
      select ar.id
      from public.app_roles ar
      where ar.code='profissional' and ar.is_active=true
      limit 1
    )
)
update public.homologation_contexts hc
set simulated_professional_id=tp.professional_id,
    updated_at=clock_timestamp(),
    reason='Homologação estrutural da especialidade; identidade técnica não define a tela.'
from technical_profile tp
where hc.actor_account_id=tp.actor_account_id;
