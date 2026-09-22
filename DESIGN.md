---
name: TruePace
description: Dark concrete, one signal, Atlas type.
colors:
  signal-red: "#ff5e56"
  asphalt-slate: "#8aa4c2"
  night-concrete: "#131417"
  surface: "#1c1e22"
  bone-ink: "#f2f1ee"
  muted-ink: "rgba(242, 241, 238, 0.62)"
  hairline: "rgba(242, 241, 238, 0.14)"
  ink-on-signal: "#17181b"
  muted-slab: "#24262b"
  danger: "#ff7a72"
  warn: "#dca045"
  accent-soft: "rgba(255, 94, 86, 0.16)"
  pine-soft: "rgba(138, 164, 194, 0.18)"
typography:
  display:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "clamp(2.6rem, 7vw, 4.15rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "clamp(1.85rem, 5vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "0.168rem"
  md: "0.224rem"
  lg: "0.28rem"
spacing:
  xs: "0.35rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.75rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.ink-on-signal}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.1rem"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.ink-on-signal}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.1rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  race-chip:
    backgroundColor: "transparent"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.55rem"
    height: "2rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.lg}"
    padding: "0.65rem 0.75rem"
---

# Design System: TruePace

## Overview

**Creative North Star: "The Dawn Crosswalk"**

One hard signal cutting through quiet city concrete at first light. TruePace looks like municipal type on night asphalt: Source Serif 4 for the words that matter, Source Sans 3 for everything you operate, IBM Plex Mono for times and units. The world is dark-only. Surfaces sit a step above the ground as tonal slabs, not lifted cards. Sport shows up as **pace**, never as gym chrome.

Density is editorial and phone-first. A screen is a few objects, not a dashboard of tiles. Most of the UI is Night Concrete, Surface, and Bone Ink. Signal Red is rare and structural: the wordmark's Pace, the active tab underline, mileage units, the primary action, quality and race focus. Asphalt Slate is the calm second voice — On track, long-run focus, the compass ring — never a second brand color fighting the red.

Confirmed visual rejections: light theme or a theme toggle; hover-lift; glass; sparkles; kicker pills; icon tiles; rounded-2xl SaaS softness; Outfit or Inter as identity type.

**Key Characteristics:**
- Dark-only Crosswalk: Night Concrete ground, Surface slabs, Signal Red as the one lamp
- Atlas split: serif display, sans UI, mono for clock values
- Flat / tonal depth — 1px hairlines, almost no shadow
- Signal objects: quiet slabs until the session, verdict, or primary CTA
- Hard corners (`0.28rem`) and Urban Compass mark with True + red Pace

## Colors

A near-black concrete field, one coral-red lamp, and a cool slate that reads as wet curb at dawn — not a fitness rainbow.

### Primary
- **Signal Red** (`signal-red`): The crossing lamp. Wordmark Pace, primary buttons, active nav underline / tab bar, mileage units, quality and race focus, today's plan-day outline. Rarity is the point.

### Secondary
- **Asphalt Slate** (`asphalt-slate`): The calm second voice. On-track verdict, long-run focus, compass ring, chart series. Never a competing brand accent and never used to "celebrate" a screen.

### Neutral
- **Night Concrete** (`night-concrete`): Page ground, sticky header, tab bar. The field everything sits on.
- **Surface** (`surface`): Cards, inputs, popovers — one tonal step up, same material.
- **Muted slab** (`muted-slab`): Recessed wells, week-day cells, hover fills.
- **Bone Ink** (`bone-ink`): Primary text and selected wayfinding.
- **Muted Ink** (`muted-ink`): Secondary copy, inactive nav, dates.
- **Hairline** (`hairline`): The only divider. 1px borders, header and tab-bar rules.
- **Ink on Signal** (`ink-on-signal`): Text and icons on Signal Red.

### Named Rules
**The One Signal Rule.** Signal Red occupies a small fraction of any screen. If a layout needs a second loud color, the layout is wrong.

