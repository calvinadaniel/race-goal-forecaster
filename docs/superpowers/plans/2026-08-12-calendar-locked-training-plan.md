# Calendar-locked training plan start — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let runners start a plan with posture + Monday so Week N follows the calendar; until then show a labeled Draft preview from today.

**Architecture:** Persist nullable `planStartMonday` on `goals`. Extend `buildTrainingPlan` to lock Week 1 to that Monday when set, expose `planStatus` / `currentWeekIndex`, and point Forecast `days` at the week containing `asOf`. Start/Reschedule/Back-to-draft via goal PUT from Training and Forecast.

**Tech Stack:** Next.js App Router, Drizzle/Neon, Zod, Vitest, existing forecast/training UI.

**Spec:** `docs/superpowers/specs/2026-08-12-calendar-locked-training-plan-design.md`

## Global Constraints

- No full plan JSON snapshot (live generator only)
- `planStartMonday` always a Monday when non-null
- Draft = rolling from today; Started = locked start
- Both Training and Forecast get Start CTA + status banner
- Past week indices/dates stay stable; future weeks may reshape on posture/race edits
- Do not commit `.env.local` or secrets

## File map

| File | Responsibility |
|------|----------------|
| `src/db/schema.ts` | Add `planStartMonday` column |
| `src/lib/forecast/training-plan.ts` | Accept start Monday; status + current week; `days` = current |
| `src/lib/forecast/training-plan.long.test.ts` (or new test file) | Calendar lock tests |
| `src/lib/forecast/engine.ts` | Pass `planStartMonday` into builder |
| `src/lib/use-forecast.ts` | Types for new plan fields + goal field |
| `src/app/api/goal/route.ts` | Zod + persist `planStartMonday` |
| `src/app/api/forecast/route.ts` | Pass goal start into engine |
| `src/app/api/training-plan/route.ts` | Same |
| `src/components/StartPlanSheet.tsx` | Start/Reschedule UI (posture + Monday) |
| `src/components/PlanStatusBanner.tsx` | Draft / Week N of M banner + actions |
| `src/app/app/training/page.tsx` | Wire banner, sheet, current-week emphasis |
| `src/app/app/forecast/page.tsx` | Wire banner + sheet |

---

### Task 1: Schema + goal API for `planStartMonday`

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/app/api/goal/route.ts`
- Create: `src/lib/plan-start.ts` (Monday helpers + validation)
- Test: `src/lib/plan-start.test.ts`

**Interfaces:**
- Produces: `normalizeToMonday(d: Date): Date`, `parsePlanStartMonday(iso: string | null | undefined, raceDate: Date): { ok: true; value: Date | null } | { ok: false; error: string }`

- [ ] **Step 1: Write failing tests for Monday validation**

```ts
// src/lib/plan-start.test.ts
import { describe, expect, it } from "vitest";
import { normalizeToMonday, parsePlanStartMonday } from "./plan-start";

