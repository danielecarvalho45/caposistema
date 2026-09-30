drop trigger if exists trg_capo_environment_prescription_renewals
on public.prescription_renewal_requests;

create trigger trg_capo_environment_prescription_renewals
before insert or update of patient_id,target_doctor_id
on public.prescription_renewal_requests
for each row execute function private.capo_enforce_patient_professional_environment(
  'patient_id','target_doctor_id'
);
