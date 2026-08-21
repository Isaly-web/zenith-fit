-- Zenith Fit AI (Nordvital): dedicated schema, isolated from other Isaly apps'
-- tables in the shared isaly-apps-prod project (e.g. avoids colliding with
-- public.notifications / public.profiles already used by other apps).
create schema if not exists zenith_fit;

grant usage on schema zenith_fit to authenticated, service_role;

create or replace function zenith_fit.set_updated_at()
returns trigger
language plpgsql
set search_path = zenith_fit, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile: limitations, preferred workout types, weekly frequency.
-- One row per user, keyed by auth.users.id.
-- ---------------------------------------------------------------------------
create table zenith_fit.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  limitations text[] not null default '{}',
  limitation_notes text not null default '',
  preferred_types text[] not null default '{}',
  weekly_target int not null default 4 check (weekly_target between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on zenith_fit.profiles to authenticated;
grant all on zenith_fit.profiles to service_role;
alter table zenith_fit.profiles enable row level security;

create policy "profiles_select_own" on zenith_fit.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on zenith_fit.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on zenith_fit.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete_own" on zenith_fit.profiles for delete to authenticated using (id = auth.uid());

create trigger profiles_set_updated_at
  before update on zenith_fit.profiles
  for each row execute function zenith_fit.set_updated_at();

-- ---------------------------------------------------------------------------
-- Workouts: generated sessions, their blocks (jsonb) and post-session feedback
-- (jsonb: difficulty, energy, soreness, mood, note). `id` is client-generated
-- by the rule-based session generator (src/lib/fitness/engine.ts), so it's a
-- plain text primary key rather than a database-assigned uuid.
-- ---------------------------------------------------------------------------
create table zenith_fit.workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  time_of_day text not null check (time_of_day in ('morning', 'lunch', 'afternoon', 'evening')),
  type text not null,
  types text[],
  duration int not null check (duration > 0),
  intensity text not null check (intensity in ('restorative', 'easy', 'moderate', 'hard')),
  title text not null,
  coach_note text not null default '',
  physio_note text,
  blocks jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  feedback jsonb
);

grant select, insert, update, delete on zenith_fit.workouts to authenticated;
grant all on zenith_fit.workouts to service_role;
alter table zenith_fit.workouts enable row level security;

create index workouts_user_id_idx on zenith_fit.workouts(user_id);
create index workouts_user_completed_idx on zenith_fit.workouts(user_id, completed_at desc);

create policy "workouts_select_own" on zenith_fit.workouts for select to authenticated using (user_id = auth.uid());
create policy "workouts_insert_own" on zenith_fit.workouts for insert to authenticated with check (user_id = auth.uid());
create policy "workouts_update_own" on zenith_fit.workouts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete_own" on zenith_fit.workouts for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Goals: session / minute / streak targets per week or month.
-- ---------------------------------------------------------------------------
create table zenith_fit.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  metric text not null check (metric in ('sessions', 'minutes', 'streak')),
  target int not null check (target > 0),
  period text not null check (period in ('week', 'month')),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on zenith_fit.goals to authenticated;
grant all on zenith_fit.goals to service_role;
alter table zenith_fit.goals enable row level security;

create index goals_user_id_idx on zenith_fit.goals(user_id);

create policy "goals_select_own" on zenith_fit.goals for select to authenticated using (user_id = auth.uid());
create policy "goals_insert_own" on zenith_fit.goals for insert to authenticated with check (user_id = auth.uid());
create policy "goals_update_own" on zenith_fit.goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on zenith_fit.goals for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Expose the schema to PostgREST (the Supabase client talks to it directly).
-- Preserves every schema already exposed for sibling apps in this project.
-- ---------------------------------------------------------------------------
alter role authenticator set pgrst.db_schemas = 'public, plant_care, calorie_tracker, quick_job_fit, study_buddy_planner, zenith_fit';
notify pgrst, 'reload config';
