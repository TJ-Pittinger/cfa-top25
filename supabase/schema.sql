-- =====================================================================
-- CFA Top 25: database setup
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run
-- =====================================================================

-- ---------- Teams (all FBS teams; used to validate ballots) ----------
create table if not exists public.teams (
  id    int primary key,          -- ESPN team id (also the logo file name)
  name  text not null,
  abbr  text not null,
  conf  text not null
);
insert into public.teams (id, name, abbr, conf) values
  (333, 'Alabama', 'ALA', 'SEC'),
  (8, 'Arkansas', 'ARK', 'SEC'),
  (2, 'Auburn', 'AUB', 'SEC'),
  (57, 'Florida', 'FLA', 'SEC'),
  (61, 'Georgia', 'UGA', 'SEC'),
  (96, 'Kentucky', 'UK', 'SEC'),
  (99, 'LSU', 'LSU', 'SEC'),
  (145, 'Ole Miss', 'MISS', 'SEC'),
  (344, 'Mississippi State', 'MSST', 'SEC'),
  (142, 'Missouri', 'MIZ', 'SEC'),
  (201, 'Oklahoma', 'OU', 'SEC'),
  (2579, 'South Carolina', 'SC', 'SEC'),
  (2633, 'Tennessee', 'TENN', 'SEC'),
  (251, 'Texas', 'TEX', 'SEC'),
  (245, 'Texas A&M', 'TA&M', 'SEC'),
  (238, 'Vanderbilt', 'VAN', 'SEC'),
  (356, 'Illinois', 'ILL', 'Big Ten'),
  (84, 'Indiana', 'IU', 'Big Ten'),
  (2294, 'Iowa', 'IOWA', 'Big Ten'),
  (120, 'Maryland', 'MD', 'Big Ten'),
  (130, 'Michigan', 'MICH', 'Big Ten'),
  (127, 'Michigan State', 'MSU', 'Big Ten'),
  (135, 'Minnesota', 'MINN', 'Big Ten'),
  (158, 'Nebraska', 'NEB', 'Big Ten'),
  (77, 'Northwestern', 'NU', 'Big Ten'),
  (194, 'Ohio State', 'OSU', 'Big Ten'),
  (2483, 'Oregon', 'ORE', 'Big Ten'),
  (213, 'Penn State', 'PSU', 'Big Ten'),
  (2509, 'Purdue', 'PUR', 'Big Ten'),
  (164, 'Rutgers', 'RUTG', 'Big Ten'),
  (26, 'UCLA', 'UCLA', 'Big Ten'),
  (30, 'USC', 'USC', 'Big Ten'),
  (264, 'Washington', 'WASH', 'Big Ten'),
  (275, 'Wisconsin', 'WIS', 'Big Ten'),
  (103, 'Boston College', 'BC', 'ACC'),
  (25, 'California', 'CAL', 'ACC'),
  (228, 'Clemson', 'CLEM', 'ACC'),
  (150, 'Duke', 'DUKE', 'ACC'),
  (52, 'Florida State', 'FSU', 'ACC'),
  (59, 'Georgia Tech', 'GT', 'ACC'),
  (97, 'Louisville', 'LOU', 'ACC'),
  (2390, 'Miami', 'MIA', 'ACC'),
  (152, 'NC State', 'NCST', 'ACC'),
  (153, 'North Carolina', 'UNC', 'ACC'),
  (221, 'Pittsburgh', 'PITT', 'ACC'),
  (2567, 'SMU', 'SMU', 'ACC'),
  (24, 'Stanford', 'STAN', 'ACC'),
  (183, 'Syracuse', 'SYR', 'ACC'),
  (258, 'Virginia', 'UVA', 'ACC'),
  (259, 'Virginia Tech', 'VT', 'ACC'),
  (154, 'Wake Forest', 'WAKE', 'ACC'),
  (12, 'Arizona', 'ARIZ', 'Big 12'),
  (9, 'Arizona State', 'ASU', 'Big 12'),
  (239, 'Baylor', 'BAY', 'Big 12'),
  (252, 'BYU', 'BYU', 'Big 12'),
  (2132, 'Cincinnati', 'CIN', 'Big 12'),
  (38, 'Colorado', 'COLO', 'Big 12'),
  (248, 'Houston', 'HOU', 'Big 12'),
  (66, 'Iowa State', 'ISU', 'Big 12'),
  (2305, 'Kansas', 'KU', 'Big 12'),
  (2306, 'Kansas State', 'KSU', 'Big 12'),
  (197, 'Oklahoma State', 'OKST', 'Big 12'),
  (2628, 'TCU', 'TCU', 'Big 12'),
  (2641, 'Texas Tech', 'TTU', 'Big 12'),
  (2116, 'UCF', 'UCF', 'Big 12'),
  (254, 'Utah', 'UTAH', 'Big 12'),
  (277, 'West Virginia', 'WVU', 'Big 12'),
  (68, 'Boise State', 'BSU', 'Pac-12'),
  (36, 'Colorado State', 'CSU', 'Pac-12'),
  (278, 'Fresno State', 'FRES', 'Pac-12'),
  (204, 'Oregon State', 'ORST', 'Pac-12'),
  (21, 'San Diego State', 'SDSU', 'Pac-12'),
  (326, 'Texas State', 'TXST', 'Pac-12'),
  (328, 'Utah State', 'USU', 'Pac-12'),
  (265, 'Washington State', 'WSU', 'Pac-12'),
  (2005, 'Air Force', 'AF', 'Mountain West'),
  (62, 'Hawai''i', 'HAW', 'Mountain West'),
  (2440, 'Nevada', 'NEV', 'Mountain West'),
  (167, 'New Mexico', 'UNM', 'Mountain West'),
  (2449, 'North Dakota State', 'NDSU', 'Mountain West'),
  (2459, 'Northern Illinois', 'NIU', 'Mountain West'),
  (23, 'San José State', 'SJSU', 'Mountain West'),
  (2439, 'UNLV', 'UNLV', 'Mountain West'),
  (2638, 'UTEP', 'UTEP', 'Mountain West'),
  (2751, 'Wyoming', 'WYO', 'Mountain West'),
  (349, 'Army', 'ARMY', 'American'),
  (2429, 'Charlotte', 'CLT', 'American'),
  (151, 'East Carolina', 'ECU', 'American'),
  (2226, 'Florida Atlantic', 'FAU', 'American'),
  (235, 'Memphis', 'MEM', 'American'),
  (2426, 'Navy', 'NAVY', 'American'),
  (249, 'North Texas', 'UNT', 'American'),
  (242, 'Rice', 'RICE', 'American'),
  (58, 'South Florida', 'USF', 'American'),
  (218, 'Temple', 'TEM', 'American'),
  (2655, 'Tulane', 'TULN', 'American'),
  (202, 'Tulsa', 'TLSA', 'American'),
  (5, 'UAB', 'UAB', 'American'),
  (2636, 'UTSA', 'UTSA', 'American'),
  (2026, 'App State', 'APP', 'Sun Belt'),
  (2032, 'Arkansas State', 'ARST', 'Sun Belt'),
  (324, 'Coastal Carolina', 'CCU', 'Sun Belt'),
  (290, 'Georgia Southern', 'GASO', 'Sun Belt'),
  (2247, 'Georgia State', 'GAST', 'Sun Belt'),
  (256, 'James Madison', 'JMU', 'Sun Belt'),
  (309, 'Louisiana', 'ULL', 'Sun Belt'),
  (2348, 'Louisiana Tech', 'LT', 'Sun Belt'),
  (276, 'Marshall', 'MRSH', 'Sun Belt'),
  (295, 'Old Dominion', 'ODU', 'Sun Belt'),
  (6, 'South Alabama', 'USA', 'Sun Belt'),
  (2572, 'Southern Miss', 'USM', 'Sun Belt'),
  (2653, 'Troy', 'TROY', 'Sun Belt'),
  (2433, 'UL Monroe', 'ULM', 'Sun Belt'),
  (48, 'Delaware', 'DEL', 'C-USA'),
  (2229, 'FIU', 'FIU', 'C-USA'),
  (55, 'Jacksonville State', 'JVST', 'C-USA'),
  (338, 'Kennesaw State', 'KENN', 'C-USA'),
  (2335, 'Liberty', 'LIB', 'C-USA'),
  (2393, 'Middle Tennessee', 'MTSU', 'C-USA'),
  (2623, 'Missouri State', 'MOST', 'C-USA'),
  (166, 'New Mexico State', 'NMSU', 'C-USA'),
  (2534, 'Sam Houston', 'SHSU', 'C-USA'),
  (98, 'Western Kentucky', 'WKU', 'C-USA'),
  (2006, 'Akron', 'AKR', 'MAC'),
  (2050, 'Ball State', 'BALL', 'MAC'),
  (189, 'Bowling Green', 'BGSU', 'MAC'),
  (2084, 'Buffalo', 'BUFF', 'MAC'),
  (2117, 'Central Michigan', 'CMU', 'MAC'),
  (2199, 'Eastern Michigan', 'EMU', 'MAC'),
  (2309, 'Kent State', 'KENT', 'MAC'),
  (193, 'Miami (OH)', 'M-OH', 'MAC'),
  (195, 'Ohio', 'OHIO', 'MAC'),
  (16, 'Sacramento State', 'SAC', 'MAC'),
  (2649, 'Toledo', 'TOL', 'MAC'),
  (113, 'UMass', 'MASS', 'MAC'),
  (2711, 'Western Michigan', 'WMU', 'MAC'),
  (87, 'Notre Dame', 'ND', 'Independent'),
  (41, 'UConn', 'CONN', 'Independent')
