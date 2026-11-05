drop trigger if exists workouts_require_health_consent on zenith_fit.workouts;
drop trigger if exists profiles_require_health_consent on zenith_fit.profiles;
drop function if exists zenith_fit.require_health_consent_workout();
drop function if exists zenith_fit.require_health_consent_profile();
drop function if exists zenith_fit.withdraw_health_consent(text);
drop function if exists zenith_fit.grant_health_consent(text);
drop function if exists zenith_fit.has_health_consent(uuid);
drop table if exists zenith_fit.consent_events;
drop function if exists zenith_fit.consent_events_immutable();
