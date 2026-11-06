-- Isaly App Foundation: "Delete my data" that never touches the shared auth user.
--
-- auth.users is shared by every Isaly app. Deleting the auth user would cascade into the other
-- apps' data, so this function deletes ONLY Nordvital's own rows for the caller, in one
-- transaction. The shared login is removed by a separate central process (not defined yet).
-- Idempotent: running it again finds nothing to delete. The app creates an empty profile again
-- if the person signs back in (src/lib/fitness/store.tsx).
--
-- This app stores no files, so there is no Storage cleanup.
-- Keep the table list in sync with every table in zenith_fit that references auth.users
-- (src/lib/account.test.ts fails otherwise).
-- Rollback: docs/delete-account-app-data-rollback.sql.
begin;

create or replace function zenith_fit.delete_account_app_data()
returns void
language plpgsql
security definer
set search_path = zenith_fit, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from zenith_fit.workouts where user_id = v_uid;
  delete from zenith_fit.goals where user_id = v_uid;
  delete from zenith_fit.profiles where id = v_uid;
end;
$$;

revoke all on function zenith_fit.delete_account_app_data() from public, anon;
grant execute on function zenith_fit.delete_account_app_data() to authenticated;

commit;
