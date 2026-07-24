# Direction approved

**Winner:** Direction 3 — Runna Clarity (landing)  
**Nav winner:** Direction B — Bottom tabs  
**Chosen by:** user  
**Date:** 2026-07-23

## Landing
- Light sand canvas, rounded coaching cards, week strip, verdict-first hierarchy.
- Fonts: Package C — Bricolage Grotesque + Manrope + IBM Plex Mono

## App navigation (user: “B”)
- Bottom tab bar: Training / Forecast / Profile (Home removed)
- Icons + labels; active state in terracotta
- Edit goal in header (not a tab)
- `/app` redirects to `/app/forecast`

## Carry into production
- Sand `#F7F3EB` / surface `#EFE8DC` / pine `#1C2A22` / terracotta `#C45C26`
- Shared `AppShell` with sticky header + bottom tabbar
- Routes: `/app` (home), `/app/training`, `/app/forecast`, `/app/profile`, `/app/goal` (edit)