on conflict (id) do update set name = excluded.name, abbr = excluded.abbr, conf = excluded.conf;

-- ---------- Weeks (voting windows, Eastern Time) ----------
-- Each poll week: voting opens Sunday 2:00 AM ET and closes Sunday 12:00 PM ET.
create table if not exists public.weeks (
  season    int not null,
  week      int not null,
  opens_at  timestamptz not null,
  closes_at timestamptz not null,
  primary key (season, week)
);
insert into public.weeks (season, week, opens_at, closes_at)
select 2026, 7 + n,
       ((date '2026-10-11' + 7 * n) + time '02:00') at time zone 'America/New_York',
       ((date '2026-10-11' + 7 * n) + time '12:00') at time zone 'America/New_York'
from generate_series(0, 9) as n          -- Weeks 7-16: Oct 11 through Dec 13
on conflict (season, week) do nothing;

-- ---------- People ----------
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
insert into public.admins (email) values ('tj@garnetconnection.com') on conflict do nothing;

create table if not exists public.media_voters (
  email    text primary key check (email = lower(email)),
  name     text not null,
  outlet   text,
  added_at timestamptz not null default now()
);

-- ---------- Ballots ----------
create table if not exists public.ballots (
  id         bigint generated always as identity primary key,
  season     int not null,
  week       int not null,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('media', 'fan')),
  ranks      int[] not null,              -- 25 team ids, 1st place first
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, week, user_id, kind),
  foreign key (season, week) references public.weeks (season, week)
);

