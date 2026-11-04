-- CFP Projector tables. Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Safe to run again.

-- The committee's Top 25, entered by an admin each Tuesday. ranks = team ids in order, No. 1 first.
create table if not exists public.cfp_rankings (
  season int not null,
  released date not null,
  ranks jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  primary key (season, released)
);
alter table public.cfp_rankings enable row level security;
drop policy if exists "cfp rankings are public" on public.cfp_rankings;
create policy "cfp rankings are public" on public.cfp_rankings for select using (true);
drop policy if exists "admins manage cfp rankings" on public.cfp_rankings;
create policy "admins manage cfp rankings" on public.cfp_rankings for all
  using (public.is_admin()) with check (public.is_admin());

-- Each signed-in person's projector picks: { "<game id>": "<winning team id>", "ccg-SEC": "<team id>", ... }
create table if not exists public.cfp_picks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  season int not null,
  picks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, season)
);
alter table public.cfp_picks enable row level security;
drop policy if exists "read own cfp picks" on public.cfp_picks;
create policy "read own cfp picks" on public.cfp_picks for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "save own cfp picks" on public.cfp_picks;
create policy "save own cfp picks" on public.cfp_picks for insert with check (user_id = auth.uid());
drop policy if exists "edit own cfp picks" on public.cfp_picks;
create policy "edit own cfp picks" on public.cfp_picks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own cfp picks" on public.cfp_picks;
create policy "delete own cfp picks" on public.cfp_picks for delete using (user_id = auth.uid());

-- Pick analytics for admins: one row per game and team with how many people picked that team.
create or replace function public.cfp_pick_stats(p_season int)
returns table (game_id text, team_id text, picks bigint, people bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    select e.key::text, e.value::text, count(*)::bigint,
           (select count(*) from public.cfp_picks c where c.season = p_season)::bigint
    from public.cfp_picks p, jsonb_each_text(p.picks) e
    where p.season = p_season
    group by e.key, e.value;
end $$;
grant execute on function public.cfp_pick_stats(int) to authenticated;
