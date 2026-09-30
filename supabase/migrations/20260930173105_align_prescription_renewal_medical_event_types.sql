alter table public.prescription_renewal_events
drop constraint if exists prescription_renewal_event_type_check;

alter table public.prescription_renewal_events
add constraint prescription_renewal_event_type_check
check (
  event_type = any (array[
    'created'::text,
    'medical_started'::text,
    'doctor_reassigned'::text,
    'medical_completed'::text,
    'medical_renewed'::text,
    'medical_needs_consult'::text,
    'admin_completed'::text,
    'cancelled'::text
  ])
);