-- ---------- Game results (filled in automatically from ESPN each Sunday) ----------
create table if not exists public.games (
  season     int not null,
  week       int not null,                -- the poll week this result feeds into
  team_id    int not null references public.teams,
  opp_id     int,
  opp_name   text,                        -- for non-FBS opponents
  home       boolean,
  team_score int,
  opp_score  int,
  won        boolean,
  record     text,                        -- record after this game, e.g. "6-0"
  primary key (season, week, team_id)
);

-- ---------- Helper functions ----------
create or replace function public.current_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = public.current_email())
$$;

create or replace function public.is_media_voter() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.media_voters where email = public.current_email())
$$;

create or replace function public.week_is_open(p_season int, p_week int) returns boolean
language sql stable as $$
  select exists (select 1 from public.weeks
                 where season = p_season and week = p_week
                   and now() >= opens_at and now() < closes_at)
$$;

-- A ballot must be exactly 25 different FBS teams.
create or replace function public.check_ballot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(array_length(new.ranks, 1), 0) <> 25 then
    raise exception 'A ballot needs exactly 25 teams.';
  end if;
  if (select count(distinct x) from unnest(new.ranks) x) <> 25 then
    raise exception 'A team can only appear once on a ballot.';
  end if;
  if (select count(*) from public.teams where id = any(new.ranks)) <> 25 then
    raise exception 'Every team on a ballot must be an FBS team.';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists ballots_check on public.ballots;
create trigger ballots_check before insert or update on public.ballots
for each row execute function public.check_ballot();

