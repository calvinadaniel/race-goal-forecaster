# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a recreational runner training alone for a specific race time. Typical scene: a phone, before or after a run, checking what today's session is and whether the race goal is still honest.

Not the design center: coaches, clubs, or training partners reviewing someone else's plan.

## Product Purpose

TruePace tells a runner whether they are on track for a goal finish time, and what to run today on the way there.

Success: they know today's session in seconds, and they trust the on-track / at-risk / unlikely verdict enough to commit to or change the training block.

## Positioning

Goal-first race forecast: set distance, target time, race date, and training posture, then see a verdict before committing to the block. The mechanism is a Riegel-equivalency forecast from a required recent baseline race (deepened by optional Strava history), plus a calendar-locked plan with Conservative / Balanced / Aggressive posture. Neighboring training apps log runs or prescribe workouts without that honest finish-time verdict as the product's primary signal.

Tagline: See if you'll hit your goal time.

## Operating Context

Phone-first authenticated app. Daily path: Today (this session + one-line verdict) → Plan (full calendar) or Forecast (verdict, scenarios, why). Goal and account live off the primary tabs (race chip / avatar).

Cold start: Google sign-in or optional Strava sign-in, then onboarding with a manual baseline race. Google accounts can connect Strava later for synced history. Training plan stays a draft until the runner starts it on a Monday; after start, weeks follow the calendar.

Estimates only — not coaching or medical advice. That disclaimer is user-facing and durable.

## Capabilities and Constraints

Confirmed:

- Free web app. Google is the primary account. Strava is an optional landing sign-in and an optional connection for activity sync.
- Distances: 5K, 10K, Half, Marathon. Units: miles or kilometers. Posture: Conservative / Balanced / Aggressive.
- Forecast verdicts: On track / At risk / Unlikely, with projected time vs goal, intensity what-ifs, and a written why.
- Training plan through race day; Start / Reschedule / Back to draft; posture preview before apply; term glossary on plan copy; CSV export.
- Manual baseline is required to forecast. Strava history sharpens the read when linked; it does not replace the baseline at cold start.
- First ship scope: product UI. Keep the current GitHub/Vercel URL (`race-goal-forecaster`) for now; no domain or callback-host rename in this record.

Undecided:

- Public marketing site beyond the signed-out landing, domain rename, and repo rename.

## Brand Commitments

- Name: **TruePace** (that casing everywhere). Wordmark: True + signal-red Pace.
- Mark: Urban Compass (street-grid compass, signal-red needle, asphalt-slate ring). Files: `public/logo-mark.svg`, `src/app/icon.svg`, inline SVG in `BrandLogo`.
- Identity constraints the user locked: dark only (no light theme, no toggle); Crosswalk signal red `#ff5e56` with asphalt slate `#8aa4c2`; editorial/hard shape; Atlas type (Source Serif 4 display, Source Sans 3 UI, IBM Plex Mono for times).
- Tone: urban / editorial; course confidence, not punitive. Sport is lightly explicit via **pace**.
- Do not brand "track" even though the verdict is "On track."

## Evidence on Hand

- Live product: https://race-goal-forecaster.vercel.app
- Forecast engine and plan generator in `src/lib/forecast/` (unit-tested). Demo runner exists for local `AUTH_DEV_BYPASS=1`.
- Landing preview card uses illustrative finish times, labeled as a preview — not a customer result.
- No testimonials, named athletes, press, or third-party race results. Future work must not invent them.

## Product Principles

1. The first thing on screen is what to run today and whether the race is still honest.
2. The verdict is the product. Do not bury it behind logging, social, or dashboard chrome.
3. Claims stay uninventable: estimates only, no coaching or medical advice, no fake proof.
4. Depth is progressive: Today, then Plan or Forecast, then goal and account.
5. Familiar running-app affordances over invented ones; brand lives in precise details, not decoration.