**The Verdict Color Rule.** On track uses Asphalt Slate. At risk and Unlikely use Signal Red (Unlikely may use `danger`, a slightly hotter sibling — not green, not a traffic-light trio of equal weight). Do not color-code the word "track" as a brand.

## Typography

**Display Font:** Source Serif 4 (Georgia, ui-serif)
**Body Font:** Source Sans 3 (system-ui, ui-sans-serif)
**Label/Mono Font:** IBM Plex Mono (ui-monospace)

**Character:** Atlas is a newspaper-on-concrete pairing. The serif is compressed and optical, used only for display, headlines, and verdicts. The sans is the operating voice. Mono is reserved for values a runner would read off a clock.

### Hierarchy
- **Display** (700, `clamp(2.6rem, 7vw, 4.15rem)`, line-height 1.02): Landing title and the Forecast verdict word. Optical sizing on.
- **Headline** (700, `clamp(1.85rem, 5vw, 2.6rem)`, line-height 1.1): Today's session title, goal and onboarding titles, Today status verdict (slightly smaller at `1.35rem` when it sits as a status line).
- **Title** (650, `1.15rem`, letter-spacing `-0.02em`): Section titles, primary button labels.
- **Body** (400, `1rem`–`1.05rem`, line-height 1.5): Coaching copy and leads. Cap line length around 32–38rem / ~36–65ch.
- **Label** (650, `0.85rem`): Field labels, page titles in the muted register (`0.95rem`), focus tags.
- **Mono** (500, `0.75rem`–`0.85rem`): Mileage units, landing step numbers, clock-like fragments. Tabular nums on large mileage and times (`font-variant-numeric: tabular-nums`).

### Named Rules
**The Atlas Split Rule.** Serif never runs body copy. Sans never carries the verdict word. Mono never becomes a display face.

**The No-Eyebrow Rule.** No uppercase kicker labels above titles. Hierarchy is size, weight, and color — not a pill.

## Layout

Phone-first column on Night Concrete. The content measure is `min(1080px, calc(100% - 2rem))` centered. App pages pad `1rem` top and `1.75rem` bottom; landing hero is looser (`2.5rem` / `3.5rem` at `800px`).

Primary app chrome is a sticky header (logo, race chip, avatar) plus three destinations: Today, Plan, Forecast. Below `860px` those destinations are a sticky three-column tab bar with a top Signal Red rule on the active tab; at `860px` and up they become centered header text links with a 2px Signal Red underline. Goal and profile stay in the header, never in the tab set.

Rhythm is tight and repeating: `0.35rem` micro gaps, `0.75rem` intra-card, `1.25rem` card padding, `1.75rem` section breaks. Forms collapse to one column until `720px`. Landing splits hero and three steps at `800px`. Sticky plan days and week chrome use `scroll-margin-top: 4.75rem` so they clear the header.

KPI and scenario tiles are `auto-fit` grids with a `180px` / `160px` minimum — not a fixed dashboard.

## Elevation & Depth

This system is flat and tonal. Depth is Night Concrete vs Surface vs a 1px Hairline. App chrome, cards, and headers do not cast shadows.

### Shadow Vocabulary
- **Proof object** (`box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35)`): The signed-out landing forecast board only. Do not copy onto in-app cards.

