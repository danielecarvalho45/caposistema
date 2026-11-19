-- CAPO: encaminhamento interprofissional é tarefa administrativa de agendamento.
-- Preserva histórico, não modifica agendamentos nem encaminhamentos existentes.
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS scheduled_appointment_id uuid REFERENCES public.patient_appointments(id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_scheduled_appointment ON public.referrals(scheduled_appointment_id) WHERE scheduled_appointment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_interprofessional_referrals_for_interface(p_direction text DEFAULT 'all'::text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(referral_id uuid, patient_id uuid, patient_name text, patient_number text, cms text, requesting_professional_id uuid, requesting_professional_name text, origin_specialty_id uuid, origin_specialty_name text, requested_specialty_id uuid, requested_specialty_name text, target_professional_id uuid, target_professional_name text, operational_reason text, response text, status text, direction text, source_appointment_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, approved_at timestamp with time zone, completed_at timestamp with time zone, cancelled_at timestamp with time zone, last_action text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_professional_id uuid;
  v_can_view_all boolean;
  v_direction text := lower(btrim(coalesce(p_direction,'all')));
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select public.capo_effective_professional_id() into v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if not found then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;

  v_can_view_all := public.has_full_access()
    or public.has_app_role('administrativo_operacional')
    ;
  if not v_can_view_all and v_professional_id is null then
    raise exception 'Usuário sem vínculo profissional.' using errcode='42501';
  end if;
  if v_direction not in ('all','sent','received') then
    raise exception 'Direção de encaminhamento inválida.' using errcode='22023';
  end if;
  if p_status is not null and p_status not in (
    'pending_approval','approved','in_progress','completed','rejected','cancelled'
  ) then
    raise exception 'Situação de encaminhamento inválida.' using errcode='22023';
  end if;

  return query
  select r.id,r.patient_id,pt.full_name,pt.patient_number,pt.cms,
    r.requesting_professional_id,rp.full_name,
    r.origin_specialty_id,os.name,r.requested_specialty_id,ds.name,
    r.target_professional_id,tp.full_name,r.reason,r.response,r.status,
    case when r.requesting_professional_id=v_professional_id then 'sent'
         when r.target_professional_id=v_professional_id then 'received'
         else 'managed' end,
    r.source_appointment_id,r.created_at,r.updated_at,r.approved_at,
    r.completed_at,r.cancelled_at,ev.detail,count(*) over()
  from public.referrals r
  join public.patients pt on pt.id=r.patient_id
  join public.professionals rp on rp.id=r.requesting_professional_id
  left join public.specialties os on os.id=r.origin_specialty_id
  left join public.specialties ds on ds.id=r.requested_specialty_id
  left join public.professionals tp on tp.id=r.target_professional_id
  left join lateral (
    select e.detail from public.referral_events e
    where e.referral_id=r.id order by e.created_at desc limit 1
  ) ev on true
  where lower(r.destination)='administrativo'
    and r.requested_specialty_id is not null
    and (p_status is null or r.status=p_status)
    and (v_can_view_all or r.requesting_professional_id=v_professional_id
       )
    and (v_can_view_all or public.capo_patient_visible_in_current_context(r.patient_id))
    and (v_direction='all'
      or (v_direction='sent' and r.requesting_professional_id=v_professional_id)
      or (v_direction='received' and v_can_view_all))
  order by case r.status when 'pending_approval' then 0 when 'approved' then 1
    when 'in_progress' then 2 else 3 end,r.updated_at desc
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_interprofessional_referral_for_interface(p_referral_id uuid, p_action text, p_detail text DEFAULT NULL::text, p_target_professional_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_actor_role text;
  v_referral public.referrals%rowtype;
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_detail text := nullif(btrim(coalesce(p_detail,'')),'');
  v_new_status text;
  v_event_type text;
  v_is_manager boolean;
  v_is_requester boolean;
  v_is_recipient boolean;
  v_requester_user_id uuid;
  v_target_user_id uuid;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then
    raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501';
  end if;
  select ua.id,public.capo_effective_professional_id()
    into v_account_id,v_professional_id
  from public.user_accounts ua
  where ua.auth_user_id=auth.uid() and ua.is_active=true;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;

  if v_action not in ('approve','start','record','complete','reject','cancel') then
    raise exception 'Ação de encaminhamento inválida.' using errcode='22023';
  end if;
  if char_length(coalesce(v_detail,''))>1000 then
    raise exception 'A providência deve possuir no máximo 1000 caracteres.' using errcode='22023';
  end if;
  if v_action in ('record','complete','reject','cancel') and char_length(coalesce(v_detail,''))<5 then
    raise exception 'Informe providência ou justificativa entre 5 e 1000 caracteres.' using errcode='22023';
  end if;

  select * into v_referral from public.referrals r
  where r.id=p_referral_id and r.requested_specialty_id is not null
    and lower(r.destination)='administrativo' for update;
  if v_referral.id is null then raise exception 'Encaminhamento não encontrado.' using errcode='22023'; end if;

  v_is_manager := public.has_full_access() or public.has_app_role('administrativo_operacional');
  v_is_requester := v_professional_id is not null
    and v_referral.requesting_professional_id=v_professional_id;
  v_is_recipient := v_professional_id is not null
    and v_referral.target_professional_id=v_professional_id;

  case v_action
    when 'approve' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode aprovar e atribuir.' using errcode='42501'; end if;
      if v_referral.status<>'pending_approval' then raise exception 'Somente encaminhamento pendente pode ser aprovado.' using errcode='22023'; end if;
      if p_target_professional_id is null or not exists (
        select 1 from public.professionals p
        join public.professional_specialties ps on ps.professional_id=p.id
        join public.user_accounts ua on ua.professional_id=p.id and ua.is_active=true
        where p.id=p_target_professional_id and p.status='ativo' and p.is_professional=true
          and ps.specialty_id=v_referral.requested_specialty_id
      ) then raise exception 'Selecione profissional ativo da especialidade de destino.' using errcode='22023'; end if;
      perform public.ensure_cycle_specialty(
        v_referral.care_cycle_id,v_referral.requested_specialty_id,'encaminhamento',
        v_referral.id,v_account_id,p_target_professional_id
      );
      v_new_status:='approved'; v_event_type:='approved';
    when 'start' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode processar o encaminhamento para agendamento.' using errcode='42501'; end if;
      if v_referral.status<>'approved' then raise exception 'Somente encaminhamento aprovado pode ser iniciado.' using errcode='22023'; end if;
      if p_target_professional_id is not null and p_target_professional_id<>v_referral.target_professional_id then
        raise exception 'O destinatário não pode ser alterado nesta ação.' using errcode='22023';
      end if;
      v_new_status:='in_progress'; v_event_type:='started';
    when 'record' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode registrar providência.' using errcode='42501'; end if;
      if v_referral.status<>'in_progress' then raise exception 'Providências exigem encaminhamento em andamento.' using errcode='22023'; end if;
      v_new_status:='in_progress'; v_event_type:='providence_recorded';
    when 'complete' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode concluir.' using errcode='42501'; end if;
      raise exception 'Conclua este encaminhamento pelo agendamento confirmado na Agenda do CAPO.' using errcode='22023';
      v_new_status:='completed'; v_event_type:='completed';
    when 'reject' then
      if not v_is_manager then raise exception 'Somente o Administrativo pode recusar.' using errcode='42501'; end if;
      if v_referral.status<>'pending_approval' then raise exception 'Somente encaminhamento pendente pode ser recusado.' using errcode='22023'; end if;
      v_new_status:='rejected'; v_event_type:='rejected';
    when 'cancel' then
      if not (v_is_manager or v_is_requester) then raise exception 'Perfil sem autorização para cancelar.' using errcode='42501'; end if;
      if v_referral.status in ('completed','rejected','cancelled') then raise exception 'Encaminhamento já encerrado.' using errcode='22023'; end if;
      if not v_is_manager and v_referral.status<>'pending_approval' then raise exception 'O solicitante só pode cancelar enquanto aguarda aprovação.' using errcode='42501'; end if;
      v_new_status:='cancelled'; v_event_type:='cancelled';
  end case;

  select ar.code into v_actor_role
  from public.user_roles ur join public.app_roles ar on ar.id=ur.role_id
  where ur.user_account_id=v_account_id
  order by ur.is_primary desc,ar.code limit 1;

  update public.referrals
  set status=v_new_status,
      target_professional_id=case when v_action='approve' then p_target_professional_id else target_professional_id end,
      target_specialty_id=case when v_action='approve' then requested_specialty_id else target_specialty_id end,
      response=case when v_action in ('record','complete','reject','cancel') then v_detail else response end,
      approved_at=case when v_action='approve' then v_now else approved_at end,
      completed_at=case when v_action='complete' then v_now else completed_at end,
      cancelled_at=case when v_action='cancel' then v_now else cancelled_at end,
      updated_at=v_now
  where id=p_referral_id;

  insert into public.referral_events(
    referral_id,event_type,from_status,to_status,detail,
    actor_user_account_id,actor_role,created_at
  ) values (
    p_referral_id,v_event_type,v_referral.status,v_new_status,v_detail,
    v_account_id,v_actor_role,v_now
  );

  select ua.auth_user_id into v_requester_user_id
  from public.user_accounts ua
  where ua.professional_id=v_referral.requesting_professional_id and ua.is_active=true limit 1;

  if v_action='approve' then
    if v_requester_user_id is not null then
      perform public.capo_criar_notificacao(null,v_requester_user_id,'referral_approved',
        'Encaminhamento aprovado','Seu encaminhamento foi aprovado e atribuído ao destinatário.',
        'referrals',p_referral_id,'normal');
    end if;
  elsif v_action='start' and v_requester_user_id is not null then
    perform public.capo_criar_notificacao(null,v_requester_user_id,'referral_started',
      'Encaminhamento em andamento','O destinatário iniciou o encaminhamento.',
      'referrals',p_referral_id,'normal');
  elsif v_action in ('reject','cancel') and v_requester_user_id is not null then
    perform public.capo_criar_notificacao(null,v_requester_user_id,
      case when v_action='reject' then 'referral_rejected' else 'referral_cancelled' end,
      case when v_action='reject' then 'Encaminhamento recusado' else 'Encaminhamento cancelado' end,
      coalesce(v_detail,'Consulte o encaminhamento para mais informações.'),
      'referrals',p_referral_id,'normal');
  end if;

  return jsonb_build_object(
    'success',true,'referral_id',p_referral_id,'action',v_action,
    'previous_status',v_referral.status,'status',v_new_status,'updated_at',v_now
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_interprofessional_referral_scheduling_for_interface(p_referral_id uuid, p_appointment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth','pg_temp'
AS $function$
DECLARE
 v_account_id uuid;
 v_referral public.referrals%rowtype;
 v_ap public.patient_appointments%rowtype;
 v_requester_auth uuid;
 v_now timestamptz := clock_timestamp();
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_accepted_current_legal_term(),false) THEN
   RAISE EXCEPTION 'Sessão ou termo inválido.' USING errcode='42501';
 END IF;
 SELECT ua.id INTO v_account_id FROM public.user_accounts ua
 WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true LIMIT 1;
 IF v_account_id IS NULL OR NOT (public.has_full_access() OR public.has_app_role('administrativo_operacional')) THEN
   RAISE EXCEPTION 'Somente Gestor ou Administrativo Operacional pode concluir o agendamento.' USING errcode='42501';
 END IF;
 SELECT * INTO v_referral FROM public.referrals WHERE id=p_referral_id FOR UPDATE;
 IF v_referral.id IS NULL OR lower(v_referral.destination)<>'administrativo' OR v_referral.requested_specialty_id IS NULL THEN
   RAISE EXCEPTION 'Encaminhamento interprofissional não localizado.' USING errcode='22023';
 END IF;
 IF v_referral.scheduled_appointment_id IS NOT NULL THEN
   IF v_referral.scheduled_appointment_id=p_appointment_id THEN
     RETURN jsonb_build_object('success',true,'referral_id',p_referral_id,'status',v_referral.status,'already_linked',true);
   END IF;
   RAISE EXCEPTION 'Encaminhamento já vinculado a outra consulta.' USING errcode='23505';
 END IF;
 IF v_referral.status NOT IN ('approved','in_progress') THEN
   RAISE EXCEPTION 'Somente encaminhamento aprovado pode receber agendamento.' USING errcode='22023';
 END IF;
 SELECT * INTO v_ap FROM public.patient_appointments WHERE id=p_appointment_id;
 IF v_ap.id IS NULL OR v_ap.patient_id<>v_referral.patient_id
    OR v_ap.professional_id<>v_referral.target_professional_id
    OR v_ap.care_cycle_id IS DISTINCT FROM v_referral.care_cycle_id
    OR v_ap.attendance_status NOT IN ('agendado','confirmado')
    OR v_ap.created_at<v_referral.approved_at THEN
   RAISE EXCEPTION 'Agendamento incompatível com paciente, destino ou aprovação do encaminhamento.' USING errcode='22023';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.professional_specialties ps WHERE ps.professional_id=v_ap.professional_id AND ps.specialty_id=v_referral.requested_specialty_id) THEN
   RAISE EXCEPTION 'Especialidade do profissional incompatível com encaminhamento.' USING errcode='22023';
 END IF;
 UPDATE public.referrals SET status='completed',scheduled_appointment_id=p_appointment_id,completed_at=v_now,updated_at=v_now
 WHERE id=p_referral_id;
 INSERT INTO public.referral_events(referral_id,event_type,from_status,to_status,detail,actor_user_account_id,actor_role,created_at)
 VALUES(p_referral_id,'completed',v_referral.status,'completed','Agendamento confirmado na Agenda CAPO: '||p_appointment_id::text,v_account_id,'administrativo_operacional',v_now);
 SELECT ua.auth_user_id INTO v_requester_auth FROM public.user_accounts ua
 WHERE ua.professional_id=v_referral.requesting_professional_id AND ua.is_active=true LIMIT 1;
 IF v_requester_auth IS NOT NULL THEN
  PERFORM public.capo_criar_notificacao(null,v_requester_auth,'referral_scheduled',
   'Agendamento do encaminhamento realizado','A solicitação encaminhada foi agendada. Consulte o histórico.',
   'referrals',p_referral_id,'normal');
 END IF;
 RETURN jsonb_build_object('success',true,'referral_id',p_referral_id,'status','completed','appointment_id',p_appointment_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_interprofessional_referral_scheduling_for_interface(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_interprofessional_referral_scheduling_for_interface(uuid,uuid) TO authenticated;
