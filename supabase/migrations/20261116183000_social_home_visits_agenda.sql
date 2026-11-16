-- CAPO — Visita domiciliar da Assistência Social; sem obrigatoriedade de pacientes.
-- Bloqueios continuam na agenda oficial; pacientes em tabela vinculada, sem
-- criar consulta na unidade. Inclusões/remoções preservadas no histórico.
ALTER TABLE public.agenda_blocks DROP CONSTRAINT agenda_blocks_block_type_check;
ALTER TABLE public.agenda_blocks ADD CONSTRAINT agenda_blocks_block_type_check
CHECK (block_type = ANY (ARRAY[
 'intervalo','alimentacao','estudo_caso','atendimento_online',
 'rotina_administrativa','atividade','bloqueio','reuniao','relatorio',
 'outro','visita_domiciliar'
]::text[]));

CREATE TABLE IF NOT EXISTS public.social_home_visit_patients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 block_id uuid NOT NULL REFERENCES public.agenda_blocks(id) ON DELETE RESTRICT,
 patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
 visit_time time,
 status text NOT NULL DEFAULT 'programada'
   CHECK (status IN ('programada','realizada','nao_realizada','cancelada')),
 is_active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL,
 updated_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (block_id,patient_id)
);
CREATE INDEX IF NOT EXISTS social_home_visit_patients_block_idx
  ON public.social_home_visit_patients(block_id);