### Named Rules
**The Flat Concrete Rule.** Surfaces are flat at rest. No hover-lift, no ambient card shadow, no glass. If something needs to feel current, use a 2px Signal Red outline with 2px offset (today's plan day, avatar focus), not a drop shadow.

## Shapes

Hard editorial rectangles. The system radius is `0.28rem` (with Tailwind steps `sm`/`md` as fractions of that). Corners are felt as almost-square, not soft product UI.

Borders are 1px Hairline, not rings (Surface cards explicitly drop the library ring). Avatars are the only circles (`999px`). Progress wells may go fully round; they are utility, not the form language.

Today's session is the largest object on its screen: a huge tabular mileage figure plus a serif title, not a card gallery. Plan days are the same slab as other cards, distinguished by border color (quality/race Signal Red, long Asphalt Slate, rest slightly faded) rather than new geometry.

## Components

Signal objects: most things are quiet slabs; only the session, the verdict, and the primary CTA take the lamp.

### Buttons
- **Shape:** Hard rectangle (`0.28rem`), `0.75rem 1.1rem`, sans 650, letter-spacing `-0.01em`. Transition `0.15s` on background, color, and border — no movement on the box.
- **Primary:** Signal Red fill, Ink on Signal text. Hover: `filter: brightness(1.05)` only.
- **Ghost:** Transparent, Hairline border, Bone Ink. Hover: border and text shift to Signal Red.
- **Focus:** `2px` Signal Red outline, `2px` offset (or the ring token at `rgba(255, 94, 86, 0.5)` on library controls).
- Library `Button` exists for sheets and dense chrome; branded actions in the product use the `.btn` pair above, not tiny `h-8` pills.

### Chips
- **Race chip:** Hairline rectangle in the header. Distance in Bone Ink, date in Muted Ink with tabular nums. Hover tints the border toward Signal Red. Not a filled pill.
- **Focus tags:** No border, no fill. Muted Ink by default; Signal Red for quality/race; Asphalt Slate for long. Weight 650, `0.85rem`.

### Cards / Containers
- **Corner Style:** System radius (`0.28rem`)
- **Background:** Surface on Night Concrete
- **Shadow Strategy:** None in the app (see Elevation)
- **Border:** 1px Hairline
- **Internal Padding:** `1.25rem` default; plan days `py-5` / `px-5`
- Surface cards override the library card's ring and shadow. Do not reintroduce `ring-1` or `rounded-xl` as the look.

### Inputs / Fields
- **Style:** Surface fill, 1px Hairline, radius ~`0.3rem`, padding `0.65rem 0.75rem`, Bone Ink, inherited sans.
- **Focus:** Caret is Signal Red; focus ring uses the Signal Red ring token.
- **Error:** `danger` text (`.form-error`). No colored glow fields.

### Navigation
- **Header:** Sticky Night Concrete, 1px Hairline bottom, `0.9rem` vertical padding. Brand mark `2.2rem` (`1.9rem` under `420px`). Wordmark: True in Bone Ink, Pace in Signal Red, 700, `1.15rem`.
- **Desktop (`860px+`):** Centered text links, `0.95rem` / 650. Inactive Muted Ink; active Bone Ink plus 2px Signal Red underline.
- **Mobile:** Three equal tabs, `0.78rem` / 650, 2px Signal Red rule on the active tab's top edge. Safe-area padding on the bottom.

### Today mileage (signature)
Huge tabular sans number (`clamp(3rem, 9vw, 4.4rem)`, 700, tracking `-0.04em`) with a mono Signal Red unit. Session title sits under it in display serif. Status is a hairline-separated line: serif verdict + muted projected/goal times. This is the home object — not a KPI row.

### Plan day (signature)
Same slab as other cards. Mileage is a large tabular figure; unit is mono Signal Red. Today is a 2px Signal Red outline, not a fill. Quality/race/long speak through border color only.

## Do's and Don'ts

### Do:
- **Do** keep the field dark-only: Night Concrete ground, Surface slabs, Hairline borders.
- **Do** spend Signal Red on the lamp jobs listed under Colors — then stop.
- **Do** set finish times, mileages, and units in IBM Plex Mono or tabular-nums sans, never in display serif.
- **Do** use the Urban Compass mark and True + Pace wordmark as drawn: red needle, slate ring, red Pace.
- **Do** treat shadcn primitives as scaffolding; brand through `.btn`, Surface cards, and the globals type/color tokens.

### Don't:
- **Don't** add a light theme, sun/moon toggle, or off-white marketing canvas.
- **Don't** hover-lift, glass, gradient mesh, sparkles, kicker pills, or icon tiles.
- **Don't** use Outfit, Inter, or a geometric sans as identity type.
- **Don't** spread the landing preview's drop shadow into app chrome.
- **Don't** brand the word "track," invent testimonials, or treat the landing preview times as a customer result.
- **Don't** let library `rounded-xl` / `rounded-4xl` badges become the default silhouette.
