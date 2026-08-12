"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Download,
  Flag,
  Moon,
  Mountain,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlanDayCard } from "@/components/PlanDayCard";
import { PlanStatusBanner } from "@/components/PlanStatusBanner";
import { StartPlanSheet } from "@/components/StartPlanSheet";
import { TermHelpProvider } from "@/components/TermHelpProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading, SurfaceCard } from "@/components/ui-surface";
import { downloadTrainingPlanCsv } from "@/lib/export-training-plan";
import {
  POSTURE_LABELS,
  type Intensity,
} from "@/lib/forecast/postures";
import {
  type ForecastPayload,
  useForecastData,
} from "@/lib/use-forecast";
import { cn } from "@/lib/utils";
const FOCUS_META: Record<
  string,
  { label: string; icon: typeof Zap; className: string }
> = {
  easy: {
    label: "Easy",
    icon: Sparkles,
    className: "bg-secondary text-secondary-foreground",
  },
  optional: {
    label: "Optional",
    icon: Sparkles,
    className: "bg-secondary text-secondary-foreground",
  },
  quality: {
    label: "Quality",
    icon: Zap,
    className: "bg-primary text-primary-foreground",
  },
  long: {
    label: "Long",
    icon: Mountain,
    className: "bg-[var(--pine)] text-[#fff7ef]",
  },
  rest: {
    label: "Rest",
    icon: Moon,
    className: "bg-muted text-muted-foreground",
  },
  race: {
    label: "Race",
    icon: Flag,
    className: "bg-primary text-primary-foreground",
  },
};

