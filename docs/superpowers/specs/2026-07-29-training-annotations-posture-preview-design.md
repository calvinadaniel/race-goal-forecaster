# Training annotations + posture plan preview

**Date:** 2026-07-29  
**Status:** Approved for implementation planning  
**Product:** TruePace (race-goal-forecaster)

## Problem

New runners hit jargon in training days (strides, tempo, quality, taper) with no in-context help. Separately, Conservative / Balanced / Aggressive only changes the saved goal via Edit goal; Forecast “what if” cards show finish time only—users cannot preview how the **plan** changes or apply a posture in one tap.

## Goals

1. **Inline annotations** — explain training terms where they appear; no separate glossary page.
2. **Posture preview + apply** — on Training, switch posture to regenerate the full plan preview; one tap applies it to the saved goal.

## Non-goals (this round)

- Editing or swapping individual plan days
- Side-by-side two full plans on one screen
- Standalone glossary / help page
- Making Forecast scenario cards interactive (finish-time only; optional link later)
- New activity-sync / Strava surfaces

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Annotation UX | Inline only — tap term or ⓘ → short definition sheet |
| Posture UX | Preview + one-tap Apply |
| Primary surface | Training page |
| Content model | Curated term catalog + highlight/match at render; optional `termIds` on stubborn days later |

## Design

### A. Term catalog

**Location:** `src/lib/training/glossary.ts` (or similar)

Each term:

```ts
type GlossaryTerm = {
  id: string;           // e.g. "strides"
  label: string;        // display title
  aliases?: string[];   // phrases to match in titles/details
  short: string;        // 1–2 sentences for the sheet
  feel?: string;        // optional “how it should feel”
};
```

**Initial set (~12–20):** strides, quality, easy, tempo, intervals, long run, recovery / jog recoveries, goal pace, optional, rest, base, build, peak, taper, deload, race-pace / race-pace sharpeners.

Tone: concrete, beginner-friendly, no coaching medical claims. Align with existing disclaimer.

### B. Annotation UI

**Component:** `TermHelpSheet` (or `TrainingTermSheet`) + small `AnnotatableText` helper.

- Scan session **title** and **detail** for catalog aliases (case-insensitive, longest-match-first).
- Matched spans are tappable (underline or accent); optional ⓘ beside focus badge for focus-level terms (`quality`, `easy`, `long`, `rest`, `optional`).
- Sheet: term label, `short`, optional `feel`, dismiss.
- Reuse on:
  - Training page day cards
  - Forecast “This week's suggestion” day cards

**Infrastructure:** Project already has Radix Tooltip + shadcn patterns; prefer a **sheet/dialog** over tooltip for readable multi-sentence copy on mobile.

No dedicated glossary route.

### C. Posture preview + apply (Training)

**State**

- `savedIntensity` from goal (`data.goal.intensity`)
- `previewIntensity` local state (defaults to saved)
- When `previewIntensity !== savedIntensity`, show preview banner

**Plan regeneration**

- Thin API `GET /api/training-plan?intensity=` (auth + load goal/activities inputs needed by `buildTrainingPlan` + return plan). Keeps the client thin and reuses server-side forecast inputs.
- Switching the segmented control updates the full calendar (weeks, miles, runs/week, session mix)—does **not** write DB until Apply.
- Do **not** ship a client-bundled duplicate of the forecast engine for this feature.

**UI (Training)**

1. Segmented control: Conservative | Balanced | Aggressive; mark saved as “Current” (badge or subtle indicator).
2. Banner when previewing: “Previewing {label} — not saved” + **Apply posture** + **Reset**.
3. Apply: `PUT`/`PATCH` existing goal API with new `intensity` (preserve distance, target, race date, baseline) → reload forecast/training data → set preview = saved.
4. Reset: set `previewIntensity` back to saved.

**Forecast**

- “What if intensity changes?” remains read-only finish-time cards.
- Optional later (out of scope): link “See plan” → Training with `?intensity=` query to open in preview.

### D. Persistence

- Apply uses existing `src/app/api/goal/route.ts` body shape (`intensity` field already supported).
- No new tables. Glossary is code/content, not DB.

### E. Analytics / empty states

- None required for beta beyond existing empty plan / needsBaseline states.
- If plan missing, posture control disabled or hidden with same empty CTA as today.

## UX copy sketches

**Sheet example (strides)**  
Title: Strides  
Body: Short, fast accelerations (usually 15–30 seconds) with easy jogging between. They wake up your legs without a hard workout.  
Feel: Quick and smooth, not an all-out sprint.

**Preview banner**  
Previewing Aggressive — not saved yet. [Apply posture] [Reset]

## Testing

- Unit: glossary match picks longest alias; no false positives on short words where avoidable.
- Unit: `buildTrainingPlan` with three intensities differs in `runsPerWeek` / peak miles (existing tests may already cover intensity bumps).
- Manual: Training switcher updates calendar without saving; Apply persists and Forecast badge updates; annotations open on mobile.

## Rollout

- Ship as patch/minor after Google-only beta UI; feature is additive.
- Changelog: Training term help + posture plan preview/apply.

## Open follow-ups (not blocking)

- Tag `termIds` on generated days for phrases matching can’t catch cleanly.
- Forecast scenario → Training deep link.
- Expand glossary from focus-group feedback.
