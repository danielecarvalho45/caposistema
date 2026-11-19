-- CAPO 19/11/2026 — VERDE: padronizar a permissão da RPC nova de Nutrição.
-- Mesmo padrão do contrato legado; não modifica registros e não enfraquece as verificações internas.
REVOKE ALL ON FUNCTION public.save_nutrition_plan_detailed_for_interface(uuid, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_nutrition_plan_detailed_for_interface(uuid, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
