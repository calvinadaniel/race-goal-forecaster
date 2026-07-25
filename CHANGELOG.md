# Changelog

All notable changes to Race Goal Forecaster are documented here.

## [1.2.0] — 2026-07-24

Brand mark in the header, and richer recent-activity stats.

**Live:** [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)

### Brand

- Cropped compass logo mark in the top-left (wording removed from the asset)
- **Race Goal Forecaster** wordmark sits to the right of the mark on landing and in-app

### Forecast & Profile

- Recent activities show **distance · time · pace** (respects mi/km units)

## [1.1.1] — 2026-07-24

Marathon (and half) long-run progression fix.

**Live:** [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)

### Training

- Long runs no longer capped by a flat `% of weekly volume` alone (that peaked marathon longs around **11 mi**)
- Absolute long-run targets by distance: **marathon → ~20 mi**, half → ~14 mi (pre-taper)
- Weekly peak volume raised so those longs fit in the week
- Longs still ramp early → peak → taper/deload

## [1.1.0] — 2026-07-24

Progressive training plans and a clearer Forecast history view.

**Live:** [https://race-goal-forecaster.vercel.app](https://race-goal-forecaster.vercel.app)

### Training

- Weekly volume now **builds toward race day** (ramp → peak → taper), instead of repeating a flat week
- Deload every 4th build week
- Quality sessions and long-run finish work **advance** through the plan (reps, titles, race-pace finish)

### Forecast

- **Weekly volume** and **Recent activities** sit side by side on larger screens
- Volume bars are **color-coded by height** (low → pine → terracotta peak)
- Hover tooltips show the week date and exact mileage (mi/km)

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

[1.2.0]: https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.2.0
[1.1.1]: https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.1.1
[1.1.0]: https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.1.0
[1.0.0]: https://github.com/calvinadaniel/race-goal-forecaster/releases/tag/v1.0.0
