-- CFA Top 25: update 1
-- Lets admins delete ballots (used by "End test week" on the admin page).
-- Run once in Supabase: SQL Editor > New query > paste > Run.

drop policy if exists "admins delete ballots" on public.ballots;
create policy "admins delete ballots" on public.ballots for delete using (public.is_admin());
