# TruePace Strava CLI

**Date:** 2026-09-17
**Status:** Ready for review
**Product:** TruePace (Race Goal Forecaster)

## Problem

TruePace users can connect Strava only in the browser (Google primary, Strava optional). There is no first-class command-line client. The repo’s Python `scripts/strava_auth.py` is a personal one-shot that writes a refresh token into `scripts/.env` and is not a product.

## Goal

Ship a `truepace` CLI in this repo so a runner can **log in with Strava** (no Google), then **forecast and print a plan** from their Strava history using the existing TypeScript engine, locally.

Success: after `truepace login` and the goal/baseline prompts, `truepace forecast` prints an honest verdict (on track / at risk / unlikely, projected vs goal, short why) and `truepace plan` prints the training block as text.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Audience | TruePace users, not only local ops |
| Identity | Strava is the CLI identity. No Google. No Neon `users` row. |
| v1 commands | `login`, `logout`, `whoami`, `forecast`, `plan` |
| Inputs | Interactive prompts for distance, goal time, race date, posture, and a **manual** baseline race (same facts as the web). Persist to `goal.json` so later runs skip prompts unless they re-run setup. |
| Forecast/plan | Run in-process via `src/lib/forecast`. Fetch activities from Strava with the access token. Do not upload activities to TruePace. |
| Login | TruePace **token broker**. Client secret never ships in the CLI. |
| Callback | Production Strava app callback domain stays the website. CLI uses a ticket + loopback, not `localhost` as Strava’s redirect URI. |
| Refresh | Also via the broker (`POST /api/cli/strava/refresh`). |
| Home | This repo. `npm run truepace -- <cmd>`. Not a published npm package in v1. |
| Out of v1 | Google login, linking CLI identity to a web account, CSV export, start/reschedule plan, Strava write scopes, global `npx truepace` package, replacing the Python scripts. |

## Architecture

The CLI has two network peers:

1. **TruePace (login and token refresh only).** Holds `AUTH_STRAVA_ID` / `AUTH_STRAVA_SECRET`.
2. **Strava API (activities).** Bearer access token. No client secret.

Default API base: `https://race-goal-forecaster.vercel.app`. Override with `TRUEPACE_API` (e.g. `http://localhost:3000` while developing the broker).

```
truepace login
  → loopback listener on 127.0.0.1:<ephemeral>
  → browser {API}/api/cli/strava/start?redirect=http://127.0.0.1:<port>/callback
  → Strava authorize (scope activity:read_all)
  → {API}/api/cli/strava/callback exchanges code, stores one-time ticket
  → 302 to loopback ?ticket=
  → CLI POST /api/cli/strava/redeem
  → ~/.truepace/credentials.json

truepace forecast | plan
  → refresh if needed via broker
  → prompt goal if missing
  → GET Strava /athlete/activities (paginated, runs only)
  → src/lib/forecast
  → stdout
```

## Components

### CLI (`src/cli/`)

| Unit | Job |
|------|-----|
| `index.ts` | Parse argv; dispatch; process exit codes. No I/O policy. |
| `auth.ts` | Bind loopback, open browser, redeem ticket, call refresh. |
| `store.ts` | Read/write `~/.truepace/credentials.json` and `goal.json`; mkdir; owner-only file mode. |
| `prompts.ts` | Interactive goal + baseline + posture. |
| `print.ts` | Human-readable whoami, verdict, plan text. |
| `strava.ts` | List/normalize activities with an access token (shared helpers with `src/lib/strava.ts` where practical). |

Invoke: `"truepace": "tsx src/cli/index.ts"` in `package.json`. Add `tsx` as a devDependency if missing.

### Broker (Next.js App Router)

| Route | Job |
|-------|-----|
| `GET /api/cli/strava/start` | Validate `redirect` is `http://127.0.0.1:<port>/callback`. Sign `{redirect, nonce, exp}` into `state`. 302 to Strava authorize. |
| `GET /api/cli/strava/callback` | Verify `state`. Exchange `code` with Strava (`redirect_uri` = this callback URL). Insert ticket row. 302 to loopback with `ticket`. |
| `POST /api/cli/strava/redeem` | Body `{ ticket }`. Return tokens + athlete once. Delete row. |
| `POST /api/cli/strava/refresh` | Body `{ refresh_token }`. Return rotated tokens. |

Authorize `redirect_uri` is always `{AUTH_URL}/api/cli/strava/callback` (production or local AUTH_URL), never the loopback URL.

### Ticket table (`cli_strava_tickets`)

