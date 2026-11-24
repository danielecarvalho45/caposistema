-- REGRA AUTORIZADA 24/11/2026: encerramento administrativo de aceite CAPO sem atendimento.
-- Cadastro permanece ativo; ciclo e especialidades sem atividade são encerrados e auditados.
create table if not exists public.patient_care_cycle_waiting_start (
 care_cycle_id uuid primary key references public.patient_care_cycles(id) on delete restrict,
 patient_id uuid not null references public.patients(id) on delete restrict,
 reason text not null check (char_length(btrim(reason)) between 5 and 1000),
 recorded_at timestamptz not null default clock_timestamp(),
 recorded_by uuid not null references public.user_accounts(id) on delete restrict,
 unique(patient_id,care_cycle_id)
);
create index if not exists patient_care_cycle_waiting_start_patient_idx on public.patient_care_cycle_waiting_start(patient_id);
alter table public.patient_care_cycle_waiting_start enable row level security;
revoke all on table public.patient_care_cycle_waiting_start from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.close_unstarted_accepted_care_cycle_for_interface(p_patient_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
 v_account uuid;
 v_cycle public.patient_care_cycles%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_reason text:=btrim(coalesce(p_reason,''));
 v_count int;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false) then
   raise exception 'Sessão ou termo legal inválido.' using errcode='42501';
 end if;
 select ua.id into v_account from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
 if v_account is null or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')) then
   raise exception 'Somente Gestor/Titular ou Administrativo autorizado pode encerrar ciclo sem início.' using errcode='42501';
 end if;
 if char_length(v_reason)<5 or char_length(v_reason)>1000 then
   raise exception 'Informe a decisão de aguardar, com motivo entre 5 e 1000 caracteres.' using errcode='22023';
 end if;
 perform 1 from public.patients p where p.id=p_patient_id and p.status='ativo' and not coalesce(p.deceased,false) for update;
 if not found then raise exception 'Cadastro deve permanecer ativo e paciente vivo.' using errcode='22023'; end if;
 perform public.capo_assert_patient_write_context(p_patient_id);
 select c.* into v_cycle from public.patient_care_cycles c
 where c.patient_id=p_patient_id and c.status in ('ativo','encerramento_em_andamento')
 order by c.cycle_number desc limit 1 for update;
 if v_cycle.id is null then raise exception 'Não há ciclo ativo para encerramento administrativo.' using errcode='22023'; end if;
 if v_cycle.opening_type<>'initial_acceptance' then
   raise exception 'Opção exclusiva do ciclo originado por aceite da Oferta CAPO.' using errcode='22023';
 end if;
 if not exists (
   select 1 from public.patient_active_searches s
   where s.patient_id=p_patient_id and s.accepted_service=true and s.search_type in ('initial','offer_rescue')
 ) then
   raise exception 'Não há aceite da Oferta CAPO registrado para este paciente.' using errcode='22023';
 end if;
 if exists (select 1 from public.patient_appointments a where a.care_cycle_id=v_cycle.id
     and a.attendance_status not in ('cancelado','remarcado')) then
   raise exception 'Existe consulta ativa, falta ou atendimento no ciclo. Regularize a agenda antes do encerramento.' using errcode='22023';
 end if;
 if exists (select 1 from public.patient_care_closures cl
   join public.patient_care_cycle_specialties cs on cs.id=cl.cycle_specialty_id
   where cs.care_cycle_id=v_cycle.id) then
   raise exception 'Existe registro de encerramento por especialidade; este fluxo não pode substituir ato profissional.' using errcode='22023';
 end if;
 if exists(select 1 from public.patient_care_cycle_specialties cs where cs.care_cycle_id=v_cycle.id and cs.status<>'ativa') then
   raise exception 'Há especialidade com encerramento ou situação profissional em andamento.' using errcode='22023';
 end if;
 -- Registrar antes da mudança de ciclo, em uma única transação, sem tocar no cadastro.
 insert into public.patient_care_cycle_waiting_start(care_cycle_id,patient_id,reason,recorded_at,recorded_by)
 values(v_cycle.id,p_patient_id,v_reason,v_now,v_account);
 update public.patient_care_cycle_specialties cs
 set status='encerrada', resolution_type='operational_withdrawal', resolution_reason=v_reason,
     resolved_at=v_now,resolved_by=v_account,updated_at=v_now
 where cs.care_cycle_id=v_cycle.id and cs.status='ativa';
 update public.patient_care_cycles c
 set status='encerrado',completed_at=v_now,updated_at=v_now
 where c.id=v_cycle.id;
 return jsonb_build_object('success',true,'patient_id',p_patient_id,'care_cycle_id',v_cycle.id,
   'cycle_status','encerrado','patient_registration_status','ativo',
   'operational_status','aguardando_inicio','completed_at',v_now);
end;
$function$
;
revoke all on function public.close_unstarted_accepted_care_cycle_for_interface(uuid,text) from public,anon;
grant execute on function public.close_unstarted_accepted_care_cycle_for_interface(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.get_patient_waiting_start_for_interface(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare v_wait record;
begin
 if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
    or not exists(select 1 from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true)
 then raise exception 'Sessão ou conta sem autorização.' using errcode='42501'; end if;
 if not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador') or public.has_app_role('profissional')) then
   raise exception 'Perfil sem autorização.' using errcode='42501';
 end if;
 if not public.capo_patient_visible_in_current_context(p_patient_id) then raise exception 'Paciente fora do contexto autorizado.' using errcode='42501'; end if;
 if public.has_app_role('profissional')
   and not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador'))
   and not exists(
     select 1 from public.patient_care_cycles c
     join public.patient_care_cycle_specialties cs on cs.care_cycle_id=c.id
     where c.patient_id=p_patient_id and cs.current_responsible_professional_id=public.capo_effective_professional_id()
   ) and not exists(
     select 1 from public.patient_appointments a
     where a.patient_id=p_patient_id and a.professional_id=public.capo_effective_professional_id()
   )
 then raise exception 'Paciente sem vínculo assistencial autorizado.' using errcode='42501'; end if;
 select w.care_cycle_id,w.recorded_at into v_wait from public.patient_care_cycle_waiting_start w
 join public.patient_care_cycles c on c.id=w.care_cycle_id
 join public.patients p on p.id=w.patient_id
 where w.patient_id=p_patient_id and c.status='encerrado' and p.status='ativo' and not coalesce(p.deceased,false)
 and not exists(select 1 from public.patient_care_cycles active where active.patient_id=w.patient_id and active.status in ('ativo','encerramento_em_andamento'))
 order by w.recorded_at desc limit 1;
 return jsonb_build_object('waiting_start',v_wait.care_cycle_id is not null,
   'care_cycle_id',v_wait.care_cycle_id,'recorded_at',v_wait.recorded_at);
end;
$function$
;
revoke all on function public.get_patient_waiting_start_for_interface(uuid) from public,anon;
grant execute on function public.get_patient_waiting_start_for_interface(uuid) to authenticated;
