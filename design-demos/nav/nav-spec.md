# App navigation — design spec

## Product
Race Goal Forecaster authenticated app shell. Locked brand: Runna clarity sand canvas, Trail Pine `#1C2A22` / Terracotta `#C45C26` / Pine `#3F6B4F`, Package C fonts (Bricolage + Manrope + Plex Mono).

## Audience & scene
Recreational runners on phone-first. Nav must feel like apps they already use (Strava / Runna / fitness tabs) — icons + short labels, clear selected state, thumb-reachable primary actions.

## IA (user-specified)
1. **Home** — overview + path to edit goal  
2. **Training** — suggested weekly plan  
3. **Forecast** — verdict / KPIs / scenarios  
4. **Profile** — yearly mileage, avg pace, races completed this year  

## Assumptions (marked)
- Home ≠ marketing landing; it’s the signed-in hub with “Edit goal”.  
- Profile stats in mocks are placeholders until Strava aggregates land.  
- Forecast is the default “active” tab in demos for apples-to-apples compare.  
- Icons = simple inline SVG (no emoji, no icon font).  
- Output: mobile shell **390×844** HTML specimens (familiar phone chrome).

## Emotional tone
Coaching clarity, calm confidence — not dashboard chrome noise.

## Visual motif
Race-day clock / finish time remains the product signature inside content; nav stays quiet utility.

## Format
Three single-file HTML app shells with mutually different nav skeletons + Playwright screenshots.