describe("parsePlanStartMonday", () => {
  const race = new Date("2026-11-01"); // Sunday

  it("accepts null as draft", () => {
    expect(parsePlanStartMonday(null, race)).toEqual({ ok: true, value: null });
  });

  it("rejects non-Monday ISO dates", () => {
    const r = parsePlanStartMonday("2026-08-12", race); // Wednesday
    expect(r.ok).toBe(false);
  });

  it("accepts a Monday on or before race week Monday", () => {
    const r = parsePlanStartMonday("2026-08-10", race);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value?.toISOString().slice(0, 10)).toBe("2026-08-10");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npx vitest run src/lib/plan-start.test.ts`

- [ ] **Step 3: Implement `src/lib/plan-start.ts` + schema column + goal route**

```ts
// schema addition on goals:
planStartMonday: timestamp("plan_start_monday", { mode: "date" }),
```

Goal Zod: `planStartMonday: z.string().nullable().optional()`  
On PUT: validate with `parsePlanStartMonday`; persist; include in onConflict update.  
GET already returns full goal row.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: `npm run db:push`** (needs DATABASE_URL) then commit

```bash
git add src/db/schema.ts src/lib/plan-start.ts src/lib/plan-start.test.ts src/app/api/goal/route.ts
git commit -m "Add planStartMonday to goals with Monday validation."
```

---

### Task 2: `buildTrainingPlan` calendar lock + current week

**Files:**
- Modify: `src/lib/forecast/training-plan.ts`
- Modify: `src/lib/forecast/training-plan.long.test.ts` (append describe) or create `training-plan.start.test.ts`
- Modify: `src/lib/forecast/engine.ts` (pass through `planStartMonday?: Date | null`)

**Interfaces:**
- Consumes: none from Task 1 required inside generator (Date only)
- Produces: `TrainingPlan` extended with:
  - `planStatus: "draft" | "started"`
  - `planStartMonday: string | null`
  - `currentWeekIndex: number`
  - `days` = days of current week (not always `weeks[0]`)
  - top-level `phase` / `weeklyMiles` from current week

- [ ] **Step 1: Write failing test**

```ts
it("started plan: asOf three weeks later uses week 4 days, not week 1", () => {
  const start = new Date("2026-07-06"); // Monday
  const plan = buildTrainingPlan({
    distanceKey: "half",
    distanceM: 21097.5,
    targetTimeSec: 7200,
    intensity: "balanced",
    verdict: "at_risk",
    monthsToRace: 4,
    recentWeeklyMiles: 25,
    raceDate: new Date("2026-11-01"),
    asOf: new Date("2026-07-27"), // Monday, 3 weeks later
    planStartMonday: start,
  });
  expect(plan.planStatus).toBe("started");
  expect(plan.currentWeekIndex).toBe(4);
  expect(plan.days[0]?.date).toBe(plan.weeks[3]!.days[0]?.date);
  expect(plan.weeks[0]!.weekStart).toBe("2026-07-06");
});

it("draft plan has planStatus draft and current week 1", () => {
  const plan = buildTrainingPlan({
    /* ... asOf 2026-07-27, no planStartMonday ... */
    asOf: new Date("2026-07-27"),
    raceDate: new Date("2026-11-01"),
    // required fields...
  });
  expect(plan.planStatus).toBe("draft");
  expect(plan.currentWeekIndex).toBe(1);
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

In `buildTrainingPlan`:
```ts
planStartMonday?: Date | null;
```
- `const started = args.planStartMonday != null`
- `firstMonday = started ? mondayOnOrBefore(args.planStartMonday) : mondayOnOrBefore(asOf)`
- After building `weeks`, find `current` by `weekStart <= asOf Monday && asOf < weekStart+7` (or last/first clamp)
- Return status fields; `days: current.days`; `startDate` for started = iso(firstMonday), for draft keep iso(asOf) or firstMonday consistently (prefer firstMonday ISO for both)

Wire `computeForecast` input + `buildTrainingPlan` call with `planStartMonday`.

- [ ] **Step 4: Run all training-plan + engine tests — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "Lock training plan weeks to planStartMonday and expose current week."
```

---

### Task 3: Forecast / training-plan API + client types

**Files:**
- Modify: `src/app/api/forecast/route.ts`
- Modify: `src/app/api/training-plan/route.ts`
- Modify: `src/lib/use-forecast.ts`

- [ ] **Step 1: Pass `goal.planStartMonday` into `computeForecast`**
- [ ] **Step 2: Extend `ForecastPayload` goal + trainingPlan types** with `planStartMonday`, `planStatus`, `currentWeekIndex`
- [ ] **Step 3: Manual check** — `npx tsc --noEmit`
- [ ] **Step 4: Commit**

```bash
git commit -m "Plumb planStartMonday through forecast APIs and client types."
```

---

### Task 4: StartPlanSheet + PlanStatusBanner components

**Files:**
- Create: `src/components/StartPlanSheet.tsx`
- Create: `src/components/PlanStatusBanner.tsx`

**Interfaces:**
- `StartPlanSheet`: props `{ open, onOpenChange, defaultIntensity, raceDate, initialMonday?, onSaved: () => void }` — PUT `/api/goal` merging existing goal fields from a `goal` prop or fetch
- `PlanStatusBanner`: props `{ status, currentWeekIndex, weeksOut, planStartMonday, phase?, onStart, onReschedule, onBackToDraft }`

- [ ] **Step 1: Implement StartPlanSheet** — posture select + Monday `<input type="date">` snapped to Monday on blur/change via `normalizeToMonday`; submit PUT with full goal fields + new start/intensity
- [ ] **Step 2: Implement PlanStatusBanner** — Draft vs Started copy + buttons
- [ ] **Step 3: Commit**

```bash
git commit -m "Add Start plan sheet and plan status banner."
```

---

### Task 5: Wire Training + Forecast pages

**Files:**
- Modify: `src/app/app/training/page.tsx`
- Modify: `src/app/app/forecast/page.tsx`

- [ ] **Step 1: Training** — banner above plan; Start/Reschedule open sheet; Back to draft PUTs `planStartMonday: null`; highlight `plan-full__week` when `week.weekIndex === currentWeekIndex` (class `plan-full__week--current`); quieter past weeks (`opacity` / muted)
- [ ] **Step 2: Forecast** — same banner + sheet; ensure suggestion uses `forecast.trainingPlan.days` (already current after Task 2)
- [ ] **Step 3: Apply posture** keeps `planStartMonday` when PUTting intensity
- [ ] **Step 4: Smoke** — `npx tsc --noEmit` + `npm test`
- [ ] **Step 5: Commit**

```bash
git commit -m "Wire calendar-locked plan start on Training and Forecast."
```

---

## Execution

User asked to start building after approving the design. Prefer **inline execution** in this session (executing-plans) unless subagents are explicitly requested.

After all tasks: run finishing-a-development-branch (tests, then merge/PR/ship options).
