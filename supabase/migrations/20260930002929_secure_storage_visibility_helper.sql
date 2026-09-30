create schema if not exists private;

create or replace function private.capo_patient_visible_for_storage(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public','auth'
as $function$
  select public.capo_patient_visible_in_current_context(p_patient_id);
$function$;

revoke all on function private.capo_patient_visible_for_storage(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.capo_patient_visible_for_storage(uuid) to authenticated;

alter policy capo_documents_authenticated_insert
on storage.objects
with check (
  bucket_id = 'capo-documents'
  and lower(storage.extension(name)) = 'pdf'
  and (
    (
      public.capo_storage_path_uuid(name,'transport') is not null
      and public.has_app_role('administrador')
      and exists (
        select 1
        from public.transport_requests tr
        where tr.id = public.capo_storage_path_uuid(storage.objects.name,'transport')
          and private.capo_patient_visible_for_storage(tr.patient_id)
      )
    )
    or (
      public.capo_storage_path_uuid(name,'dentistry') is not null
      and exists (
        select 1
        from public.referrals r
        where r.id = public.capo_storage_path_uuid(storage.objects.name,'dentistry')
          and lower(r.destination) = any(array[
            'odontologia',
            'odontologia - prefeitura',
            'odontologia - secretaria municipal de saúde',
            'odontologia - secretaria municipal de saude'
          ])
          and r.requesting_professional_id = public.capo_effective_professional_id()
          and public.is_authorized_external_dentistry_issuer(public.capo_effective_professional_id())
          and private.capo_patient_visible_for_storage(r.patient_id)
      )
    )
    or (
      public.capo_storage_path_uuid(name,'nutrition') is not null
      and exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id = public.capo_storage_path_uuid(storage.objects.name,'nutrition')
          and d.professional_id = public.capo_effective_professional_id()
          and public.nutrition_professional_has_patient_scope(public.capo_effective_professional_id(),d.patient_id)
          and private.capo_patient_visible_for_storage(d.patient_id)
      )
    )
  )
);

alter policy capo_documents_authenticated_read
on storage.objects
using (
  bucket_id = 'capo-documents'
  and (
    (
      public.capo_storage_path_uuid(name,'transport') is not null
      and exists (
        select 1
        from public.transport_requests tr
        where tr.id = public.capo_storage_path_uuid(storage.objects.name,'transport')
          and private.capo_patient_visible_for_storage(tr.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              public.has_app_role('profissional')
              and exists (
                select 1
                from public.get_effective_professional_capabilities(public.capo_effective_professional_id()) c(capability_code)
                where c.capability_code='preencher_solicitacao_transporte'
              )
              and exists (
                select 1
                from public.social_followup_cycles sfc
                where sfc.patient_id=tr.patient_id
                  and sfc.professional_id=public.capo_effective_professional_id()
                  and sfc.status='ativo'
              )
            )
          )
      )
    )
    or (
      public.capo_storage_path_uuid(name,'dentistry') is not null
      and exists (
        select 1
        from public.referrals r
        where r.id = public.capo_storage_path_uuid(storage.objects.name,'dentistry')
          and private.capo_patient_visible_for_storage(r.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('administrativo_operacional')
            or public.has_app_role('coordenador')
            or (
              r.requesting_professional_id=public.capo_effective_professional_id()
              and public.is_authorized_external_dentistry_issuer(public.capo_effective_professional_id())
            )
          )
      )
    )
    or (
      public.capo_storage_path_uuid(name,'nutrition') is not null
      and exists (
        select 1
        from public.nutrition_plan_documents d
        where d.id = public.capo_storage_path_uuid(storage.objects.name,'nutrition')
          and private.capo_patient_visible_for_storage(d.patient_id)
          and (
            public.has_app_role('administrador')
            or public.has_app_role('coordenador')
            or d.professional_id=public.capo_effective_professional_id()
            or (
              public.has_app_role('administrativo_operacional')
              and exists (
                select 1 from public.nutrition_document_deliveries dl
                where dl.document_id=d.id and dl.mode='administrativo'
              )
            )
          )
      )
    )
  )
);

alter policy capo_documents_nutrition_management_insert
on storage.objects
with check (
  bucket_id='capo-documents'
  and lower(storage.extension(name))='pdf'
  and public.capo_storage_path_uuid(name,'nutrition') is not null
  and (
    public.has_app_role('administrador')
    or (
      public.has_app_role('administrativo_operacional')
      and public.has_app_role('administrador_tecnico')
    )
  )
  and exists (
    select 1
    from public.nutrition_plan_documents d
    where d.id=public.capo_storage_path_uuid(storage.objects.name,'nutrition')
      and private.capo_patient_visible_for_storage(d.patient_id)
  )
);

alter policy capo_documents_nutrition_management_read
on storage.objects
using (
  bucket_id='capo-documents'
  and public.capo_storage_path_uuid(name,'nutrition') is not null
  and (
    public.has_app_role('administrador')
    or (
      public.has_app_role('administrativo_operacional')
      and public.has_app_role('administrador_tecnico')
    )
  )
  and exists (
    select 1
    from public.nutrition_plan_documents d
    where d.id=public.capo_storage_path_uuid(storage.objects.name,'nutrition')
      and private.capo_patient_visible_for_storage(d.patient_id)
  )
);

revoke execute on function public.capo_patient_visible_in_current_context(uuid) from authenticated;
