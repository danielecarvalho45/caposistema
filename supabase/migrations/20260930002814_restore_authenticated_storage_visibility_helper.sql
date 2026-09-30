revoke all on function public.capo_patient_visible_in_current_context(uuid) from public, anon;
grant execute on function public.capo_patient_visible_in_current_context(uuid) to authenticated;
