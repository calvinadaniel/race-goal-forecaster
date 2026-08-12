"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleHelp,
  Flame,
  Gauge,
  Lightbulb,
  ListOrdered,
  RefreshCw,
  Route,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlanDayCard } from "@/components/PlanDayCard";
import { PlanStatusBanner } from "@/components/PlanStatusBanner";
import { StartPlanSheet } from "@/components/StartPlanSheet";
import { TermHelpProvider } from "@/components/TermHelpProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, SectionHeading, SurfaceCard } from "@/components/ui-surface";
import { RecentActivitiesList } from "@/components/RecentActivitiesList";
import { formatDuration } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_BLURBS, POSTURE_LABELS } from "@/lib/forecast/postures";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";const FOCUS_META: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-secondary text-secondary-foreground" },
  optional: {
    label: "Optional",
    className: "bg-secondary text-secondary-foreground",
  },
  quality: { label: "Quality", className: "bg-primary text-primary-foreground" },
  long: { label: "Long", className: "bg-[var(--pine)] text-[#fff7ef]" },
  rest: { label: "Rest", className: "bg-muted text-muted-foreground" },
  race: { label: "Race", className: "bg-primary text-primary-foreground" },
};

export default function ForecastPage() {
  const { data, units, error, busy, load, refresh } = useForecastData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"start" | "reschedule">("start");
  const [draftBusy, setDraftBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
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
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-72" />
          <Skeleton className="h-6 w-56" />
          <div className="kpi-row mt-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </main>
      </AppShell>
    );
  }

  const { forecast, goal, strip } = data;
  const distLabel =
    DISTANCES[goal.distanceKey as DistanceKey]?.label ?? goal.distanceKey;

  async function backToDraft() {
    setDraftBusy(true);
    setPlanError(null);
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
      setPlanError("Could not return to draft. Please try again.");
    } finally {
      setDraftBusy(false);
    }
  }
  return (
    <TermHelpProvider>
    <AppShell
      headerAction={
        <Button
          variant="outline"
          className="landing__btn h-10 rounded-xl font-bold"
          type="button"
          onClick={refresh}
          disabled={busy}
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      }
    >
      <main className="container app-page">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <Route className="size-3.5" />
            {distLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <CalendarDays className="size-3.5" />
            {goal.raceDate}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <Flame className="size-3.5" />
            {POSTURE_LABELS[goal.intensity as keyof typeof POSTURE_LABELS]}
          </Badge>
        </div>

        <h1
          className={cn(
            "display mt-3 mb-2 text-[clamp(2.6rem,8vw,4.5rem)]",
            `verdict-${forecast.verdict}`,
          )}
        >
          {VERDICT_LABEL[forecast.verdict]}
        </h1>
        <p className="mono mb-3 text-xl">
          Projected {formatDuration(forecast.predictedTimeSec)}
          <span className="muted"> vs goal {formatDuration(forecast.targetTimeSec)}</span>
        </p>
        <p className="muted max-w-xl leading-relaxed">
          Blended fitness ≈ {formatDuration(forecast.currentEquivalentSec)} at {distLabel}.
          Confidence: {forecast.confidence}.{" "}
          {data.stravaLinked
            ? "Based on synced races/workouts"
            : goal.manualBaseline
              ? "Based on your manual baseline"
              : "Add a baseline or connect Strava for a sharper read"}
          .
        </p>

        {/* Recent form + volume UI hidden until Strava/API sync is reliable for beta */}
        {forecast.fitness?.pr && !forecast.needsBaseline && (
          <div className="mt-4 max-w-md">
            <SurfaceCard className="gap-1 py-3" interactive={false}>
              <CardHeader className="px-4 pb-0 pt-0">
                <CardDescription className="eyebrow m-0 text-[0.7rem] tracking-[0.14em]">
                  Goal-distance PR
                </CardDescription>
                <CardTitle className="mono text-2xl font-medium">
                  {formatDuration(forecast.fitness.pr.equivalentSec)}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pt-1 pb-0">
                <p className="muted m-0 text-sm">
                  {`${forecast.fitness.pr.label} · ${forecast.fitness.pr.date} · ${forecast.fitness.pr.ageDays}d ago`}
                </p>
              </CardContent>
            </SurfaceCard>
          </div>
        )}

        {!forecast.needsBaseline && (
          <div className="kpi-row mt-6">
            <KpiCard
              label="Gap to goal"
              value={
                forecast.kpis.gapSec <= 0
                  ? "Ahead"
                  : `+${formatDuration(forecast.kpis.gapSec)}`
              }
            >
              <Progress
                value={Math.min(100, Math.max(8, Math.abs(forecast.kpis.gapPct) * 500))}
                aria-label="Projected gap"
                indicatorClassName={
                  forecast.kpis.gapSec <= 0 ? "bg-[var(--pine)]" : "bg-primary"
                }
              />
            </KpiCard>
            <KpiCard
              label="Fitness vs goal"
              value={`${(forecast.kpis.fitnessRatio * 100).toFixed(0)}%`}
            >
              <Progress
                value={Math.min(100, (1 / Math.max(forecast.kpis.fitnessRatio, 0.5)) * 100)}
                aria-label="Fitness"
                indicatorClassName="bg-[var(--pine)]"
              />
            </KpiCard>
          </div>
        )}

        {forecast.needsBaseline && (
          <SurfaceCard className="mt-4 border-primary/40">
            <CardHeader>
              <CardTitle className="display text-xl">Need more history to forecast</CardTitle>
              <CardDescription>Add a baseline race or sync more runs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="muted m-0 list-disc pl-5">
                {forecast.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <Button asChild className="landing__btn h-10 rounded-xl font-bold">
                <Link href="/app/goal">Add baseline / edit goal</Link>
              </Button>
            </CardContent>
          </SurfaceCard>
        )}

        {!forecast.needsBaseline && (
          <>
            <section className="app-section">
              <SectionHeading icon={Lightbulb} title="Plan to hit the goal" />
              <SurfaceCard interactive={false}>
                <CardContent>
                  <ol className="m-0 list-decimal space-y-2 pl-5 leading-relaxed">
                    {forecast.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ol>
                </CardContent>
              </SurfaceCard>
            </section>

            {forecast.trainingPlan && (
              <section className="app-section">
                <SectionHeading icon={ListOrdered} title="This week's suggestion" tone="pine" />
                <PlanStatusBanner
                  className="mb-4"
                  planStatus={
                    forecast.trainingPlan.planStatus ??
                    (goal.planStartMonday ? "started" : "draft")
                  }
                  currentWeekIndex={forecast.trainingPlan.currentWeekIndex ?? 1}
                  weeksOut={forecast.trainingPlan.weeksOut}
                  planStartMonday={
                    forecast.trainingPlan.planStartMonday ?? goal.planStartMonday
                  }
                  phase={forecast.trainingPlan.phase}
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
                {planError ? (
                  <p className="mb-3 text-sm text-destructive" role="alert">
                    {planError}
                  </p>
                ) : null}
                <p className="muted m-0 leading-relaxed">
                  {forecast.trainingPlan.planStatus === "started"
                    ? `Week ${forecast.trainingPlan.currentWeekIndex} · `
                    : "Draft · "}
                  {forecast.trainingPlan.phase} · {forecast.trainingPlan.weeklyMiles}{" "}
                  mi · goal pace {forecast.trainingPlan.goalPacePerMi}
                </p>
                <div className="plan-week">
                  {forecast.trainingPlan.days.map((d) => {
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
                <Button asChild variant="link" className="h-auto px-0 font-bold text-primary">
                  <Link href="/app/training">
                    Full plan to race day
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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
              </section>
            )}

            <section className="app-section">
              <SectionHeading icon={Gauge} title="What if intensity changes?" />
              <div className="scenario-grid">
                {forecast.scenarios.map((s) => {
                  const selected = s.intensity === goal.intensity;
                  return (
                    <SurfaceCard
                      key={s.intensity}
                      className={cn(
                        "gap-2 py-4",
                        selected && "ring-2 ring-primary ring-offset-2 ring-offset-[var(--bg)]",
                      )}
                    >
                      <CardHeader className="px-4 pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <CardDescription className="eyebrow m-0 text-[var(--accent)]">
                            {s.label}
                          </CardDescription>
                          {selected ? (
                            <Badge className="rounded-full">Current</Badge>
                          ) : null}
                        </div>
                        <CardTitle
                          className={cn(
                            "display text-2xl",
                            `verdict-${s.verdict}`,
                          )}
                        >
                          {VERDICT_LABEL[s.verdict]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 px-4 pt-0">
                        <p className="mono m-0 text-base">
                          {formatDuration(s.predictedTimeSec)}
                        </p>
                        <p className="muted m-0 text-sm leading-snug">
                          {POSTURE_BLURBS[s.intensity as keyof typeof POSTURE_BLURBS]}
                        </p>
                      </CardContent>
                    </SurfaceCard>
                  );
                })}
              </div>
            </section>

            <section className="app-section">
              <SectionHeading icon={CircleHelp} title="Why this forecast" />
              <SurfaceCard interactive={false}>
                <CardContent>
                  <ul className="m-0 list-disc space-y-2 pl-5 leading-relaxed">
                    {forecast.why.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </CardContent>
              </SurfaceCard>
            </section>

            {strip.topEfforts.length > 0 && (
              <section className="app-section">
                <SectionHeading icon={Trophy} title="Recent activities" />
                <SurfaceCard interactive={false}>
                  <CardContent className="px-0 py-0">
                    <RecentActivitiesList activities={strip.topEfforts} units={units} />
                  </CardContent>
                </SurfaceCard>
              </section>
            )}

            <p className="mono muted pb-4 text-xs">
              Estimate only — not coaching or medical advice.
            </p>
          </>
        )}
      </main>
    </AppShell>
    </TermHelpProvider>
  );
}
