-- CAPO 19/11/2026 — verificações somente de leitura do Plano Alimentar documental.
-- Não simular consultas ou gravações em paciente real.
with facts as (
  select
    (select count(*) from information_schema.columns where table_schema='public'
      and table_name='nutrition_plans'
      and column_name in ('dessert_lunch','dessert_dinner','oncology_guidance','additional_notes','document_title')) as new_columns,
    (select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
      and proname='save_nutrition_plan_detailed_for_interface') as detailed_save,
    (select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
      and proname='save_nutrition_plan_for_interface') as legacy_save,
    (select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
      and proname='get_nutrition_context_for_interface') as context_reader,
    (select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
      and proname='create_nutrition_document_for_interface') as professional_pdf,
    (select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
      and proname='create_nutrition_document_for_management_interface') as management_pdf
)
select 'cinco_campos_novos' item,new_columns=5 passed from facts
union all select 'contrato_legado_preservado',legacy_save is not null from facts
union all select 'escrita_nova_somente_nutricionista',
  detailed_save like '%Somente Nutricionista ativa pode salvar%' from facts
union all select 'nova_gravacao_validada_por_escopo',
  detailed_save like '%nutrition_professional_has_patient_scope%' from facts
union all select 'limite_textual_5000',
  detailed_save like '%no máximo 5000 caracteres%' from facts
union all select 'contexto_retorna_campos',
  context_reader like '%''dessert_lunch'',np.dessert_lunch%' and
  context_reader like '%''document_title'',np.document_title%' from facts
union all select 'pdf_profissional_usa_snapshot',
  professional_pdf like '%''oncology_guidance'',v_plan.oncology_guidance%' and
  professional_pdf like '%''dessert_dinner'',v_plan.dessert_dinner%' from facts
union all select 'pdf_gerencial_usa_snapshot',
  management_pdf like '%''oncology_guidance'',v_plan.oncology_guidance%' and
  management_pdf like '%''dessert_dinner'',v_plan.dessert_dinner%' from facts
union all select 'versao_2_preserva_anteriores',
  professional_pdf like '%v_revision,''2''%' and management_pdf like '%v_revision,''2''%' from facts
union all select 'autoria_real_profissional',
  professional_pdf like '%professional_registration%' from facts
union all select 'nenhuma_gravacao_de_teste',
  (select count(*)=0 from public.nutrition_plans where document_title is not null) from facts
order by item;