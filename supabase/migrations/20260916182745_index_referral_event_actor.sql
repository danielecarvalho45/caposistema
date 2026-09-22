create index if not exists referral_events_actor_account_idx
  on public.referral_events (actor_user_account_id)
  where actor_user_account_id is not null;
