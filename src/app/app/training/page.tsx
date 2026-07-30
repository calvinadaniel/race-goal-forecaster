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

  useEffect(() => {
    setPreviewIntensity(savedIntensity);
    setPreviewPlan(null);
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
          distanceKey: goal.distanceKey,
          targetTimeSec: goal.targetTimeSec,
          raceDate: goal.raceDate,
          intensity: previewIntensity,
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
    } finally {
      setApplyBusy(false);
    }
  }

  return (
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
                  <p className="m-0 text-sm leading-relaxed">
                    Previewing {POSTURE_LABELS[previewIntensity]} — not saved
                    yet.
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
              {weeks.map((week) => (
                <section key={week.weekStart} className="plan-full__week">
                  <header className="plan-full__head">
                    <SectionHeading
                      icon={CalendarRange}
                      title={`Week ${week.weekIndex}`}
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
              ))}
            </div>

            <ul className="muted mt-5 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {displayPlan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
