# Race Goal Forecaster

Free Strava-connected race finish-time forecaster. Set a goal distance, target time, race date, and training posture (Conservative / Balanced / Aggressive) to see if you're on track.

## Live

- App: [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)
- Repo: [https://github.com/calvinadaniel/race-goal-forecaster](https://github.com/calvinadaniel/race-goal-forecaster)
- Release notes: [CHANGELOG.md](./CHANGELOG.md) · [v1.1.0](https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.1.0)

Pushes to `master` deploy via the linked Vercel project.

Before Strava login works in production, set these in the Vercel project env and run `npm run db:push` against Neon:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_STRAVA_ID`
- `AUTH_STRAVA_SECRET`
- `AUTH_URL=https://race-goal-forecaster.vercel.app`

Register Strava callback domain for the Vercel host (`race-goal-forecaster.vercel.app`).

## Stack

- Next.js App Router (Vercel)
- Auth.js + Strava OAuth
- Neon Postgres + Drizzle ORM
- TypeScript forecast engine (Riegel equivalency)

## Setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Create a [Neon](https://neon.tech) database and set `DATABASE_URL`.

3. Create a [Strava API app](https://www.strava.com/settings/api). Set authorization callback domain to your host (e.g. `localhost` for local, your Vercel domain in production). Auth.js uses `/api/auth/callback/strava`.

4. Set `AUTH_STRAVA_ID`, `AUTH_STRAVA_SECRET`, and `AUTH_SECRET` (e.g. `openssl rand -base64 32`).

5. Push schema and run:

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

- Strava is the only activity source in MVP (`ActivitySource` interface is ready for Garmin/COROS/Apple later).
- Cold start: requires ~8 weeks of history + a quality effort, or a manual baseline race.
- Legacy static dashboard + Python scripts remain under `index.html`, `css/`, `js/`, `data/`, `scripts/` as reference only.

## Disclaimer

Estimates only — not coaching or medical advice.
