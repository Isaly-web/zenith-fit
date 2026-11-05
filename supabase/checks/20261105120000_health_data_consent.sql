select to_regclass('zenith_fit.consent_events') is not null
   and to_regprocedure('zenith_fit.grant_health_consent(text)') is not null
   and to_regprocedure('zenith_fit.withdraw_health_consent(text)') is not null;
