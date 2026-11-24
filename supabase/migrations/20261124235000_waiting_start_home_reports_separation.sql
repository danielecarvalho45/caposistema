-- Contadores e relatórios: um cadastro ativo pode ter ciclo encerrado administrativamente.
-- Aguardando início aparece separado dos ativos em acompanhamento. Mantém registro no total cadastrado.
CREATE OR REPLACE FUNCTION public.get_home_patient_status_counts_for_interface()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_is_test boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode='42501';
  end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  if not public.has_app_role('administrador') then
    raise exception 'Perfil sem autorização para os indicadores de pacientes.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.user_accounts ua
    where ua.auth_user_id=auth.uid() and ua.is_active=true
  ) then
    raise exception 'Conta ativa não encontrada.' using errcode='42501';
  end if;
  v_is_test := coalesce(public.capo_is_homologation_account(), false);
  with awaiting as (
    select distinct s.patient_id
    from public.patient_active_searches s
    where s.search_type in ('initial','offer_rescue')
      and s.flow_status='ativo'
      and s.closed_at is null
      and s.accepted_service is distinct from true
  ),
  classified as (
    select
      p.id,
      p.status,
      coalesce(p.deceased,false) as deceased,
      (a.patient_id is not null) as waiting,
      exists (
        select 1 from public.patient_care_cycle_waiting_start ws
        join public.patient_care_cycles wc on wc.id=ws.care_cycle_id
        where ws.patient_id=p.id and wc.status='encerrado'
          and not exists(select 1 from public.patient_care_cycles ac
                         where ac.patient_id=p.id and ac.status in ('ativo','encerramento_em_andamento'))
      ) as awaiting_start
    from public.patients p
    left join awaiting a on a.patient_id=p.id
    where coalesce(p.is_test,false)=v_is_test
  )
  select jsonb_build_object(
    'registered', count(*),
    'active', count(*) filter(where status='ativo' and not deceased and not waiting and not awaiting_start),
    'awaiting_response', count(*) filter(where status='ativo' and not deceased and waiting and not awaiting_start),
    'awaiting_start', count(*) filter(where status='ativo' and not deceased and awaiting_start),
    'closed', count(*) filter(where status in ('encerrado','inativo','obito') or deceased),
    'scope', case when v_is_test then 'homologation' else 'production' end
  ) into v_result
  from classified;
  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_reports_dashboard_for_interface(p_start_date date, p_end_date date, p_specialty_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid; v_role_code text; v_specialty_name text;
  v_start_ts timestamptz; v_end_ts timestamptz;
  v_specialty_options jsonb:='[]'::jsonb; v_patients jsonb:='{}'::jsonb; v_agenda jsonb:='{}'::jsonb; v_agenda_by_specialty jsonb:='[]'::jsonb;
  v_active_search jsonb:='{}'::jsonb; v_no_show_followup jsonb:='{}'::jsonb; v_waiting jsonb:='{}'::jsonb; v_admin_requests jsonb:='{}'::jsonb;
  v_referrals jsonb:='{}'::jsonb; v_dentistry jsonb:='{}'::jsonb; v_transport jsonb:='{}'::jsonb; v_closures jsonb:='{}'::jsonb;
  v_social jsonb:='{}'::jsonb; v_renewals jsonb:='{}'::jsonb; v_nutrition jsonb:='{}'::jsonb; v_families jsonb:='{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if p_start_date is null or p_end_date is null then raise exception 'Período inicial e final são obrigatórios.' using errcode='22023'; end if;
  if p_end_date<p_start_date then raise exception 'Período inválido: data final anterior à data inicial.' using errcode='22023'; end if;
  select ua.id into v_account_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select case
              when exists(
                select 1
                from public.homologation_contexts hc
                join public.user_accounts hua on hua.id=hc.actor_account_id
                join public.app_roles har on har.id=hc.simulated_role_id and har.is_active=true
                where hc.actor_account_id=v_account_id
                  and hua.is_homologation_account=true
                  and hc.is_enabled=true
                  and har.code='coordenador'
              ) then 'coordenador'
              when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='administrador') then 'administrador'
              when exists(select 1 from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id where ur.user_account_id=v_account_id and ar.is_active=true and ar.code='coordenador') then 'coordenador'
              else null
            end into v_role_code;
  if v_role_code is null then raise exception 'Perfil sem autorização para Relatórios gerenciais do CAPO.' using errcode='42501'; end if;
  if p_specialty_id is not null then select s.name into v_specialty_name from public.specialties s where s.id=p_specialty_id and s.is_active=true; if v_specialty_name is null then raise exception 'Especialidade inválida ou inativa.' using errcode='22023'; end if; end if;
  v_start_ts:=p_start_date::timestamp at time zone 'America/Sao_Paulo'; v_end_ts:=(p_end_date+1)::timestamp at time zone 'America/Sao_Paulo';
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name),'[]'::jsonb) into v_specialty_options from public.specialties s where s.is_active=true;

  select jsonb_build_object('total_current',count(*),'registered_period',count(*) filter(where p.created_at>=v_start_ts and p.created_at<v_end_ts),'active_current',count(*) filter(where p.status='ativo' and coalesce(p.deceased,false)=false and not exists (
  select 1 from public.patient_care_cycle_waiting_start ws
  where ws.patient_id=p.id
    and not exists(select 1 from public.patient_care_cycles ac
      where ac.patient_id=p.id and ac.status in ('ativo','encerramento_em_andamento'))
)),'deaths_period',count(*) filter(where coalesce(p.deceased,false)=true and p.death_date between p_start_date and p_end_date)) into v_patients
  from public.patients p where not coalesce(p.is_test,false);

  with appt as (
    select pa.attendance_status,pa.appointment_type,
           coalesce(pa.specialty_id,sp.specialty_id) as resolved_specialty_id,
           coalesce(sd.name,sp.specialty_name) as resolved_specialty_name
    from public.patient_appointments pa
    left join public.specialties sd on sd.id=pa.specialty_id and sd.is_active=true
    left join lateral (select s.id specialty_id,s.name specialty_name from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id and s.is_active=true where ps.professional_id=pa.professional_id order by ps.is_primary desc,s.name,s.id limit 1) sp on pa.specialty_id is null
    where pa.appointment_date>=v_start_ts and pa.appointment_date<v_end_ts
      and public.capo_patient_is_production(pa.patient_id)
      and (p_specialty_id is null or coalesce(pa.specialty_id,sp.specialty_id)=p_specialty_id)
  ), agg as (
    select count(*) total_period,count(*) filter(where attendance_status not in ('cancelado','remarcado')) valid_period,count(*) filter(where attendance_status='agendado') scheduled_period,count(*) filter(where attendance_status='confirmado') confirmed_period,count(*) filter(where attendance_status='realizado') realized_period,count(*) filter(where attendance_status='faltou') no_show_period,count(*) filter(where attendance_status='cancelado') cancelled_period,count(*) filter(where attendance_status='remarcado') rescheduled_period,count(*) filter(where appointment_type='retorno' and attendance_status not in ('cancelado','remarcado')) returns_period,count(*) filter(where attendance_status in ('realizado','faltou')) absenteeism_denominator from appt
  )
  select jsonb_build_object('total_period',a.total_period,'valid_period',a.valid_period,'scheduled_period',a.scheduled_period,'confirmed_period',a.confirmed_period,'realized_period',a.realized_period,'no_show_period',a.no_show_period,'cancelled_period',a.cancelled_period,'rescheduled_period',a.rescheduled_period,'returns_period',a.returns_period,'absenteeism_numerator',a.no_show_period,'absenteeism_denominator',a.absenteeism_denominator,'absenteeism_rate_pct',case when a.absenteeism_denominator=0 then 0::numeric else round((100.0*a.no_show_period/a.absenteeism_denominator)::numeric,2) end) into v_agenda from agg a;

  with appt as (
    select pa.attendance_status,pa.appointment_type,
           coalesce(pa.specialty_id,sp.specialty_id) as resolved_specialty_id,
           coalesce(sd.name,sp.specialty_name) as resolved_specialty_name
    from public.patient_appointments pa
    left join public.specialties sd on sd.id=pa.specialty_id and sd.is_active=true
    left join lateral (select s.id specialty_id,s.name specialty_name from public.professional_specialties ps join public.specialties s on s.id=ps.specialty_id and s.is_active=true where ps.professional_id=pa.professional_id order by ps.is_primary desc,s.name,s.id limit 1) sp on pa.specialty_id is null
    where pa.appointment_date>=v_start_ts and pa.appointment_date<v_end_ts and public.capo_patient_is_production(pa.patient_id) and (p_specialty_id is null or coalesce(pa.specialty_id,sp.specialty_id)=p_specialty_id)
  ), grouped as (
    select resolved_specialty_id as specialty_id,coalesce(resolved_specialty_name,'Sem especialidade definida') specialty_name,count(*) filter(where attendance_status not in ('cancelado','remarcado')) valid_period,count(*) filter(where attendance_status='realizado') realized_period,count(*) filter(where attendance_status='faltou') no_show_period,count(*) filter(where appointment_type='retorno' and attendance_status not in ('cancelado','remarcado')) returns_period,count(*) filter(where attendance_status in ('realizado','faltou')) absenteeism_denominator from appt group by resolved_specialty_id,resolved_specialty_name
  )
  select coalesce(jsonb_agg(jsonb_build_object('specialty_id',g.specialty_id,'specialty_name',g.specialty_name,'valid_period',g.valid_period,'realized_period',g.realized_period,'no_show_period',g.no_show_period,'returns_period',g.returns_period,'absenteeism_denominator',g.absenteeism_denominator,'absenteeism_rate_pct',case when g.absenteeism_denominator=0 then 0::numeric else round((100.0*g.no_show_period/g.absenteeism_denominator)::numeric,2) end) order by g.specialty_name),'[]'::jsonb) into v_agenda_by_specialty from grouped g;

  with ranked as (select pas.patient_id,pas.flow_status,row_number() over(partition by pas.patient_id order by pas.contact_date desc,pas.created_at desc,pas.id desc) rn from public.patient_active_searches pas where pas.search_type='initial' and public.capo_patient_is_production(pas.patient_id))
  select jsonb_build_object('open_flows_current',(select count(*) from ranked where rn=1 and flow_status='ativo'),'attempts_period',(select count(*) from public.patient_active_searches pas where pas.search_type='initial' and public.capo_patient_is_production(pas.patient_id) and pas.contact_date>=v_start_ts and pas.contact_date<v_end_ts),'closed_flows_period',(select count(distinct pas.patient_id) from public.patient_active_searches pas where pas.search_type='initial' and public.capo_patient_is_production(pas.patient_id) and pas.closed_at>=v_start_ts and pas.closed_at<v_end_ts)) into v_active_search;

  select jsonb_build_object('open_current',count(*) filter(where ns.active_search_status<>'encerrado'),'rescheduling_requested_period',count(*) filter(where ns.reschedule_requested_at>=v_start_ts and ns.reschedule_requested_at<v_end_ts)) into v_no_show_followup from public.patient_no_show_followups ns where public.capo_patient_is_production(ns.patient_id);
  select jsonb_build_object('active_current',count(*) filter(where wl.status in ('waiting','paused','called')),'waiting_current',count(*) filter(where wl.status='waiting'),'entries_period',count(*) filter(where wl.entered_at>=v_start_ts and wl.entered_at<v_end_ts),'called_period',count(*) filter(where wl.called_at>=v_start_ts and wl.called_at<v_end_ts),'scheduled_period',count(*) filter(where wl.scheduled_at>=v_start_ts and wl.scheduled_at<v_end_ts),'removed_period',count(*) filter(where wl.removed_at>=v_start_ts and wl.removed_at<v_end_ts)) into v_waiting from public.waiting_list wl where public.capo_patient_is_production(wl.patient_id);
  select jsonb_build_object('open_current',count(*) filter(where ar.status in ('pending','in_progress')),'created_period',count(*) filter(where ar.created_at>=v_start_ts and ar.created_at<v_end_ts),'completed_period',count(*) filter(where ar.completed_at>=v_start_ts and ar.completed_at<v_end_ts),'cancelled_period',count(*) filter(where ar.cancelled_at>=v_start_ts and ar.cancelled_at<v_end_ts)) into v_admin_requests from public.administrative_requests ar where public.capo_patient_is_production(ar.patient_id);
  select jsonb_build_object('open_current',count(*) filter(where r.status in ('pending_approval','approved','in_progress')),'rejected_current',count(*) filter(where r.status='rejected'),'created_period',count(*) filter(where r.created_at>=v_start_ts and r.created_at<v_end_ts),'approved_period',count(*) filter(where r.approved_at>=v_start_ts and r.approved_at<v_end_ts),'completed_period',count(*) filter(where r.completed_at>=v_start_ts and r.completed_at<v_end_ts),'cancelled_period',count(*) filter(where r.cancelled_at>=v_start_ts and r.cancelled_at<v_end_ts)) into v_referrals from public.referrals r where public.capo_patient_is_production(r.patient_id);
  select jsonb_build_object('open_current',count(*) filter(where r.status in ('pending_approval','approved','in_progress')),'rejected_current',count(*) filter(where r.status='rejected'),'created_period',count(*) filter(where r.created_at>=v_start_ts and r.created_at<v_end_ts),'completed_period',count(*) filter(where r.completed_at>=v_start_ts and r.completed_at<v_end_ts),'cancelled_period',count(*) filter(where r.cancelled_at>=v_start_ts and r.cancelled_at<v_end_ts)) into v_dentistry from public.referrals r where public.capo_patient_is_production(r.patient_id) and lower(btrim(r.destination)) in ('odontologia','odontologia - prefeitura','odontologia - secretaria municipal de saúde','odontologia - secretaria municipal de saude');

  select jsonb_build_object(
    'need_active_current',(select count(*) from public.transport_need_cycles x where public.capo_patient_is_production(x.patient_id) and x.status='ativo'),
    'need_started_period',(select count(*) from public.transport_need_cycles x where public.capo_patient_is_production(x.patient_id) and x.started_at>=v_start_ts and x.started_at<v_end_ts),
    'need_cancellation_requested_period',(select count(*) from public.transport_need_cycles x where public.capo_patient_is_production(x.patient_id) and x.cancellation_requested_at>=v_start_ts and x.cancellation_requested_at<v_end_ts),
    'need_closed_period',(select count(*) from public.transport_need_cycles x where public.capo_patient_is_production(x.patient_id) and x.closed_at>=v_start_ts and x.closed_at<v_end_ts),
    'requested_period',(select count(*) from public.transport_requests x where public.capo_patient_is_production(x.patient_id) and x.requested_at>=v_start_ts and x.requested_at<v_end_ts),
    'confirmed_period',(select count(*) from public.transport_requests x where public.capo_patient_is_production(x.patient_id) and x.confirmed_at>=v_start_ts and x.confirmed_at<v_end_ts),
    'external_forwarded_period',(select count(*) from public.transport_requests x where public.capo_patient_is_production(x.patient_id) and x.external_forwarded_at>=v_start_ts and x.external_forwarded_at<v_end_ts),
    'completed_period',(select count(*) from public.transport_requests x where public.capo_patient_is_production(x.patient_id) and x.completed_at>=v_start_ts and x.completed_at<v_end_ts),
    'cancelled_period',(select count(*) from public.transport_requests x where public.capo_patient_is_production(x.patient_id) and x.cancelled_at>=v_start_ts and x.cancelled_at<v_end_ts)) into v_transport;

  select jsonb_build_object(
    'pending_current',(select count(*) from public.patient_care_closures x where public.capo_patient_is_production(x.patient_id) and x.status='pendente'),
    'initiated_period',(select count(*) from public.patient_care_closures x where public.capo_patient_is_production(x.patient_id) and x.initiated_at>=v_start_ts and x.initiated_at<v_end_ts),
    'closed_period',(select count(*) from public.patient_care_closures x where public.capo_patient_is_production(x.patient_id) and x.closed_at>=v_start_ts and x.closed_at<v_end_ts),
    'reopened_period',(select count(*) from public.patient_care_closures x where public.capo_patient_is_production(x.patient_id) and x.reopened_at>=v_start_ts and x.reopened_at<v_end_ts),
    'reopening_requests_period',(select count(*) from public.patient_reopening_requests x where public.capo_patient_is_production(x.patient_id) and x.requested_at>=v_start_ts and x.requested_at<v_end_ts),
    'reopening_approved_period',(select count(*) from public.patient_reopening_requests x where public.capo_patient_is_production(x.patient_id) and x.status='aprovada' and x.reviewed_at>=v_start_ts and x.reviewed_at<v_end_ts),
    'reopening_denied_period',(select count(*) from public.patient_reopening_requests x where public.capo_patient_is_production(x.patient_id) and x.status='negada' and x.reviewed_at>=v_start_ts and x.reviewed_at<v_end_ts)) into v_closures;

  select jsonb_build_object('active_current',count(*) filter(where s.status='ativo'),'started_period',count(*) filter(where s.started_at>=v_start_ts and s.started_at<v_end_ts),'closed_period',count(*) filter(where s.closed_at>=v_start_ts and s.closed_at<v_end_ts)) into v_social from public.social_followup_cycles s where public.capo_patient_is_production(s.patient_id);
  select jsonb_build_object('in_flow_current',count(*) filter(where r.status in ('awaiting_medical','medical_in_progress','awaiting_admin')),'requested_period',count(*) filter(where r.requested_at>=v_start_ts and r.requested_at<v_end_ts),'completed_period',count(*) filter(where r.completed_at>=v_start_ts and r.completed_at<v_end_ts),'cancelled_period',count(*) filter(where r.cancelled_at>=v_start_ts and r.cancelled_at<v_end_ts)) into v_renewals from public.prescription_renewal_requests r where public.capo_patient_is_production(r.patient_id);

  select jsonb_build_object(
    'documents_generated_period',(select count(*) from public.nutrition_plan_documents d where public.capo_patient_is_production(d.patient_id) and d.created_at>=v_start_ts and d.created_at<v_end_ts),
    'deliveries_registered_period',(select count(*) from public.nutrition_document_deliveries dl join public.nutrition_plan_documents d on d.id=dl.document_id where public.capo_patient_is_production(d.patient_id) and dl.requested_at>=v_start_ts and dl.requested_at<v_end_ts),
    'admin_deliveries_open_current',(select count(*) from public.nutrition_document_deliveries dl join public.nutrition_plan_documents d on d.id=dl.document_id where public.capo_patient_is_production(d.patient_id) and dl.mode='administrativo' and dl.status in ('pending','in_progress')),
    'deliveries_completed_period',(select count(*) from public.nutrition_document_deliveries dl join public.nutrition_plan_documents d on d.id=dl.document_id where public.capo_patient_is_production(d.patient_id) and dl.completed_at>=v_start_ts and dl.completed_at<v_end_ts),
    'deliveries_cancelled_period',(select count(*) from public.nutrition_document_deliveries dl join public.nutrition_plan_documents d on d.id=dl.document_id where public.capo_patient_is_production(d.patient_id) and dl.cancelled_at>=v_start_ts and dl.cancelled_at<v_end_ts)) into v_nutrition;

  select jsonb_build_object('active_links_current',count(*) filter(where f.unlinked_at is null),'linked_period',count(*) filter(where f.linked_at>=v_start_ts and f.linked_at<v_end_ts),'unlinked_period',count(*) filter(where f.unlinked_at>=v_start_ts and f.unlinked_at<v_end_ts)) into v_families from public.patient_family_links f where public.capo_patient_is_production(f.patient_id);

  return jsonb_build_object('meta',jsonb_build_object('scope','management','role_code',v_role_code,'timezone','America/Sao_Paulo','start_date',p_start_date,'end_date',p_end_date,'specialty_filter_id',p_specialty_id,'specialty_filter_name',v_specialty_name,'specialty_filter_applies_to','agenda_absenteeism_only','homologation_data_excluded',true,'generated_at',now()),'specialty_options',v_specialty_options,'patients',v_patients,'agenda',v_agenda,'agenda_by_specialty',v_agenda_by_specialty,'active_search',v_active_search,'no_show_followup',v_no_show_followup,'waiting_list',v_waiting,'administrative_requests',v_admin_requests,'referrals',v_referrals,'dentistry',v_dentistry,'transport',v_transport,'closures',v_closures,'social',v_social,'prescription_renewal',v_renewals,'nutrition',v_nutrition,'family_links',v_families);
end;
$function$
;
