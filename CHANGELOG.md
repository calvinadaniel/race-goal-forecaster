# Changelog

All notable changes to Race Goal Forecaster are documented here.

## [1.0.0] — 2026-07-24

First public release of **Race Goal Forecaster** — a free Strava-connected app that forecasts race finish times and suggests a training plan through race day.

**Live:** [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)

### Product

- Sign in with Strava (OAuth = account)
- Set a race goal: distance (5K / 10K / half / marathon), target time, race date, and training posture (Conservative / Balanced / Aggressive)
- Manual baseline race option when Strava history is thin
- Sync runs from Strava (last ~18 months)

### Forecast

- On-track / at-risk / unlikely verdict from Riegel-based fitness equivalency
- Projected finish vs goal, confidence, and “why this forecast”
- Actionable tips to close the gap
- KPI strip: gap to goal, fitness ratio, volume score
- Intensity scenarios (Conservative / Balanced / Aggressive)
- Weekly volume chart
- This week’s training suggestion
- Recent activities list

### Training

- Full suggested plan from today through race day (Base → Build → Peak → Taper)
- Week-by-week mileage and day focuses (easy, quality, long, rest, race)
- **Export training plan** as CSV

### Profile

- Strava profile photo (proxied) and display name
- YTD mileage, average pace, races completed, activity count
- Recent activities

### App shell & design

- Landing page (Runna-clarity direction)
- Typography: Bricolage Grotesque + Manrope + IBM Plex Mono
- Brand: Trail Pine + Terracotta
- Light / dark theme
- Bottom-tab navigation: Training · Forecast · Profile
- Edit goal from the header

### Stack

- Next.js App Router on Vercel
- Auth.js + Strava OAuth
- Neon Postgres + Drizzle ORM
- TypeScript forecast engine with unit tests

### Notes

- Estimates only — not coaching or medical advice
- Place data is not available from Strava; “races completed” means activities marked as race
- Garmin / COROS / Apple Health are not connected yet (`ActivitySource` is ready for later)

[1.0.0]: https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.0.0
