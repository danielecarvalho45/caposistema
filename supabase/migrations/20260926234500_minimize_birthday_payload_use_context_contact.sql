create or replace function public.get_birthdays_for_interface()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_professional_id uuid;
  v_reference_date date := (now() at time zone 'America/Sao_Paulo')::date;
  v_can_view_all_patients boolean;
  v_can_view_assigned_patients boolean;
  v_patients jsonb;
  v_team jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id,public.capo_effective_professional_id() into v_account_id,v_professional_id
  from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta inativa ou não vinculada.' using errcode='42501'; end if;
  v_can_view_all_patients:=public.has_app_role('administrador') or public.has_app_role('administrativo_operacional') or public.has_app_role('coordenador');
  v_can_view_assigned_patients:=public.has_app_role('profissional') and v_professional_id is not null;
  if not (v_can_view_all_patients or v_can_view_assigned_patients) then raise exception 'Perfil sem autorização para consultar aniversariantes.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'patient_id',p.id,'full_name',p.full_name,'patient_number',p.patient_number,'cms',p.cms
  ) order by p.full_name,p.id),'[]'::jsonb)
  into v_patients
  from public.patients p
  where p.birth_date is not null
    and extract(month from p.birth_date)=extract(month from v_reference_date)
    and extract(day from p.birth_date)=extract(day from v_reference_date)
    and p.status='ativo' and not coalesce(p.deceased,false)
    and public.capo_patient_visible_in_current_context(p.id)
    and (
      v_can_view_all_patients
      or exists (
        select 1 from public.patient_care_cycle_specialties pcs
        join public.patient_care_cycles pc on pc.id=pcs.care_cycle_id
        where pc.patient_id=p.id and pc.status='ativo' and pcs.status='ativo'
          and pcs.current_responsible_professional_id=v_professional_id
      )
      or exists (
        select 1 from public.patient_appointments pa
        where pa.patient_id=p.id and pa.professional_id=v_professional_id
      )
    );
  select coalesce(jsonb_agg(jsonb_build_object(
    'professional_id',pr.id,'full_name',pr.full_name,
    'function_title',coalesce(nullif(btrim(pr.function_title),''),'Equipe CAPO')
  ) order by pr.full_name,pr.id),'[]'::jsonb)
  into v_team
  from public.professionals pr
  where pr.birth_date is not null
    and extract(month from pr.birth_date)=extract(month from v_reference_date)
    and extract(day from pr.birth_date)=extract(day from v_reference_date)
    and pr.status='ativo';
  return jsonb_build_object(
    'reference_date',v_reference_date,'time_zone','America/Sao_Paulo',
    'patients',v_patients,'team',v_team
  );
end;
$function$;
revoke all on function public.get_birthdays_for_interface() from public,anon;
grant execute on function public.get_birthdays_for_interface() to authenticated;
