# Race Goal Forecaster

Free Google-account race finish-time forecaster (optional Strava sync). Set a goal distance, target time, race date, and training posture (Conservative / Balanced / Aggressive) to see if you're on track.

## Live

- App: [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)
- Repo: [https://github.com/calvinadaniel/race-goal-forecaster](https://github.com/calvinadaniel/race-goal-forecaster)
- Release notes: [CHANGELOG.md](./CHANGELOG.md) · [v1.7.0](https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.7.0)

Pushes to `master` deploy via the linked Vercel project.

Before login works in production, set these in the Vercel project env and run `npm run db:push` against Neon:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_STRAVA_ID` (optional sync + legacy Strava sign-in)
- `AUTH_STRAVA_SECRET`
- `AUTH_URL=https://race-goal-forecaster.vercel.app`

Google OAuth redirect: `https://race-goal-forecaster.vercel.app/api/auth/callback/google`  
Strava callback domain: `race-goal-forecaster.vercel.app`

## Stack

- Next.js App Router (Vercel)
- Auth.js + Google OAuth (primary) + optional Strava
- Neon Postgres + Drizzle ORM
- TypeScript forecast engine (Riegel equivalency)

## Setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Create a [Neon](https://neon.tech) database and set `DATABASE_URL`.

3. Create a [Google Cloud OAuth client](https://console.cloud.google.com/apis/credentials) (Web application). Add authorized redirect URI `http://localhost:3000/api/auth/callback/google` (and your production `/api/auth/callback/google`).

4. Optionally create a [Strava API app](https://www.strava.com/settings/api) for synced activities. Auth.js uses `/api/auth/callback/strava`.

5. Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and Strava keys if using sync.

6. Push schema and run:

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Next.js server |
| `npm test` | Forecast engine unit tests |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run build` | Production build |

## Product notes

- Primary sign-in is Google; Strava is an optional connection for activity sync.
- Cold start: a manual baseline race is required at onboarding; Strava history deepens the forecast when linked.
- Legacy static dashboard + Python scripts remain under `index.html`, `css/`, `js/`, `data/`, `scripts/` as reference only.

## Disclaimer

Estimates only — not coaching or medical advice.
