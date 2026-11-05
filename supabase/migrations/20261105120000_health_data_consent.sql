-- Explicit, withdrawable consent for health data (GDPR art. 9(2)(a)).
--
-- Health data in Zenith Fit: profiles.limitations / limitation_notes,
-- workouts.physio_note (derived from the limitations) and the `soreness`
-- answer inside workouts.feedback.
--
-- * consent_events is an append-only log (proof of consent: who, when, which
--   text version). The current state is the latest row per user.
-- * Users change consent only through grant_health_consent() /
--   withdraw_health_consent(); they have no INSERT/UPDATE/DELETE privilege
--   on the table.
-- * withdraw_health_consent() also erases the health data listed above.
-- * Triggers make the database refuse NEW or CHANGED health data without a
--   granted consent, so the rule holds even if a client forgets to check.
--   Rows that already hold health data (entered before consent was asked
--   for) stay readable and can still be updated in their other columns; the
--   app does not use them until consent is given.
--
-- Rollback: supabase/rollback/20261105120000_health_data_consent.sql
-- Apply by hand (psql --single-transaction); do not use `supabase db push`.

create table zenith_fit.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  purpose text not null check (purpose = 'health_data'),
  action text not null check (action in ('granted', 'withdrawn')),
  version text not null check (length(version) between 1 and 40),
  created_at timestamptz not null default now()
);
-- No FK to auth.users on purpose: the shared user record belongs to every
-- Isaly app and the log is proof of consent that must outlive this app's data.

create index consent_events_user_idx on zenith_fit.consent_events (user_id, purpose, id desc);

alter table zenith_fit.consent_events enable row level security;
grant select on zenith_fit.consent_events to authenticated;
grant all on zenith_fit.consent_events to service_role;

create policy "consent_events_select_own" on zenith_fit.consent_events
  for select to authenticated using (user_id = auth.uid());

-- The log is append-only for everyone, including the service role.
create or replace function zenith_fit.consent_events_immutable()
returns trigger
language plpgsql
set search_path = zenith_fit, pg_temp
as $$
begin
  raise exception 'Samtyckeshistoriken kan inte ändras.' using errcode = 'P0001';
end;
$$;

create trigger consent_events_no_update_delete
  before update or delete on zenith_fit.consent_events
  for each row execute function zenith_fit.consent_events_immutable();

create trigger consent_events_no_truncate
  before truncate on zenith_fit.consent_events
  for each statement execute function zenith_fit.consent_events_immutable();

-- Current state: the latest event decides.
create or replace function zenith_fit.has_health_consent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = zenith_fit, pg_temp
as $$
  select coalesce(
    (select e.action = 'granted'
       from zenith_fit.consent_events e
      where e.user_id = p_user and e.purpose = 'health_data'
      order by e.id desc
      limit 1),
    false);
$$;

-- Service role only: the app reads its own consent_events rows, and callable-by-anyone would
-- let a user probe another user's consent status.
revoke all on function zenith_fit.has_health_consent(uuid) from public, anon, authenticated;
grant execute on function zenith_fit.has_health_consent(uuid) to service_role;

create or replace function zenith_fit.grant_health_consent(p_version text)
returns void
language plpgsql
security definer
set search_path = zenith_fit, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Du måste vara inloggad.' using errcode = '42501';
  end if;
  if zenith_fit.has_health_consent(auth.uid()) then
    return; -- already granted; keep the log free of duplicates
  end if;
  insert into zenith_fit.consent_events (user_id, purpose, action, version)
  values (auth.uid(), 'health_data', 'granted', p_version);
end;
$$;

-- Withdrawing erases the health data in the same transaction.
create or replace function zenith_fit.withdraw_health_consent(p_version text)
returns void
language plpgsql
security definer
set search_path = zenith_fit, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Du måste vara inloggad.' using errcode = '42501';
  end if;
  if not zenith_fit.has_health_consent(auth.uid()) then
    -- Nothing granted: still erase anything left over from before consent existed.
    null;
  else
    insert into zenith_fit.consent_events (user_id, purpose, action, version)
    values (auth.uid(), 'health_data', 'withdrawn', p_version);
  end if;

  update zenith_fit.profiles
     set limitations = '{}', limitation_notes = ''
   where id = auth.uid();

  update zenith_fit.workouts
     set physio_note = null
   where user_id = auth.uid() and physio_note is not null;

  update zenith_fit.workouts
     set feedback = jsonb_set(feedback, '{soreness}', '["none"]'::jsonb)
   where user_id = auth.uid()
     and feedback is not null
     and feedback ? 'soreness'
     and feedback->'soreness' <> '["none"]'::jsonb;
end;
$$;

revoke all on function zenith_fit.grant_health_consent(text) from public;
revoke all on function zenith_fit.withdraw_health_consent(text) from public;
grant execute on function zenith_fit.grant_health_consent(text) to authenticated;
grant execute on function zenith_fit.withdraw_health_consent(text) to authenticated;

-- Enforcement: no new or changed health data without a granted consent.
create or replace function zenith_fit.require_health_consent_profile()
returns trigger
language plpgsql
security definer
set search_path = zenith_fit, pg_temp
as $$
declare
  adds_health boolean;
begin
  -- Only NEW or CHANGED non-empty health data needs consent; clearing never does.
  adds_health :=
    (cardinality(new.limitations) > 0
       and (tg_op = 'INSERT' or new.limitations is distinct from old.limitations))
    or (btrim(new.limitation_notes) <> ''
       and (tg_op = 'INSERT' or new.limitation_notes is distinct from old.limitation_notes));
  if adds_health and not zenith_fit.has_health_consent(new.id) then
    raise exception 'Samtycke till hälsouppgifter saknas.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_require_health_consent
  before insert or update on zenith_fit.profiles
  for each row execute function zenith_fit.require_health_consent_profile();

create or replace function zenith_fit.require_health_consent_workout()
returns trigger
language plpgsql
security definer
set search_path = zenith_fit, pg_temp
as $$
declare
  new_soreness jsonb := coalesce(new.feedback->'soreness', '["none"]'::jsonb);
  old_soreness jsonb := '["none"]'::jsonb;
  adds_health boolean;
begin
  if tg_op = 'UPDATE' then
    old_soreness := coalesce(old.feedback->'soreness', '["none"]'::jsonb);
  end if;
  -- Only NEW or CHANGED non-empty health data needs consent; clearing never does.
  adds_health :=
    (new.physio_note is not null
       and (tg_op = 'INSERT' or new.physio_note is distinct from old.physio_note))
    or (new_soreness <> '["none"]'::jsonb and new_soreness <> '[]'::jsonb
       and new_soreness is distinct from old_soreness);
  if adds_health and not zenith_fit.has_health_consent(new.user_id) then
    raise exception 'Samtycke till hälsouppgifter saknas.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger workouts_require_health_consent
  before insert or update on zenith_fit.workouts
  for each row execute function zenith_fit.require_health_consent_workout();
