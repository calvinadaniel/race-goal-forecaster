# Calendar-locked training plan start

**Date:** 2026-08-12  
**Status:** Approved for implementation  
**Product:** TruePace (Race Goal Forecaster)

## Problem

The training plan regenerates from **today** on every load, so “Week 1” is always the current calendar week. Logged-in runners never advance through a committed block (e.g. returning later still feels like Week 1).

## Goal

Let runners **start** a plan by choosing **posture + Week 1 Monday**. After that, the app follows the calendar: if three weeks have passed, they are on **Week 3**. Until start, keep today’s rolling preview but label it **Draft**.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Approach | Persist `planStartMonday` on the goal; keep using live `buildTrainingPlan` (no full JSON snapshot) |
| Start inputs | Posture (Conservative / Balanced / Aggressive) + start Monday |
| Before start | Rolling preview from this Monday, labeled **Draft** |
| Surfaces | **Both** Training and Forecast (start CTA + current-week clarity) |
| Edits after start | Reshape **from the current week forward**; do not renumber weeks already passed |
| Out of scope | Snapshotting past week copy, multiple plans, reminders |

## Data model

Add to `goals`:

- `planStartMonday` — `timestamp` (date) **nullable**
  - `null` → Draft
  - set → Started; value is always a **Monday** (local date semantics as existing `raceDate`)

Existing `intensity` remains the committed posture.

## Plan generation

### Draft (`planStartMonday == null`)

- Same as today: `firstMonday = mondayOnOrBefore(asOf)` through race
- Payload: `planStatus: "draft"`
- Forecast `days` = `weeks[0]` (this week)

### Started

- `firstMonday = planStartMonday` (normalized to Monday if needed)
- Build weeks Week 1…N from that Monday through race week
- `currentWeekIndex` = 1-based index of the week whose date range contains `asOf`
  - If `asOf` is before start → Week 1
  - If `asOf` is after last week → last week
- Forecast `days` / “this week’s suggestion” = that current week (not always `weeks[0]`)
- Payload: `planStatus: "started"`, `planStartMonday`, `currentWeekIndex`

### Edits (posture / race date) while started

- Keep `planStartMonday`
- Rebuild full plan from that start through new race date / intensity
- **UI contract:** past weeks (weekStart &lt; current Monday) keep their **weekIndex** and dates; future weeks may change content/volume
- Generator may regenerate copy for past weeks if viewed; v1 accepts that (indices/dates stable)

### Clear / reschedule

- **Back to draft:** `planStartMonday = null`
- **Reschedule:** update `planStartMonday` and/or `intensity` via Start sheet again

## API

### Goal `PUT` / `GET`

- Accept/return optional `planStartMonday: string | null` (ISO `YYYY-MM-DD`)
- Validation when non-null:
  - Must resolve to a Monday
  - Must be ≤ race week’s Monday
  - Reject absurd starts (e.g. more than 52 weeks before race, or after race day)

### Forecast + `GET /api/training-plan`

Extend training plan object (and goal echo as needed):

```ts
planStatus: "draft" | "started"
planStartMonday: string | null
currentWeekIndex: number // 1-based
```

Pass `planStartMonday` into `buildTrainingPlan` (or wrapper) so dates lock correctly.

## UI

### Both Training and Forecast

**Draft**

- Banner: **Draft plan** — Week 1 is this week until you start
- Primary CTA: **Start plan**

**Start plan sheet**

- Posture radios (default = current goal intensity; Training may still use existing preview switcher)
- Start week: Monday control (default = this Monday; allow future Mondays up to race week)
- Confirm → `PUT` goal with `intensity` + `planStartMonday`

**Started**

- Banner: **Week N of M** · started `{date}` · phase
- Training: emphasize current week; past weeks quieter
- Forecast: this week’s suggestion = current week
- Secondary: **Reschedule**, **Back to draft**

### Existing Training posture preview

- Unsaved intensity peek unchanged
- **Apply posture** while started: save intensity, keep `planStartMonday`, reshape from current week forward

## Errors

- Invalid Monday / after race → inline error in Start sheet
- Save failure → inline/toast; do not flip status optimistically

## Testing

- Started plan: week containing `asOf` is not always index 0 when start was earlier
- Draft payload `planStatus: "draft"`; started includes `planStartMonday` + `currentWeekIndex`
- Goal API rejects non-Monday `planStartMonday`
- Changing intensity/race keeps `planStartMonday`; calendar current week still correct

## Success criteria

1. Runner can start with posture + Monday from Training or Forecast  
2. Returning later shows the correct Week N  
3. Draft is clearly labeled before start  
4. Posture/race edits do not reset them to “Week 1 = today”
