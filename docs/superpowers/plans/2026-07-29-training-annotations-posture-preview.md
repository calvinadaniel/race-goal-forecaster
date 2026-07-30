# Training Annotations + Posture Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline training-term help sheets on plan days, and let runners preview/apply Conservative·Balanced·Aggressive on the Training page without editing the goal form first.

**Architecture:** A static glossary catalog + longest-match annotator powers tappable terms that open a Dialog sheet. Training posture switching hits a thin `GET /api/training-plan?intensity=` that reuses `buildTrainingPlan`; Apply persists via existing `PUT /api/goal`.

**Tech Stack:** Next.js App Router, Vitest, existing forecast/`buildTrainingPlan`, shadcn Dialog (add), Auth.js session APIs.

**Spec:** `docs/superpowers/specs/2026-07-29-training-annotations-posture-preview-design.md`

## Global Constraints

- Inline annotations only — no glossary page/route
- Posture preview + Apply on Training only; Forecast scenarios stay finish-time read-only
- Plan regeneration via `GET /api/training-plan?intensity=` — do not bundle the forecast engine on the client for this feature
- Apply uses existing `PUT /api/goal` with full goal body (preserve distance, target, race date, baseline)
- Beginner-friendly copy; no medical/coaching claims beyond existing disclaimer tone
- PowerShell commits: `git commit -m "..."` (no bash heredoc)

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/training/glossary.ts` | Term catalog + types |
| `src/lib/training/annotate.ts` | Longest-match segmentation of plain text |
| `src/lib/training/annotate.test.ts` | Unit tests for matching |
| `src/lib/training/glossary.test.ts` | Catalog sanity (unique ids, required fields) |
| `src/components/ui/dialog.tsx` | shadcn Dialog primitive (added) |
| `src/components/TermHelpSheet.tsx` | Dialog showing one glossary term |
| `src/components/AnnotatableText.tsx` | Renders text with tappable matched terms |
| `src/components/PlanDayCard.tsx` | Shared day card (focus badge + annotated title/detail) |
| `src/app/api/training-plan/route.ts` | Auth + goal + rebuild plan for intensity override |
| `src/app/app/training/page.tsx` | Posture switcher, preview banner, annotated days |
| `src/app/app/forecast/page.tsx` | Wire AnnotatableText / PlanDayCard on “this week” |

---

### Task 1: Glossary catalog + annotate matcher (TDD)

**Files:**
- Create: `src/lib/training/glossary.ts`
- Create: `src/lib/training/annotate.ts`
- Create: `src/lib/training/annotate.test.ts`
- Create: `src/lib/training/glossary.test.ts`

**Interfaces:**
- Produces:
  - `GlossaryTerm` type
  - `GLOSSARY: GlossaryTerm[]`
  - `getTerm(id: string): GlossaryTerm | undefined`
  - `FOCUS_TERM_IDS: Record<string, string>` mapping focus → term id
  - `annotateText(text: string): AnnotatedSegment[]` where  
    `AnnotatedSegment = { type: "text"; value: string } | { type: "term"; value: string; termId: string }`

- [ ] **Step 1: Write failing annotate tests**

```ts
// src/lib/training/annotate.test.ts
import { describe, expect, it } from "vitest";
import { annotateText } from "./annotate";

describe("annotateText", () => {
  it("matches longest alias first (race-pace before pace)", () => {
    const parts = annotateText("near race-pace work");
    const term = parts.find((p) => p.type === "term");
    expect(term).toEqual({
      type: "term",
      value: "race-pace",
      termId: "race-pace",
    });
  });

  it("is case-insensitive and preserves original casing in value", () => {
    const parts = annotateText("Easy + Strides today");
    expect(parts.some((p) => p.type === "term" && p.termId === "strides")).toBe(
      true,
    );
    const strides = parts.find(
      (p) => p.type === "term" && p.termId === "strides",
    );
    expect(strides && strides.type === "term" && strides.value).toBe("Strides");
  });

  it("returns plain text when nothing matches", () => {
    expect(annotateText("Hello world")).toEqual([
      { type: "text", value: "Hello world" },
    ]);
  });

  it("does not match inside unrelated longer words when using word boundaries", () => {
    // "rest" should not match inside "interest" if we use word boundaries
    const parts = annotateText("interest only");
    expect(parts.every((p) => p.type === "text")).toBe(true);
  });
});
```

```ts
// src/lib/training/glossary.test.ts
import { describe, expect, it } from "vitest";
import { GLOSSARY } from "./glossary";

