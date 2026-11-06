-- ROLLBACK for 20261105120000_delete_account_app_data.sql. Run as role postgres.
-- Drops zenith_fit.delete_account_app_data(). Deletes no data.
-- Only drop it when no deployed build calls it (the profile page would then fail to delete).
begin;
drop function if exists zenith_fit.delete_account_app_data();
commit;
