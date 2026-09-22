"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { PlanDayCard } from "@/components/PlanDayCard";
import { PlanStatusBanner } from "@/components/PlanStatusBanner";
import { StartPlanSheet } from "@/components/StartPlanSheet";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/ui-surface";
import { downloadTrainingPlanCsv } from "@/lib/export-training-plan";
import { FOCUS_META } from "@/lib/focus-meta";
import {
  POSTURE_LABELS,
  type Intensity,
} from "@/lib/forecast/postures";
import { isoDate } from "@/lib/plan-start";
import {
  type ForecastPayload,
  useForecastData,
} from "@/lib/use-forecast";

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

  const [todayIso, setTodayIso] = useState<string | null>(null);

  useEffect(() => {
    setTodayIso(isoDate(new Date()));
  }, []);

  useEffect(() => {
    if (!todayIso) return;
    const plan =
      previewIntensity !== savedIntensity && previewPlan
        ? previewPlan
        : data?.forecast.trainingPlan;
    if (!plan?.weeks?.length) return;
    const weekIdx =
      plan.currentWeekIndex ?? data?.forecast.trainingPlan?.currentWeekIndex ?? 1;
    const el =
      document.getElementById(`plan-day-${todayIso}`) ??
      document.getElementById(`plan-week-${weekIdx}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [data, previewIntensity, previewPlan, savedIntensity, todayIso]);

  if (error) {
    return (
      <main className="container app-page">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container app-page space-y-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-40" />
      </main>
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
    <main className="container app-page">
      <h1 className="page-title">Plan</h1>

      {!displayPlan || data.forecast.needsBaseline ? (
        <SurfaceCard>
          <CardContent>
            <p className="m-0">
              Set a goal with enough history to unlock a training plan through
              race day.
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
            <p className="mb-4 text-sm text-destructive" role="alert">
              {postureError}
            </p>
          ) : null}

          <div
            className="mb-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Training posture"
          >
            {(["conservative", "balanced", "aggressive"] as Intensity[]).map(
              (id) => (
                <Button
                  key={id}
                  type="button"
                  variant={previewIntensity === id ? "default" : "outline"}
                  disabled={previewBusy || applyBusy}
                  onClick={() => void selectIntensity(id)}
                >
                  {POSTURE_LABELS[id]}
                  {savedIntensity === id ? " · Current" : ""}
                </Button>
              ),
            )}
          </div>

          {previewIntensity !== savedIntensity ? (
            <SurfaceCard className="mb-4">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <p className="m-0 text-sm leading-relaxed">
                  Previewing {POSTURE_LABELS[previewIntensity]} — not saved
                  yet.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={applyBusy || previewBusy}
                    onClick={() => void applyPosture()}
                  >
                    {applyBusy ? "Applying…" : "Apply posture"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
              week{weeks.length === 1 ? "" : "s"} · goal pace{" "}
              {displayPlan.goalPacePerMi} · {displayPlan.runsPerWeek} runs/week
            </p>
            <Button variant="outline" type="button" onClick={exportCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <div className="plan-full">
            {(() => {
              const currentIdx =
                displayPlan.currentWeekIndex ??
                data.forecast.trainingPlan?.currentWeekIndex ??
                1;
              const pastWeeks = weeks.filter((w) => w.weekIndex < currentIdx);
              const liveWeeks = weeks.filter((w) => w.weekIndex >= currentIdx);

              function weekBlock(
                week: (typeof weeks)[number],
                isCurrent: boolean,
              ) {
                return (
                  <section
                    key={week.weekStart}
                    id={`plan-week-${week.weekIndex}`}
                    className="plan-full__week"
                  >
                    <header className="plan-full__head">
                      <h2 className="section-title">
                        Week {week.weekIndex}
                        {isCurrent ? " · This week" : ""}
                      </h2>
                      <p className="plan-week-meta muted">
                        {week.phase} · starts {week.weekStart} · ~
                        {week.weeklyMiles} mi
                      </p>
                    </header>
                    <div className="plan-week">
                      {week.days.map((d) => {
                        const focus = FOCUS_META[d.focus] ?? FOCUS_META.easy;
                        return (
                          <PlanDayCard
                            key={`${d.day}-${d.date ?? d.title}`}
                            day={d}
                            focusMeta={focus}
                            isToday={Boolean(todayIso && d.date === todayIso)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              return (
                <>
                  {pastWeeks.length > 0 ? (
                    <details className="plan-past">
                      <summary className="plan-past__summary">
                        Past weeks · {pastWeeks.length}
                      </summary>
                      <div className="plan-full">
                        {pastWeeks.map((week) => weekBlock(week, false))}
                      </div>
                    </details>
                  ) : null}
                  {liveWeeks.map((week) =>
                    weekBlock(week, week.weekIndex === currentIdx),
                  )}
                </>
              );
            })()}
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
  );
}