export default function TrainingPage() {
  const { data, units, error, load } = useForecastData();
  const savedIntensity = (data?.goal.intensity ?? "balanced") as Intensity;
  const [previewIntensity, setPreviewIntensity] =
    useState<Intensity>(savedIntensity);
  const [previewPlan, setPreviewPlan] = useState<
    ForecastPayload["forecast"]["trainingPlan"]
  >(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [postureError, setPostureError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"start" | "reschedule">("start");
  const [draftBusy, setDraftBusy] = useState(false);

  useEffect(() => {
    setPreviewIntensity(savedIntensity);
    setPreviewPlan(null);
    setPostureError(null);
  }, [savedIntensity]);

  if (error) {
    return (
      <AppShell>
        <main className="container app-page">
          <p className="text-destructive">{error}</p>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <main className="container app-page space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-40 rounded-xl" />
        </main>
      </AppShell>
    );
  }

  const goal = data.goal;
  const displayPlan =
    previewIntensity !== savedIntensity && previewPlan
      ? previewPlan
      : data.forecast.trainingPlan;
  const weeks = displayPlan?.weeks ?? [];

  const exportCsv = () => {
    if (!displayPlan || weeks.length === 0) return;
    downloadTrainingPlanCsv(
      weeks,
      `training-plan-${displayPlan.startDate ?? "export"}-to-${displayPlan.endDate ?? "race"}.csv`,
    );
  };

  async function selectIntensity(next: Intensity) {
    setPreviewIntensity(next);
    setPostureError(null);
    if (next === savedIntensity) {
      setPreviewPlan(null);
      return;
    }
    setPreviewPlan(null);
    setPreviewBusy(true);
    try {
      const res = await fetch(`/api/training-plan?intensity=${next}`);
      if (!res.ok) throw new Error("preview failed");
      const json = await res.json();
      setPreviewPlan(json.plan);
    } catch {
      setPreviewIntensity(savedIntensity);
      setPreviewPlan(null);
      setPostureError("Could not load that posture preview. Try again.");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function applyPosture() {
    setApplyBusy(true);
    setPostureError(null);
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKey: goal.distanceKey,
          targetTimeSec: goal.targetTimeSec,
          raceDate: goal.raceDate,
          intensity: previewIntensity,
          planStartMonday: goal.planStartMonday ?? null,
          manualBaseline: goal.manualBaseline
            ? {
                distanceKey: goal.manualBaseline.distanceKey,
                timeSec: goal.manualBaseline.timeSec,
                date: goal.manualBaseline.date,
              }
            : null,
          units,
        }),
      });
      if (!res.ok) throw new Error("apply failed");
      await load();
      setPreviewPlan(null);
    } catch {
      setPostureError(
        "Could not apply this training posture. Please try again.",
      );
    } finally {
      setApplyBusy(false);
    }
  }

  async function backToDraft() {
    setDraftBusy(true);
    setPostureError(null);
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKey: goal.distanceKey,
          targetTimeSec: goal.targetTimeSec,
          raceDate: goal.raceDate,
          intensity: goal.intensity,
          planStartMonday: null,
          manualBaseline: goal.manualBaseline
            ? {
                distanceKey: goal.manualBaseline.distanceKey,
                timeSec: goal.manualBaseline.timeSec,
                date: goal.manualBaseline.date,
              }
            : null,
          units,
        }),
      });
      if (!res.ok) throw new Error("draft failed");
      await load();
    } catch {
      setPostureError("Could not return to draft. Please try again.");
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <TermHelpProvider>
    <AppShell
      headerAction={
        displayPlan && !data.forecast.needsBaseline && weeks.length > 0 ? (
          <Button
            variant="outline"
            className="landing__btn h-10 rounded-xl font-bold"
            type="button"
            onClick={exportCsv}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        ) : undefined
      }
    >
      <main className="container app-page">
        <p className="eyebrow">Training</p>
        <h1 className="display mt-1 mb-3 text-[clamp(2rem,6vw,3rem)]">
          Full plan to race day
        </h1>

        {!displayPlan || data.forecast.needsBaseline ? (
          <SurfaceCard>
            <CardContent>
              <p className="m-0">
                Set a goal with enough history to unlock a training plan through race day.
              </p>
            </CardContent>
          </SurfaceCard>
        ) : (
          <>
            <PlanStatusBanner
              className="mb-4"
              planStatus={
                displayPlan.planStatus ??
                (goal.planStartMonday ? "started" : "draft")
              }
              currentWeekIndex={
                displayPlan.currentWeekIndex ??
                data.forecast.trainingPlan?.currentWeekIndex ??
                1
              }
              weeksOut={
                displayPlan.weeksOut ??
                weeks.length
              }
              planStartMonday={
                displayPlan.planStartMonday ?? goal.planStartMonday
              }
              phase={displayPlan.phase}
              onStart={() => {
                setSheetMode("start");
                setSheetOpen(true);
              }}
              onReschedule={() => {
                setSheetMode("reschedule");
                setSheetOpen(true);
              }}
              onBackToDraft={() => void backToDraft()}
              backToDraftBusy={draftBusy}
            />

            {postureError ? (
              <p
                className="mb-4 text-sm text-destructive"
                role="alert"
              >
                {postureError}
              </p>
            ) : null}
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Training posture"
            >
              {(
                ["conservative", "balanced", "aggressive"] as Intensity[]
              ).map((id) => (
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
                  <div>
                    <p className="m-0 text-sm leading-relaxed">
                      Previewing {POSTURE_LABELS[previewIntensity]} — not saved
                      yet.
                    </p>
                  </div>
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
                        setPostureError(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </SurfaceCard>
            ) : null}

            <div className="plan-toolbar">
              <p className="muted m-0 max-w-xl leading-relaxed">
                {displayPlan.startDate} → {displayPlan.endDate} · {weeks.length}{" "}
                week
                {weeks.length === 1 ? "" : "s"} · goal pace{" "}
                {displayPlan.goalPacePerMi} · {displayPlan.runsPerWeek} runs/week
                pattern
              </p>
              <Button
                className="landing__btn h-10 rounded-xl font-bold"
                type="button"
                onClick={exportCsv}
              >
                <Download className="size-4" />
                Export training plan
              </Button>
            </div>

            <div className="plan-full">
              {weeks.map((week) => {
                const currentIdx =
                  displayPlan.currentWeekIndex ??
                  data.forecast.trainingPlan?.currentWeekIndex ??
                  1;
                const isCurrent = week.weekIndex === currentIdx;
                const isPast = week.weekIndex < currentIdx;
                return (
                <section
                  key={week.weekStart}
                  className={cn(
                    "plan-full__week",
                    isCurrent && "plan-full__week--current",
                    isPast && "plan-full__week--past",
                  )}
                >
                  <header className="plan-full__head">
                    <SectionHeading
                      icon={CalendarRange}
                      title={`Week ${week.weekIndex}${isCurrent ? " · This week" : ""}`}
                      tone="pine"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {week.phase}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        starts {week.weekStart}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        ~{week.weeklyMiles} mi
                      </Badge>
                    </div>
                  </header>
                  <div className="plan-week">
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
                  </div>
                </section>
              );
              })}
            </div>

            <ul className="muted mt-5 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {displayPlan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>

            <StartPlanSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              goal={{
                distanceKey: goal.distanceKey,
                targetTimeSec: goal.targetTimeSec,
                raceDate: goal.raceDate,
                intensity: goal.intensity,
                planStartMonday: goal.planStartMonday,
                manualBaseline: goal.manualBaseline
                  ? {
                      distanceKey: goal.manualBaseline.distanceKey,
                      timeSec: goal.manualBaseline.timeSec,
                      date: goal.manualBaseline.date,
                    }
                  : null,
              }}
              units={units}
              mode={sheetMode}
              onSaved={load}
            />
          </>
        )}
      </main>
    </AppShell>
    </TermHelpProvider>
  );
}