Serverless isolates cannot share in-memory maps. Persist tickets in Neon:

- `id` text PK (unguessable)
- `payload` jsonb: `{ access_token, refresh_token, expires_at, scope, athlete }`
- `expires_at` timestamptz
- `created_at` timestamptz

TTL **2 minutes**. Single redeem (delete on success). Expired rows may be deleted lazily on insert/redeem.

No `users` / `accounts` row for CLI login. Website Google identity is unchanged.

### Local files

`~/.truepace/credentials.json`:

```json
{
  "athlete": { "id": 0, "username": "", "firstname": "", "lastname": "" },
  "access_token": "",
  "refresh_token": "",
  "expires_at": 0,
  "scope": "activity:read_all"
}
```

`~/.truepace/goal.json`: same fields the web onboarding collects (distance key, goal time, race date, posture, baseline distance/time/date, units). Schema matches what `src/lib/forecast` already consumes — do not invent a parallel goal model.

## Data flow

### Login

1. CLI binds `127.0.0.1:<ephemeral port>/callback` (try the next port if bind fails).
2. Opens `{TRUEPACE_API}/api/cli/strava/start?redirect=...`
3. User authorizes `activity:read_all` (approval_prompt=auto).
4. Callback exchanges the code, writes the ticket, redirects to loopback.
5. CLI redeems, writes credentials with restrictive mode, prints athlete name and id.

### Forecast / plan

1. Load credentials. If missing → exit 1, tell them to `login`.
2. If `expires_at` is within 60s, refresh via broker and rewrite the file (keep a new refresh token if Strava rotates it).
3. If `goal.json` missing, run prompts and write it. (`truepace forecast --reset-goal` re-prompts.)
4. Page Strava activities; keep runs with the same filters as the web source.
5. Call existing forecast (and plan builder for `plan`).
6. `forecast` prints verdict, projected vs goal, short why, estimates-only line. `plan` prints this week, then remaining weeks as text (weekday, focus, mileage, title) — not the web calendar UI.

### Logout / whoami

- `logout` deletes `credentials.json`. Goal file stays unless `--all`.
- `whoami` refreshes if needed, then prints athlete from credentials (GET `/athlete` if the file has no name).

## Error handling

| Case | Behavior |
|------|----------|
| User denies Strava / missing `activity:read_all` | Exit 1. Do not store a token with a weaker scope. |
| Ticket expired, unknown, or already redeemed | Exit 1: run `login` again. |
| Refresh 4xx | Delete access token; tell them to `login` again. Keep goal.json. |
| Broker unreachable | Exit 1 with the API URL tried. |
| Strava 429 | Retry with backoff (max 3), then fail. |
| Strava 5xx | Fail with status; do not wipe credentials. |
| Invalid `redirect` query (not loopback callback) | Start route returns 400. Never 302 to an arbitrary origin. |
| State HMAC fail / expired | Callback returns 400 HTML. No ticket. |
| Loopback timeout (no browser return) | ~2 minutes, then exit 1. |
| Forecast with too little history | Engine’s existing empty/sparse behavior; print that, not a fake verdict. |

Estimates-only disclaimer prints on `forecast` and `plan`. No coaching/medical claims. No invented proof.

## Testing

No live Strava or browser in CI.

- **Store:** write/read credentials and goal; missing file; refresh-token rewrite.
- **State:** sign/verify; reject tamper, expiry, non-loopback redirect.
- **Tickets:** redeem once; second redeem fails; expired ticket fails.
- **Broker routes:** mock Strava token HTTP; start → callback → redeem; refresh rotation.
- **CLI auth:** mock redeem + loopback handler; do not open a real browser in unit tests.
- **Forecast wiring:** fixture activities + goal.json → known verdict via the existing engine tests’ style.

`npm test` covers these. Manual check: `TRUEPACE_API=http://localhost:3000 npm run truepace -- login` against local Next.

## Security notes

- Client secret stays in Vercel / `.env.local` only.
- Tickets are bearer capabilities; TTL 2 minutes, one use.
- `state` is HMAC-signed with `AUTH_SECRET` and includes the loopback redirect.
- Credentials file is user-only (Windows: restrict ACL analogously).
- Refresh endpoint must not log tokens. Rate-limit redeem/refresh per IP in v1 with a simple in-route throttle if cheap; otherwise rely on Strava + short TTL and add a limiter if abused.

## Non-goals (repeat)

Do not replace Auth.js Google login. Do not write CLI tokens into `accounts`. Do not resurrect `scripts/strava_auth.py` as the product path. Do not publish to npm in this spec.
