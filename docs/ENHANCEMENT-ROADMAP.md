# Enhancement Roadmap (Brainstorm)

Status: draft for planning — no implementation committed yet.  
Captured after the standalone extract (2026-07-23).

## Current baseline

- Static Chart.js dashboard + baked JSON
- Local Python pipeline: Strava fetch → monthly/weekly aggregates → BQ projection
- Manual refresh via scripts / `weekly_refresh.ps1`
- Verified: 245 runs, 5 charts, dark/light toggle, pytest 21 passing

## Friction / gaps noticed

1. Race history and BQ narrative are hard-coded HTML, not derived from data
2. Theme toggle does not re-render Chart.js colors (charts keep colors from first paint)
3. No favicon; bare local server story for sharing
4. Projection model uses monthly *training* pace; narrative argues from *race* results — two stories that can disagree
5. Refresh still requires local Python + git commit; no one-click update
6. Portfolio still hosts a separate copy — two sources of truth until linked/replaced

## Ranked enhancement themes

Priority is personal-tool value first, then deployability, then productization.

### P1 — Polish the personal tool (highest leverage)

| Idea | Why |
|------|-----|
| Drive race history + BQ cards from JSON | One source of truth; easier refresh |
| Re-init charts on `themechange` | Dark mode feels finished |
| Clarify BQ model: race-based vs training-pace regression | Honesty of the projection story |
| Favicon + basic meta / OG for sharing | Small but complete |

### P2 — Deploy & sync

| Idea | Why |
|------|-----|
| GitHub Pages or Vercel static deploy | Shareable URL independent of portfolio |
| Scheduled refresh (GitHub Action + Strava secrets) | Kill manual weekly ritual |
| Portfolio links out to standalone deploy (or iframe) | End dual-copy drift |

### P3 — Richer analysis

| Idea | Why |
|------|-----|
| Workout type split (easy / long / workout / race) | Better training insight |
| HR zones / efficiency over time (not just scatter) | Fitness signal |
| Race calendar + predicted vs actual | Ties narrative to data |
| Rolling fitness / fatigue (simple CTL-style) | Forward-looking training load |

### P4 — Stack / product (defer)

| Idea | Why defer |
|------|-----------|
| Vite + React rewrite | Current static stack works; rewrite only if UX scope balloons |
| Multi-athlete auth / SaaS | Different product; not needed for personal BQ tracking |
| Live on-demand Strava OAuth in-browser | Heavier backend; scheduled offline refresh covers personal use |

## Suggested next planning step

Pick **one** track for a focused implementation plan:

1. **P1 polish pack** — race data JSON, chart theme re-render, BQ model clarity  
2. **P2 deploy + Action refresh** — ship a public URL and automate data  
3. **P3 one new analysis panel** — e.g. workout-type mix or race calendar  

Recommendation: start with **P1**, then **P2**, so the standalone app is truthful and shareable before adding charts.