-- ---------- Security rules ----------
alter table public.teams        enable row level security;
alter table public.weeks        enable row level security;
alter table public.admins       enable row level security;
alter table public.media_voters enable row level security;
alter table public.ballots      enable row level security;
alter table public.games        enable row level security;

-- Anyone can read teams, weeks, and game results.
drop policy if exists "teams are public" on public.teams;
create policy "teams are public" on public.teams for select using (true);
drop policy if exists "weeks are public" on public.weeks;
create policy "weeks are public" on public.weeks for select using (true);
drop policy if exists "games are public" on public.games;
create policy "games are public" on public.games for select using (true);
drop policy if exists "admins manage weeks" on public.weeks;
create policy "admins manage weeks" on public.weeks for all using (public.is_admin()) with check (public.is_admin());

-- Only admins can see or change the admin list and the media voter list.
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select using (public.is_admin());
drop policy if exists "admins manage media voters" on public.media_voters;
create policy "admins manage media voters" on public.media_voters for all
  using (public.is_admin()) with check (public.is_admin());

-- Ballots: you can see your own; admins can see all.
drop policy if exists "read own ballots" on public.ballots;
create policy "read own ballots" on public.ballots for select
  using (user_id = auth.uid() or public.is_admin());
-- You can submit or change your ballot only while that week's voting is open.
-- Media ballots only from emails on the media voter list.
drop policy if exists "submit own ballot" on public.ballots;
create policy "submit own ballot" on public.ballots for insert
  with check (user_id = auth.uid() and public.week_is_open(season, week)
              and (kind = 'fan' or public.is_media_voter()));
drop policy if exists "edit own ballot" on public.ballots;
create policy "edit own ballot" on public.ballots for update
  using (user_id = auth.uid() and public.week_is_open(season, week))
  with check (user_id = auth.uid() and public.week_is_open(season, week)
              and (kind = 'fan' or public.is_media_voter()));

-- Admins can delete ballots (used to clear the admin-only test week).
drop policy if exists "admins delete ballots" on public.ballots;
create policy "admins delete ballots" on public.ballots for delete using (public.is_admin());

-- ---------- Public results (only after voting closes) ----------
-- Poll totals: 25 points for 1st, down to 1 for 25th. Fan ballots stay private;
-- only these totals are public.
create or replace function public.poll_results(p_season int, p_week int, p_kind text)
returns table (team_id int, points bigint, first_place bigint, votes bigint, ballot_count bigint)
language sql stable security definer set search_path = public as $$
  with b as (
    select ranks from public.ballots
    where season = p_season and week = p_week and kind = p_kind
      and (public.is_admin() or exists (select 1 from public.weeks w
             where w.season = p_season and w.week = p_week and now() >= w.closes_at))
  )
  select r.team_id,
         sum(26 - r.pos)                  as points,
         count(*) filter (where r.pos = 1) as first_place,
         count(*)                          as votes,
         (select count(*) from b)          as ballot_count
  from b, unnest(b.ranks) with ordinality as r(team_id, pos)
  group by r.team_id
  order by points desc, first_place desc
$$;

-- Media ballots are public (with name and outlet) once voting closes.
create or replace function public.media_ballots(p_season int, p_week int)
returns table (ballot_id bigint, name text, outlet text, ranks int[], submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, m.name, m.outlet, b.ranks, b.updated_at
  from public.ballots b
  join auth.users u on u.id = b.user_id
  join public.media_voters m on m.email = lower(u.email)
  where b.season = p_season and b.week = p_week and b.kind = 'media'
    and (public.is_admin() or exists (select 1 from public.weeks w
           where w.season = p_season and w.week = p_week and now() >= w.closes_at))
  order by m.name
$$;

-- Admin view: which media voters haven't voted yet this week.
create or replace function public.media_not_voted(p_season int, p_week int)
returns table (email text, name text, outlet text)
language sql stable security definer set search_path = public as $$
  select m.email, m.name, m.outlet from public.media_voters m
  where public.is_admin()
    and not exists (select 1 from public.ballots b join auth.users u on u.id = b.user_id
                    where lower(u.email) = m.email and b.season = p_season
                      and b.week = p_week and b.kind = 'media')
  order by m.name
$$;

grant execute on function public.poll_results(int, int, text) to anon, authenticated;
grant execute on function public.media_ballots(int, int) to anon, authenticated;
grant execute on function public.media_not_voted(int, int) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_media_voter() to authenticated;
