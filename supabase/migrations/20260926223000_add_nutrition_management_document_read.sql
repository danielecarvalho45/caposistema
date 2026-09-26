create or replace function public.get_nutrition_documents_for_management(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_account_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão não autenticada.' using errcode='42501'; end if;
  if not coalesce(public.has_accepted_current_legal_term(),false) then raise exception 'Aceite do termo vigente obrigatório.' using errcode='42501'; end if;
  select ua.id into v_account_id from public.user_accounts ua where ua.auth_user_id=auth.uid() and ua.is_active=true limit 1;
  if v_account_id is null then raise exception 'Conta ativa não encontrada.' using errcode='42501'; end if;
  if not (public.has_app_role('administrador') or public.has_app_role('coordenador')) then
    raise exception 'Perfil sem autorização gerencial para consultar documentos da Nutrição.' using errcode='42501';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Limite deve estar entre 1 e 100.' using errcode='22023'; end if;
  if p_offset is null or p_offset<0 then raise exception 'Offset inválido.' using errcode='22023'; end if;

  select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]'::jsonb)
  into v_result
  from (
    select d.created_at,
      jsonb_build_object(
        'document_id',d.id,'patient_id',d.patient_id,'patient_name',d.patient_name,
        'patient_number',d.patient_number,'cms',d.cms,'revision_no',d.revision_no,
        'author_name',d.author_name,'author_registration',d.author_registration,
        'created_at',d.created_at,'pdf_path',d.pdf_path,'pdf_generated_at',d.pdf_generated_at,
        'pdf_available',(d.pdf_path is not null and d.pdf_generated_at is not null)
      ) item
    from public.nutrition_plan_documents d
    where public.capo_patient_visible_in_current_context(d.patient_id)
    order by d.created_at desc
    limit p_limit offset p_offset
  ) x;

  return v_result;
end;
$function$;
revoke all on function public.get_nutrition_documents_for_management(integer,integer) from public,anon;
grant execute on function public.get_nutrition_documents_for_management(integer,integer) to authenticated;
