create policy administrative_request_events_no_direct_client_access
on public.administrative_request_events
as restrictive
for all
to authenticated
using (false)
with check (false);
