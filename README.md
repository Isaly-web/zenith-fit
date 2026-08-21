# Zenith Fit AI — Nordvital

An adaptive AI fitness & physiotherapy coach. Pick a time of day, how long you
have and one or more workout categories — the coach builds a session from
your recovery, recent difficulty ratings, weekly frequency and any physical
limitations, and screens every exercise against those limitations, swapping
in safer alternatives automatically.

> Migrated out of [Lovable](https://lovable.dev) into this repository,
> following the same architecture as the other Isaly apps (see below).

## Stack

- **TanStack Start + React 19 + TypeScript**, mobile-first, Bun tooling
- **Tailwind CSS v4** + shadcn/ui (`new-york` style) on Radix primitives
- **Supabase** (shared Isaly project `isaly-apps-prod`) — own `zenith_fit`
  Postgres schema, RLS on all user data, Supabase Auth (email + password)

## Architecture

The rule-based coaching engine is deliberately separate from persistence and
UI, so a real LLM, wearable integrations or more exercises can be added later
without touching the routes:

```
src/
  lib/fitness/
    types.ts     ← domain types (Workout, Feedback, Profile, Goal, ...)
    catalog.ts    ← workout types + exercise library (add exercises here)
    engine.ts     ← pure functions: readiness score, physio screening,
                    session generation, weekly plan, stats — no I/O
    store.tsx     ← FitnessProvider: loads/writes Supabase, exposes the
                    same FitnessState shape the routes already expect
  integrations/supabase/
    client.ts         ← browser client (publishable key, RLS applies)
    client.server.ts  ← service-role client for trusted server code only
    types.ts           ← generated Database types for the zenith_fit schema
  routes/
    login.tsx, reset-password.tsx   ← public
    _authenticated/                  ← everything else; redirects to /login
                                        without a Supabase session
```

**Readiness & physio screening** (`src/lib/fitness/engine.ts`) take
`(state, input) -> Workout` and are pure/testable. Scoring factors in rest
days, sessions in the last 7 days, recent difficulty/energy ratings and
reported soreness; `physioScreen()` swaps out any exercise that loads a
limited body area for a regression or a same-category alternative.

## Database

See [`docs/data-model.md`](docs/data-model.md) for the full schema. Short
version: everything lives in the **`zenith_fit`** Postgres schema in the
shared Supabase project `isaly-apps-prod` — the same project used by
`happy-hen-history`, `plant-care-assistant`, `calorie_tracker`,
`instant-job-insight` and `study-buddy-planner`, each isolated in its own
schema. RLS restricts every table to `user_id = auth.uid()` (or `id =
auth.uid()` for `profiles`).

Migrations: [`supabase/migrations`](supabase/migrations).

## Getting started

```sh
cp .env.example .env   # fill in the real isaly-apps-prod values
bun install
bun run dev
```

Create an account on `/login`, then `/new` to generate your first session.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase
