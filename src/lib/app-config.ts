// App-level identity and contact settings used by foundation UI (footer, legal pages, auth page).
// Shared/isomorphic — safe for client and server. Other Isaly apps keep a file with this same
// shape; only the values differ.

export const APP_NAME = "Nordvital";

// Support address confirmed by Isaly on 2026-11-03.
export const SUPPORT_EMAIL = "support@isaly.se";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

// Version of the health-data consent text shown in the app (and in /privacy). Bump it when the
// wording changes in a way that needs a new consent; the version is stored with every grant.
export const HEALTH_CONSENT_VERSION = "2026-11-05";
