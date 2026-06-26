# AGENTS.md — nextjs-app (Fifa Pool)

## Quick start
- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- No lint / typecheck / test scripts in `package.json` (none configured)

## Architecture
- **Next.js 15 App Router**, `@/*` maps to `./src/*`
- **Supabase** is the database (group + knockout stages)
- Two betting phases toggled via `StageContext` (localStorage key: `fifa-pool-stage`):
  - **Group stage**: `init.sql` schema (tables: teams, matches, players, users, bets)
  - **Knockout stage**: migration in `supabase/migrations/` (tables: rounds, knockout_matches, odds_snapshots, token_ledger, investment_ledger)
- All pages / components are `'use client'`
- API routes use `getServiceClient()` (`src/lib/supabase.ts:9`) — server-only Supabase service-role client

## Environment variables (see `.env.local.example`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public
- `SUPABASE_SERVICE_ROLE_KEY` — seed scripts + API routes (server-only)
- `ODDS_API_KEY` — The Odds API (knockout fixture fetching + odds snapshots)
- `BETTING_ENABLED=false` — disables group-stage betting POST

## Seed scripts (run from project root)
- `node scripts/seed.mjs` — reads `team_metadata.csv`, `rosters.csv`, `odds.csv` from `../` (or `--data-dir`)
- `node scripts/seed-knockout.mjs` — seeds round definitions (6 rounds), then `--fetch-fixtures` for real Odds API data
- Both require `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in environment

## Knockout admin flow (manual steps, also automated by cron)
1. **Seed rounds** → `seed-knockout.mjs`
2. **Fetch fixtures** → `POST /api/knockout/admin/assign-fixtures`
3. **Open window** → `POST /api/knockout/admin/open-window` (credits tokens)
4. **Users invest** tokens on teams via `POST /api/knockout/invest`
5. **Snapshot odds** → `POST /api/knockout/admin/snapshot-odds`
6. **Close window** → `POST /api/knockout/admin/close-window` (auto-allocates unspent tokens)
7. **Set winners** → `POST /api/knockout/admin/set-winner` / `fetch-results`
8. **Resolve tournament** → `POST /api/knockout/admin/resolve-tournament`
- Vercel Cron (`vercel.json`) runs `GET /api/knockout/cron` hourly — auto-starts tournament, closes deadline-expired windows, snapshots odds. Idempotent.

## Routes
- `/` — GroupBetting or KnockoutBetting (based on stage)
- `/admin` — AdminMatchManager or KnockoutAdmin
- `/dashboard` — Leaderboard + DashboardChart or KnockoutDashboard
- `/audit` — AuditTable or KnockoutAudit
- API: `/api/matches`, `/api/bets`, `/api/leaderboard`, `/api/users`, `/api/chart`, `/api/betting-status`, `/api/knockout/*`