describe("GLOSSARY", () => {
  it("has unique ids", () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires label and short for every term", () => {
    for (const t of GLOSSARY) {
      expect(t.label.trim().length).toBeGreaterThan(0);
      expect(t.short.trim().length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/lib/training/annotate.test.ts src/lib/training/glossary.test.ts`  
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement glossary + annotate**

```ts
// src/lib/training/glossary.ts
export type GlossaryTerm = {
  id: string;
  label: string;
  aliases?: string[];
  short: string;
  feel?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "strides",
    label: "Strides",
    aliases: ["strides"],
    short:
      "Short, fast accelerations (usually 15–30 seconds) with easy jogging between. They wake up your legs without a hard workout.",
    feel: "Quick and smooth — not an all-out sprint.",
  },
  {
    id: "quality",
    label: "Quality",
    aliases: ["quality"],
    short:
      "A harder session (tempo or intervals) meant to improve fitness. Keep easy days easy so quality days stay sharp.",
  },
  {
    id: "easy",
    label: "Easy",
    aliases: ["easy"],
    short:
      "Comfortable pace where you could talk in full sentences. Most weekly miles should feel easy.",
  },
  {
    id: "tempo",
    label: "Tempo",
    aliases: ["easy tempo", "steady tempo", "tempo"],
    short:
      "Sustained running at a comfortably hard effort — harder than easy, controlled enough to hold for a stretch.",
    feel: "Comfortably hard; you can speak a few words, not chat.",
  },
  {
    id: "intervals",
    label: "Intervals",
    aliases: [
      "cruise intervals",
      "goal-pace intervals",
      "intervals",
    ],
    short:
      "Repeated faster segments with recovery jogs or rests between. Builds speed and race-pace familiarity.",
  },
  {
    id: "long-run",
    label: "Long run",
    aliases: ["long run"],
    short:
      "Your longest run of the week. Build endurance gradually; keep most of it easy unless the plan says otherwise.",
  },
  {
    id: "recovery",
    label: "Recovery",
    aliases: ["jog recoveries", "full recoveries", "recovery"],
    short:
      "Easy jogging or standing rest between harder efforts so the next rep stays quality.",
  },
  {
    id: "goal-pace",
    label: "Goal pace",
    aliases: ["goal pace", "near goal pace", "@ ~"],
    short:
      "The pace that matches your goal finish time for the race distance. Plans use it as a target for some quality work.",
  },
  {
    id: "race-pace",
    label: "Race pace",
    aliases: ["race-pace sharpeners", "race-pace", "race pace"],
    short:
      "Running at (or very near) the pace you aim to hold on race day — usually in short doses during peak/taper.",
  },
  {
    id: "optional",
    label: "Optional",
    aliases: ["optional easy", "optional"],
    short:
      "A flexible day. Do it if you feel good; skip or shorten if you’re tired — consistency matters more than forcing it.",
  },
  {
    id: "rest",
    label: "Rest",
    aliases: ["rest"],
    short:
      "No run. Sleep, light walking, or easy mobility so the next quality or long run lands better.",
  },
  {
    id: "base",
    label: "Base",
    aliases: ["Base"],
    short:
      "Early phase: build consistent easy miles and habits before heavier quality work.",
  },
  {
    id: "build",
    label: "Build",
    aliases: ["Build"],
    short:
      "Middle phase: volume and quality increase toward your peak weeks.",
  },
  {
    id: "peak",
    label: "Peak",
    aliases: ["Peak"],
    short:
      "Highest training load before taper — fitness is high; recovery still matters.",
  },
  {
    id: "taper",
    label: "Taper",
    aliases: ["Taper", "taper"],
    short:
      "Cut volume before race day so you arrive fresh while keeping a bit of sharpness.",
  },
  {
    id: "deload",
    label: "Deload",
    aliases: ["deload"],
    short:
      "A lighter week every few weeks so fatigue resets and you can absorb training.",
  },
  {
    id: "long",
    label: "Long",
    aliases: [],
    short:
      "Focus badge for the long-run day — usually your biggest endurance session of the week.",
  },
];

/** Map plan day focus → glossary id for badge ⓘ */
export const FOCUS_TERM_IDS: Record<string, string> = {
  easy: "easy",
  quality: "quality",
  long: "long",
  rest: "rest",
  optional: "optional",
  race: "race-pace",
};

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.id === id);
}
```

```ts
// src/lib/training/annotate.ts
import { GLOSSARY } from "./glossary";

export type AnnotatedSegment =
  | { type: "text"; value: string }
  | { type: "term"; value: string; termId: string };

type Alias = { alias: string; termId: string };

function buildAliases(): Alias[] {
  const list: Alias[] = [];
  for (const term of GLOSSARY) {
    const aliases = term.aliases?.length ? term.aliases : [term.label];
    for (const alias of aliases) {
      if (alias.trim()) list.push({ alias, termId: term.id });
    }
  }
  // Longest first so "race-pace" wins over "pace"
  list.sort((a, b) => b.alias.length - a.alias.length);
  return list;
}

const ALIASES = buildAliases();

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function annotateText(text: string): AnnotatedSegment[] {
  if (!text) return [];
  const parts: AnnotatedSegment[] = [];
  let i = 0;
  while (i < text.length) {
    let hit: { end: number; alias: string; termId: string } | null = null;
    const slice = text.slice(i);
    for (const { alias, termId } of ALIASES) {
      // Word-ish boundaries: start or non-letter before; end or non-letter after
      const re = new RegExp(
        `(^|[^A-Za-z])(${escapeRegExp(alias)})(?=[^A-Za-z]|$)`,
        "i",
      );
      const m = slice.match(re);
      if (m && m.index === 0) {
        const prefixLen = m[1]?.length ?? 0;
        if (prefixLen > 0) {
          // leading boundary char belongs to text; only consume alias after it
          // When match is at i with a boundary prefix, handle below
        }
        // Prefer matches that start at i (no prefix) OR prefix is empty
        if (prefixLen === 0) {
          hit = {
            end: i + alias.length,
            alias: text.slice(i, i + alias.length),
            termId,
          };
          break;
        }
      }
      // Also try exact case-insensitive startswith for aliases that begin at i
      if (slice.toLowerCase().startsWith(alias.toLowerCase())) {
        const beforeOk = i === 0 || /[^A-Za-z]/.test(text[i - 1]!);
        const afterIdx = i + alias.length;
        const afterOk =
          afterIdx >= text.length || /[^A-Za-z]/.test(text[afterIdx]!);
        if (beforeOk && afterOk) {
          hit = {
            end: afterIdx,
            alias: text.slice(i, afterIdx),
            termId,
          };
          break;
        }
      }
    }
    if (hit) {
      parts.push({ type: "term", value: hit.alias, termId: hit.termId });
      i = hit.end;
    } else {
      // Advance one char into a growing text run
      const last = parts[parts.length - 1];
      if (last && last.type === "text") {
        last.value += text[i];
      } else {
        parts.push({ type: "text", value: text[i]! });
      }
      i += 1;
    }
  }
  return parts;
}
```

> Implementer note: Prefer the clean `startsWith` + boundary loop above; delete the unused `slice.match` branch if it complicates the file. Keep longest-alias sort.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/lib/training/`  
Expected: all PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/training/
git commit -m "Add training glossary catalog and annotate matcher."
```

---

### Task 2: Dialog primitive + TermHelpSheet + AnnotatableText

**Files:**
- Create: `src/components/ui/dialog.tsx` (via shadcn)
- Create: `src/components/TermHelpSheet.tsx`
- Create: `src/components/AnnotatableText.tsx`

**Interfaces:**
- Consumes: `getTerm`, `annotateText`, `AnnotatedSegment`
- Produces:
  - `<AnnotatableText text={string} />` — client component
  - `<TermHelpSheet termId open onOpenChange />`

- [ ] **Step 1: Add shadcn Dialog**

Run from repo root:

```powershell
npx shadcn@latest add dialog --yes
```

Expected: `src/components/ui/dialog.tsx` created.

- [ ] **Step 2: Implement TermHelpSheet**

```tsx
// src/components/TermHelpSheet.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTerm } from "@/lib/training/glossary";

export function TermHelpSheet({
  termId,
  open,
  onOpenChange,
}: {
  termId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const term = termId ? getTerm(termId) : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">
            {term?.label ?? "Term"}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground">
            {term?.short ?? "No definition available."}
          </DialogDescription>
        </DialogHeader>
        {term?.feel ? (
          <p className="muted m-0 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">Feel: </span>
            {term.feel}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Implement AnnotatableText**

```tsx
// src/components/AnnotatableText.tsx
"use client";

import { useState } from "react";
import { annotateText } from "@/lib/training/annotate";
import { TermHelpSheet } from "@/components/TermHelpSheet";

export function AnnotatableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [termId, setTermId] = useState<string | null>(null);
  const parts = annotateText(text);

  return (
    <>
      <span className={className}>
        {parts.map((p, i) =>
          p.type === "text" ? (
            <span key={i}>{p.value}</span>
          ) : (
            <button
              key={i}
              type="button"
              className="border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-dotted underline-offset-2 text-primary cursor-pointer"
              onClick={() => setTermId(p.termId)}
            >
              {p.value}
            </button>
          ),
        )}
      </span>
      <TermHelpSheet
        termId={termId}
        open={Boolean(termId)}
        onOpenChange={(o) => {
          if (!o) setTermId(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Smoke-check TypeScript**

Run: `npx tsc --noEmit`  
Expected: no errors in new files (project may have unrelated noise — fix only what you introduced)

- [ ] **Step 5: Commit**

```powershell
git add src/components/ui/dialog.tsx src/components/TermHelpSheet.tsx src/components/AnnotatableText.tsx
git commit -m "Add term help dialog and annotatable plan text."
```

---

### Task 3: Shared PlanDayCard + wire Forecast + Training day text

**Files:**
- Create: `src/components/PlanDayCard.tsx`
- Modify: `src/app/app/training/page.tsx`
- Modify: `src/app/app/forecast/page.tsx` (this-week day cards only)

**Interfaces:**
- Consumes: `AnnotatableText`, `FOCUS_TERM_IDS`, `getTerm`, `TermHelpSheet`
- Produces: `<PlanDayCard day={PlanDay-like} />`

- [ ] **Step 1: Create PlanDayCard**

```tsx
// src/components/PlanDayCard.tsx
"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurfaceCard } from "@/components/ui-surface";
import { AnnotatableText } from "@/components/AnnotatableText";
import { TermHelpSheet } from "@/components/TermHelpSheet";
import { FOCUS_TERM_IDS } from "@/lib/training/glossary";
import { cn } from "@/lib/utils";

type Day = {
  day: string;
  date?: string;
  focus: string;
  title: string;
  detail: string;
};

export function PlanDayCard({
  day,
  focusMeta,
  className,
}: {
  day: Day;
  focusMeta: { label: string; className: string; icon?: React.ComponentType<{ className?: string }> };
  className?: string;
}) {
  const [focusTerm, setFocusTerm] = useState<string | null>(null);
  const termId = FOCUS_TERM_IDS[day.focus];
  const Icon = focusMeta.icon;

  return (
    <>
      <SurfaceCard className={cn("plan-day gap-2 py-3", `plan-day--${day.focus}`, className)}>
        <CardHeader className="gap-2 px-4 pb-0">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow m-0">
              {day.day}
              {day.date ? ` · ${day.date.slice(5)}` : ""}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
              onClick={() => termId && setFocusTerm(termId)}
              aria-label={`What does ${focusMeta.label} mean?`}
            >
              <Badge className={cn("rounded-full", focusMeta.className)}>
                {Icon ? <Icon className="size-3" /> : null}
                {focusMeta.label}
              </Badge>
              {termId ? <CircleHelp className="size-3.5 text-muted-foreground" /> : null}
            </button>
          </div>
          <CardTitle className="display text-lg">
            <AnnotatableText text={day.title} />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <p className="muted m-0 text-sm leading-snug">
            <AnnotatableText text={day.detail} />
          </p>
        </CardContent>
      </SurfaceCard>
      <TermHelpSheet
        termId={focusTerm}
        open={Boolean(focusTerm)}
        onOpenChange={(o) => {
          if (!o) setFocusTerm(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Replace inline day cards on Training**

In `src/app/app/training/page.tsx`, import `PlanDayCard` and replace the inner `week.days.map` card markup with:

```tsx
{week.days.map((d) => {
  const focus = FOCUS_META[d.focus] ?? FOCUS_META.easy;
  return (
    <PlanDayCard
      key={`${d.day}-${d.date ?? d.title}`}
      day={d}
      focusMeta={focus}
    />
  );
})}
```

Add `optional` to `FOCUS_META` (reuse Easy styling + label `"Optional"`).

- [ ] **Step 3: Replace Forecast this-week day cards**

In `src/app/app/forecast/page.tsx`, same pattern for `forecast.trainingPlan.days` — use `PlanDayCard` instead of duplicating title/detail markup. Keep section chrome unchanged.

- [ ] **Step 4: Manual check**

Run: `npm run dev`  
Open Training + Forecast → tap “strides” / Quality ⓘ → sheet opens with copy.

- [ ] **Step 5: Commit**

```powershell
git add src/components/PlanDayCard.tsx src/app/app/training/page.tsx src/app/app/forecast/page.tsx
git commit -m "Wire inline training term help on plan day cards."
```

---

### Task 4: `GET /api/training-plan` for posture preview

**Files:**
- Create: `src/app/api/training-plan/route.ts`
- Test: manual + optional light unit on intensity validation (API is auth-bound; prefer manual)

**Interfaces:**
- Consumes: `auth`, `getDb`, `goals`, `activities`, `computeForecast` **or** extract plan-only inputs mirroring `forecast/route.ts` + `buildTrainingPlan`
- Produces: JSON `{ intensity, plan: TrainingPlan, savedIntensity }`

**Preferred approach:** Call `computeForecast` with overridden intensity (same as forecast route) and return only `forecast.trainingPlan` plus meta — keeps verdict/volume inputs consistent with forecast.

- [ ] **Step 1: Implement route**

```ts
// src/app/api/training-plan/route.ts
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { activities, goals } from "@/db/schema";
import { computeForecast } from "@/lib/forecast/engine";
import type { DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import { weeklyVolumeFromActivities } from "@/lib/units";

const INTENSITIES = new Set(["conservative", "balanced", "aggressive"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("intensity");
  if (!raw || !INTENSITIES.has(raw)) {
    return NextResponse.json(
      { error: "intensity must be conservative|balanced|aggressive" },
      { status: 400 },
    );
  }
  const intensity = raw as Intensity;

  const db = getDb();
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, session.user.id))
    .limit(1);

  if (!goal) {
    return NextResponse.json({ error: "No goal set" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, session.user.id));

  const efforts = rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.startDate,
    distanceM: r.distanceM,
    movingTimeSec: r.movingTimeSec,
    isRace: r.isRace,
    workoutType: r.workoutType,
  }));

  const weeklyMiles = weeklyVolumeFromActivities(
    rows.map((r) => ({ startDate: r.startDate, distanceM: r.distanceM })),
  );

  const forecast = computeForecast({
    goalDistanceKey: goal.distanceKey as DistanceKey,
    goalDistanceM: goal.distanceM,
    targetTimeSec: goal.targetTimeSec,
    raceDate: goal.raceDate,
    intensity,
    efforts,
    weeklyMiles,
    manualBaseline: goal.manualBaseline as {
      distanceKey: DistanceKey;
      distanceM: number;
      timeSec: number;
      date: string;
    } | null,
  });

  if (forecast.needsBaseline || !forecast.trainingPlan) {
    return NextResponse.json(
      { error: "Plan unavailable", needsBaseline: forecast.needsBaseline },
      { status: 404 },
    );
  }

  return NextResponse.json({
    intensity,
    savedIntensity: goal.intensity,
    plan: forecast.trainingPlan,
  });
}
```

- [ ] **Step 2: Manual API check** (signed-in browser or curl with session cookie)

Open Training while logged in; from DevTools:

```js
await fetch("/api/training-plan?intensity=aggressive").then((r) => r.json())
```

Expected: `plan.runsPerWeek` higher than conservative; `savedIntensity` matches goal.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/training-plan/route.ts
git commit -m "Add training-plan API for posture intensity preview."
```

---

### Task 5: Training page posture switcher + Apply / Reset

**Files:**
- Modify: `src/app/app/training/page.tsx`
- Modify: `src/lib/use-forecast.ts` only if needed for `load` after Apply (already exposes `load`)

**Interfaces:**
- Consumes: `GET /api/training-plan?intensity=`, `PUT /api/goal`, `POSTURE_LABELS`, `data.goal`
- Local state: `previewIntensity`, `previewPlan`, `previewBusy`, `applyBusy`

- [ ] **Step 1: Add posture UI state + fetch**

On Training page (client):

```tsx
const savedIntensity = (data.goal.intensity ?? "balanced") as Intensity;
const [previewIntensity, setPreviewIntensity] = useState<Intensity>(savedIntensity);
const [previewPlan, setPreviewPlan] = useState<typeof data.forecast.trainingPlan | null>(null);
const [previewBusy, setPreviewBusy] = useState(false);
const [applyBusy, setApplyBusy] = useState(false);

// Keep preview in sync when saved goal changes after load()
useEffect(() => {
  setPreviewIntensity(savedIntensity);
  setPreviewPlan(null);
}, [savedIntensity]);

const displayPlan =
  previewIntensity !== savedIntensity && previewPlan
    ? previewPlan
    : data.forecast.trainingPlan;

async function selectIntensity(next: Intensity) {
  setPreviewIntensity(next);
  if (next === savedIntensity) {
    setPreviewPlan(null);
    return;
  }
  setPreviewBusy(true);
  try {
    const res = await fetch(`/api/training-plan?intensity=${next}`);
    if (!res.ok) throw new Error("preview failed");
    const json = await res.json();
    setPreviewPlan(json.plan);
  } catch {
    setPreviewIntensity(savedIntensity);
    setPreviewPlan(null);
  } finally {
    setPreviewBusy(false);
  }
}

async function applyPosture() {
  setApplyBusy(true);
  try {
    const res = await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceKey: data.goal.distanceKey,
        targetTimeSec: data.goal.targetTimeSec,
        raceDate: data.goal.raceDate,
        intensity: previewIntensity,
        manualBaseline: data.goal.manualBaseline
          ? {
              distanceKey: data.goal.manualBaseline.distanceKey,
              timeSec: data.goal.manualBaseline.timeSec,
              date: data.goal.manualBaseline.date,
            }
          : null,
        units,
      }),
    });
    if (!res.ok) throw new Error("apply failed");
    await load();
    setPreviewPlan(null);
  } finally {
    setApplyBusy(false);
  }
}
```

Import `useForecastData`’s `load` and `units`. Import `Intensity`, `POSTURE_LABELS` from postures.

- [ ] **Step 2: Render switcher + banner**

Above the week list (when plan exists):

```tsx
<div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Training posture">
  {(["conservative", "balanced", "aggressive"] as Intensity[]).map((id) => (
    <Button
      key={id}
      type="button"
      variant={previewIntensity === id ? "default" : "outline"}
      className="landing__btn h-10 rounded-xl font-bold"
      disabled={previewBusy || applyBusy}
      onClick={() => void selectIntensity(id)}
    >
      {POSTURE_LABELS[id]}
      {savedIntensity === id ? " · Current" : ""}
    </Button>
  ))}
</div>

{previewIntensity !== savedIntensity ? (
  <SurfaceCard className="mb-4 border-primary/40">
    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p className="m-0 text-sm leading-relaxed">
        Previewing {POSTURE_LABELS[previewIntensity]} — not saved yet.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="landing__btn h-10 rounded-xl font-bold"
          disabled={applyBusy || previewBusy}
          onClick={() => void applyPosture()}
        >
          {applyBusy ? "Applying…" : "Apply posture"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="landing__btn h-10 rounded-xl font-bold"
          disabled={applyBusy}
          onClick={() => {
            setPreviewIntensity(savedIntensity);
            setPreviewPlan(null);
          }}
        >
          Reset
        </Button>
      </div>
    </CardContent>
  </SurfaceCard>
) : null}
```

Render weeks from `displayPlan` (not raw `data.forecast.trainingPlan`). Hide switcher when `needsBaseline` / no plan (same empty state as today).

- [ ] **Step 3: Manual QA**

1. Open Training → note runs/week for Balanced  
2. Tap Aggressive → calendar updates; Forecast badge still old posture  
3. Reset → back to saved  
4. Tap Aggressive → Apply → Forecast badge + plan match Aggressive  
5. Terms still open sheets in preview mode  

- [ ] **Step 4: Commit**

```powershell
git add src/app/app/training/page.tsx
git commit -m "Add training posture preview and one-tap apply."
```

---

### Task 6: Regression tests + ship notes (when ready to release)

**Files:**
- Modify: `src/lib/forecast/training-plan.long.test.ts` or add assert in existing intensity tests if missing
- Later release: `CHANGELOG.md` / README via ship-with-release-notes skill (only when user asks to commit and deploy)

- [ ] **Step 1: Confirm intensity changes plan shape**

Add or extend a Vitest case:

```ts
import { buildTrainingPlan } from "@/lib/forecast/training-plan";

it("aggressive schedules more runs than conservative", () => {
  const base = {
    distanceKey: "half" as const,
    distanceM: 21097.5,
    targetTimeSec: 7200,
    verdict: "at_risk" as const,
    monthsToRace: 4,
    recentWeeklyMiles: 30,
    raceDate: new Date("2026-11-01"),
    asOf: new Date("2026-07-01"),
  };
  const c = buildTrainingPlan({ ...base, intensity: "conservative" });
  const a = buildTrainingPlan({ ...base, intensity: "aggressive" });
  expect(a.runsPerWeek).toBeGreaterThan(c.runsPerWeek);
});
```

Run: `npm test`  
Expected: PASS

- [ ] **Step 2: Commit**

```powershell
git add src/lib/forecast/*.test.ts
git commit -m "Cover posture intensity differences in training plan tests."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Glossary catalog | Task 1 |
| Longest-match annotate | Task 1 |
| Term sheet UI | Task 2 |
| Inline on Training + Forecast this week | Task 3 |
| `GET /api/training-plan?intensity=` | Task 4 |
| Training switcher + banner Apply/Reset | Task 5 |
| Apply via goal API | Task 5 |
| Forecast scenarios stay read-only | Task 5 (no changes to scenario cards) |
| No glossary page | — (not created) |
| Intensity plan unit coverage | Task 6 |

## Placeholder / consistency review

- Types: `Intensity`, `GlossaryTerm`, `AnnotatedSegment`, `TrainingPlan` aligned across tasks  
- Goal PUT body matches `goalSchema` in `src/app/api/goal/route.ts`  
- No TBD steps remaining  

---

**Plan complete and saved to** `docs/superpowers/plans/2026-07-29-training-annotations-posture-preview.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach?