ALTER TABLE public.social_home_visit_patients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_home_visit_patients FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.manage_social_home_visits_for_interface(
 p_action text,
 p_professional_id uuid DEFAULT NULL,
 p_block_id uuid DEFAULT NULL,
 p_date date DEFAULT NULL,
 p_start_time time DEFAULT NULL,
 p_end_time time DEFAULT NULL,
 p_description text DEFAULT NULL,
 p_patient_id uuid DEFAULT NULL,
 p_visit_time time DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth'
AS $function$
DECLARE
 v_actor_professional uuid;
 v_professional uuid;
 v_config uuid;
 v_is_admin boolean;
 v_id uuid;
 v_affected integer;
 v_rows jsonb;
 v_date date;
 v_start time;
 v_end time;
BEGIN
 IF auth.uid() IS NULL THEN
   RAISE EXCEPTION 'Sessão inválida.' USING errcode='42501';
 END IF;
 IF NOT coalesce(public.has_accepted_current_legal_term(),false) THEN
   RAISE EXCEPTION 'Aceite do termo vigente obrigatório.' USING errcode='42501';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.user_accounts ua
   WHERE ua.auth_user_id=auth.uid() AND ua.is_active=true
 ) THEN RAISE EXCEPTION 'Conta inativa.' USING errcode='42501'; END IF;
 v_is_admin:=public.has_app_role('administrador')
          OR public.has_app_role('administrativo_operacional');
 v_actor_professional:=public.capo_effective_professional_id();
 IF NOT v_is_admin AND NOT public.has_app_role('profissional') THEN
   RAISE EXCEPTION 'Perfil não autorizado.' USING errcode='42501';
 END IF;

 IF p_action='professionals' THEN
   IF NOT v_is_admin THEN RAISE EXCEPTION 'Consulta de equipe não autorizada.' USING errcode='42501'; END IF;
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.full_name)
                             ORDER BY x.full_name),'[]'::jsonb) INTO v_rows
   FROM public.professionals x
   WHERE x.status='ativo' AND x.is_professional=true AND EXISTS (
     SELECT 1 FROM public.professional_specialties ps
     JOIN public.specialties s ON s.id=ps.specialty_id
     WHERE ps.professional_id=x.id AND s.is_active=true
       AND lower(btrim(s.name))='assistência social'
   );
   RETURN jsonb_build_object('success',true,'professionals',v_rows);
 END IF;

 IF p_action IN ('add','remove') THEN
   SELECT ac.professional_id, b.specific_date,b.start_time,b.end_time
     INTO v_professional,v_date,v_start,v_end
   FROM public.agenda_blocks b JOIN public.agenda_configs ac ON ac.id=b.agenda_config_id
   WHERE b.id=p_block_id AND b.is_active=true
     AND b.block_type='visita_domiciliar' AND b.specific_date IS NOT NULL;
   IF v_professional IS NULL THEN
     RAISE EXCEPTION 'Bloqueio de visita domiciliar não localizado.' USING errcode='22023';
   END IF;
 ELSE
   v_professional:=coalesce(p_professional_id,v_actor_professional);
 END IF;

 IF v_professional IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.professionals pr
      JOIN public.professional_specialties ps ON ps.professional_id=pr.id
      JOIN public.specialties s ON s.id=ps.specialty_id
      WHERE pr.id=v_professional AND pr.status='ativo' AND pr.is_professional=true
        AND s.is_active=true AND lower(btrim(s.name))='assistência social'
    )
 THEN RAISE EXCEPTION 'É necessário profissional ativo de Assistência Social.' USING errcode='42501'; END IF;
 IF NOT v_is_admin AND v_professional IS DISTINCT FROM v_actor_professional THEN
   RAISE EXCEPTION 'Acesso permitido somente à própria agenda.' USING errcode='42501';
 END IF;

 IF p_action='list' THEN
   SELECT coalesce(jsonb_agg(
     jsonb_build_object(
       'block_id',b.id,'date',b.specific_date,'start_time',b.start_time,
       'end_time',b.end_time,'description',b.description,
       'patients',coalesce((
         SELECT jsonb_agg(jsonb_build_object(
           'patient_id',vh.patient_id,'patient_name',pt.full_name,
           'patient_number',pt.patient_number,'visit_time',vh.visit_time,
           'status',vh.status,'active',vh.is_active
         ) ORDER BY vh.created_at)
         FROM public.social_home_visit_patients vh
         JOIN public.patients pt ON pt.id=vh.patient_id
         WHERE vh.block_id=b.id AND vh.is_active=true
           AND public.capo_patient_visible_in_current_context(pt.id)
       ),'[]'::jsonb)
     ) ORDER BY b.specific_date DESC,b.start_time),'[]'::jsonb) INTO v_rows
   FROM public.agenda_blocks b JOIN public.agenda_configs ac ON ac.id=b.agenda_config_id
   WHERE ac.professional_id=v_professional AND b.block_type='visita_domiciliar'
      AND b.is_active=true AND b.specific_date IS NOT NULL;
   RETURN jsonb_build_object('success',true,'visits',v_rows);
 ELSIF p_action='create' THEN
   IF p_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL
      OR p_end_time<=p_start_time THEN
     RAISE EXCEPTION 'Informe data e período válido.' USING errcode='22023';
   END IF;
   IF p_date<current_date THEN
     RAISE EXCEPTION 'Não é permitido criar visita em data anterior à atual.' USING errcode='22023';
   END IF;
   SELECT ac.id INTO v_config
   FROM public.agenda_configs ac
   JOIN public.agenda_weekdays aw ON aw.agenda_config_id=ac.id
     AND aw.is_active=true
   WHERE ac.professional_id=v_professional AND ac.is_active=true
     AND p_date>=ac.start_date AND (ac.end_date IS NULL OR p_date<=ac.end_date)
     AND aw.weekday=extract(dow FROM p_date)::integer
     AND p_start_time>=ac.start_time AND p_end_time<=ac.end_time
   ORDER BY ac.start_date DESC,ac.created_at DESC LIMIT 1;
   IF v_config IS NULL THEN
     RAISE EXCEPTION 'Não existe configuração de agenda ativa que cubra esse período.' USING errcode='22023';
   END IF;
   PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_professional::text||p_date::text,0));
   IF EXISTS (
     SELECT 1 FROM public.agenda_blocks b
     JOIN public.agenda_configs ac ON ac.id=b.agenda_config_id
     WHERE ac.professional_id=v_professional AND b.is_active=true
       AND (b.specific_date=p_date OR b.weekday=extract(dow FROM p_date)::integer)
       AND b.start_time<p_end_time AND b.end_time>p_start_time
   ) THEN
     RETURN jsonb_build_object('success',false,'message','Já existe bloqueio nesse período. Selecione outro horário.');
   END IF;
   SELECT count(*) INTO v_affected
   FROM (
     SELECT pa.appointment_date,pa.appointment_end
       FROM public.patient_appointments pa
       WHERE pa.professional_id=v_professional
         AND lower(coalesce(pa.attendance_status,'agendado'))
             NOT IN ('cancelado','cancelada','remarcado','remarcada')
     UNION ALL
     SELECT fa.appointment_date,fa.appointment_end
       FROM public.family_psychology_appointments fa
       WHERE fa.professional_id=v_professional
         AND lower(coalesce(fa.attendance_status,'agendado'))
             NOT IN ('cancelado','cancelada','remarcado','remarcada')
   ) booked
   WHERE (booked.appointment_date AT TIME ZONE 'America/Sao_Paulo')::date=p_date
     AND (booked.appointment_date AT TIME ZONE 'America/Sao_Paulo')::time<p_end_time
     AND (booked.appointment_end AT TIME ZONE 'America/Sao_Paulo')::time>p_start_time;
   IF v_affected>0 THEN
     RETURN jsonb_build_object('success',false,'requires_remanejamento',true,
       'affected_appointments',v_affected,
       'message','Remaneje todas as consultas atingidas antes de bloquear para Visita Domiciliar.');
   END IF;
   INSERT INTO public.agenda_blocks (
     agenda_config_id,weekday,specific_date,start_time,end_time,
     block_type,description,is_active,requires_admin_action,admin_action_status,updated_at
   ) VALUES (
     v_config,NULL,p_date,p_start_time,p_end_time,
     'visita_domiciliar',coalesce(nullif(btrim(p_description),''),'Visita Domiciliar'),
     true,false,'nao_necessaria',now()
   ) RETURNING id INTO v_id;
   RETURN jsonb_build_object('success',true,'block_id',v_id,'message','Visita Domiciliar bloqueada. Pacientes podem ser adicionados depois.');
 ELSIF p_action IN ('add','remove') THEN
   IF p_patient_id IS NULL THEN
     RAISE EXCEPTION 'Selecione um paciente.' USING errcode='22023';
   END IF;
   IF p_action='add' THEN
     IF NOT EXISTS (
       SELECT 1 FROM public.patients pt
       WHERE pt.id=p_patient_id AND pt.status='ativo'
         AND NOT coalesce(pt.deceased,false)
         AND public.capo_patient_visible_in_current_context(pt.id)
     ) THEN RAISE EXCEPTION 'Paciente fora do contexto permitido.' USING errcode='42501'; END IF;
     IF p_visit_time IS NOT NULL AND (p_visit_time<v_start OR p_visit_time>=v_end) THEN
       RAISE EXCEPTION 'Horário da visita deve estar dentro do período bloqueado.' USING errcode='22023';
     END IF;
     INSERT INTO public.social_home_visit_patients (
       block_id,patient_id,visit_time,status,is_active,created_by,updated_by
     ) VALUES (p_block_id,p_patient_id,p_visit_time,'programada',true,auth.uid(),auth.uid())
     ON CONFLICT (block_id,patient_id) DO UPDATE
       SET visit_time=excluded.visit_time,is_active=true,
           status='programada',updated_by=auth.uid(),updated_at=now();
   ELSE
     UPDATE public.social_home_visit_patients
       SET is_active=false,status='cancelada',updated_by=auth.uid(),updated_at=now()
     WHERE block_id=p_block_id AND patient_id=p_patient_id AND is_active=true;
   END IF;
   RETURN jsonb_build_object('success',true);
 END IF;
 RAISE EXCEPTION 'Operação de visita domiciliar inválida.' USING errcode='22023';
END;
$function$;
REVOKE ALL ON FUNCTION public.manage_social_home_visits_for_interface(
 text,uuid,uuid,date,time,time,text,uuid,time) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_social_home_visits_for_interface(
 text,uuid,uuid,date,time,time,text,uuid,time) TO authenticated;
