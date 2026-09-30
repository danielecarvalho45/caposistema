create schema if not exists private;

create or replace function private.capo_storage_document_access(
  p_name text,
  p_action text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth','storage'
as $function$
declare
  v_transport_id uuid;
  v_dentistry_id uuid;
  v_nutrition_id uuid;
  v_professional_id uuid := public.capo_effective_professional_id();
begin
  if auth.uid() is null then
    return false;
  end if;

  v_transport_id := public.capo_storage_path_uuid(p_name,'transport');
  v_dentistry_id := public.capo_storage_path_uuid(p_name,'dentistry');
  v_nutrition_id := public.capo_storage_path_uuid(p_name,'nutrition');

  if p_action='insert' then
    if v_transport_id is not null then
      return public.has_app_role('administrador')
        and exists (
          select 1
          from public.transport_requests tr
          where tr.id=v_transport_id
            and public.capo_patient_visible_in_current_context(tr.patient_id)
        );
    end if;

    if v_dentistry_id is not null then
      return exists (
        select 1
        from public.referrals r
        where r.id=v_dentistry_id
          and lower(r.destination)=any(array[
            'odontologia',
            'odontologia - prefeitura',
            'odontologia - secretaria municipal de saúde',
            'odontologia - secretaria municipal de saude'
          ])
          and r.requesting_professional_id=v_professional_id
          and public.is_authorized_external_dentistry_issuer(v_professional_id)
          and public.capo_patient_visible_in_current_context(r.patient_id)
      );
    end if;

    if v_nutrition_id is not null then
      return exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id=v_nutrition_id
          and d.professional_id=v_professional_id
          and public.nutrition_professional_has_patient_scope(v_professional_id,d.patient_id)
          and public.capo_patient_visible_in_current_context(d.patient_id)
      );
    end if;

    return false;
  end if;

  if p_action='read' then
    if v_transport_id is not null then
      return exists (
        select 1
        from public.transport_requests tr
        where tr.id=v_transport_id
          and public.capo_patient_visible_in_current_context(tr.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              public.has_app_role('profissional')
              and exists (
                select 1
                from public.get_effective_professional_capabilities(v_professional_id) c(capability_code)
                where c.capability_code='preencher_solicitacao_transporte'
              )
              and exists (
                select 1
                from public.social_followup_cycles sfc
                where sfc.patient_id=tr.patient_id
                  and sfc.professional_id=v_professional_id
                  and sfc.status='ativo'
              )
            )
          )
      );
    end if;

    if v_dentistry_id is not null then
      return exists (
        select 1
        from public.referrals r
        where r.id=v_dentistry_id
          and public.capo_patient_visible_in_current_context(r.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              r.requesting_professional_id=v_professional_id
              and public.is_authorized_external_dentistry_issuer(v_professional_id)
            )
          )
      );
    end if;

    if v_nutrition_id is not null then
      return exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id=v_nutrition_id
          and public.capo_patient_visible_in_current_context(d.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('coordenador')
            or d.professional_id=v_professional_id
            or (
              public.has_app_role('administrativo_operacional')
              and exists (
                select 1
                from public.nutrition_document_deliveries dl
                where dl.document_id=d.id
                  and dl.mode='administrativo'
              )
            )
          )
      );
    end if;

    return false;
  end if;

  return false;
end;
$function$;

create or replace function private.capo_storage_nutrition_management_access(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','auth'
as $function$
declare
  v_document_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_document_id := public.capo_storage_path_uuid(p_name,'nutrition');
  if v_document_id is null then
    return false;
  end if;

  if not (
    public.has_app_role('administrador')
    or (
      public.has_app_role('administrativo_operacional')
      and public.has_app_role('administrador_tecnico')
    )
  ) then
    return false;
  end if;

  return exists (
    select 1
    from public.nutrition_plan_documents d
    where d.id=v_document_id
      and public.capo_patient_visible_in_current_context(d.patient_id)
  );
end;
$function$;

revoke all on function private.capo_storage_document_access(text,text) from public, anon;
revoke all on function private.capo_storage_nutrition_management_access(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.capo_storage_document_access(text,text) to authenticated;
grant execute on function private.capo_storage_nutrition_management_access(text) to authenticated;

alter policy capo_documents_authenticated_insert
on storage.objects
with check (
  bucket_id='capo-documents'
  and lower(storage.extension(name))='pdf'
  and private.capo_storage_document_access(name,'insert')
);

alter policy capo_documents_authenticated_read
on storage.objects
using (
  bucket_id='capo-documents'
  and private.capo_storage_document_access(name,'read')
);

alter policy capo_documents_nutrition_management_insert
on storage.objects
with check (
  bucket_id='capo-documents'
  and lower(storage.extension(name))='pdf'
  and private.capo_storage_nutrition_management_access(name)
);

alter policy capo_documents_nutrition_management_read
on storage.objects
using (
  bucket_id='capo-documents'
  and private.capo_storage_nutrition_management_access(name)
);

revoke execute on function public.capo_patient_visible_in_current_context(uuid) from authenticated;
revoke execute on function private.capo_patient_visible_for_storage(uuid) from authenticated;
drop function if exists private.capo_patient_visible_for_storage(uuid);
