"use client";

import Link from "next/link";
import {
  Activity,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KpiCard, SectionHeading, SurfaceCard } from "@/components/ui-surface";
import { formatDuration } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_BLURBS, POSTURE_LABELS } from "@/lib/forecast/postures";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

const FOCUS_META: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-secondary text-secondary-foreground" },
  quality: { label: "Quality", className: "bg-primary text-primary-foreground" },
  long: { label: "Long", className: "bg-[var(--pine)] text-[#fff7ef]" },
  rest: { label: "Rest", className: "bg-muted text-muted-foreground" },
  race: { label: "Race", className: "bg-primary text-primary-foreground" },
};

export default function ForecastPage() {
  const { data, units, error, busy, refresh } = useForecastData();

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

  return (
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
          Current equivalent ≈ {formatDuration(forecast.currentEquivalentSec)} at {distLabel}.
          Confidence: {forecast.confidence}.
        </p>

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
            <KpiCard
              label="Volume score"
              value={`${(forecast.kpis.volumeScore * 100).toFixed(0)}%`}
            >
              <Progress
                value={Math.min(100, (forecast.kpis.volumeScore / 1.15) * 100)}
                aria-label="Volume"
                indicatorClassName="bg-primary"
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
                <p className="muted m-0 leading-relaxed">
                  {forecast.trainingPlan.phase} · {forecast.trainingPlan.weeklyMiles} mi · goal pace{" "}
                  {forecast.trainingPlan.goalPacePerMi}
                </p>
                <div className="plan-week">
                  {forecast.trainingPlan.days.map((d) => {
                    const focus = FOCUS_META[d.focus] ?? FOCUS_META.easy;
                    return (
                      <SurfaceCard
                        key={`${d.day}-${d.date ?? d.title}`}
                        className={cn("plan-day gap-2 py-3", `plan-day--${d.focus}`)}
                      >
                        <CardHeader className="gap-2 px-4 pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="eyebrow m-0">
                              {d.day}
                              {d.date ? ` · ${d.date.slice(5)}` : ""}
                            </p>
                            <Badge className={cn("rounded-full", focus.className)}>
                              {focus.label}
                            </Badge>
                          </div>
                          <CardTitle className="display text-lg">{d.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pt-0">
                          <p className="muted m-0 text-sm leading-snug">{d.detail}</p>
                        </CardContent>
                      </SurfaceCard>
                    );
                  })}
                </div>
                <Button asChild variant="link" className="h-auto px-0 font-bold text-primary">
                  <Link href="/app/training">
                    Full plan to race day
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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

            <section className="app-section">
              <div className="forecast-split">
                <div className="forecast-split__col">
                  <SectionHeading icon={Activity} title="Weekly volume" tone="pine" />
                  <SurfaceCard interactive={false} className="h-full">
                    <CardContent>
                      <div className="week-bars" aria-label="Weekly mileage chart">
                        {strip.weeklyMiles.map((w) => {
                          const max = Math.max(...strip.weeklyMiles.map((x) => x.miles), 1);
                          const ratio = w.miles / max;
                          const label =
                            units === "km"
                              ? (w.miles * 1.60934).toFixed(1)
                              : w.miles.toFixed(1);
                          const unit = units === "km" ? "km" : "mi";
                          const barColor =
                            ratio >= 0.85
                              ? "var(--accent)"
                              : ratio >= 0.55
                                ? "var(--pine)"
                                : ratio >= 0.25
                                  ? "color-mix(in srgb, var(--pine) 65%, var(--surface))"
                                  : "color-mix(in srgb, var(--text-muted) 45%, var(--surface))";
                          return (
                            <Tooltip key={w.weekStart}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="week-bars__col border-0 bg-transparent p-0"
                                  aria-label={`${w.weekStart}: ${label} ${unit}`}
                                >
                                  <div
                                    className="week-bars__bar"
                                    style={{
                                      height: `${Math.max(6, ratio * 100)}%`,
                                      background: barColor,
                                    }}
                                  />
                                  <span className="mono muted">{Math.round(Number(label))}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="m-0 font-semibold">{w.weekStart}</p>
                                <p className="mono m-0">
                                  {label} {unit}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </CardContent>
                  </SurfaceCard>
                </div>

                {strip.topEfforts.length > 0 && (
                  <div className="forecast-split__col">
                    <SectionHeading icon={Trophy} title="Recent activities" />
                    <SurfaceCard interactive={false} className="h-full">
                      <CardContent className="space-y-0 px-0 py-0">
                        {strip.topEfforts.map((e, i) => (
                          <div key={e.id}>
                            {i > 0 ? <Separator /> : null}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/60">
                              <div>
                                <p className="m-0 font-semibold">{e.name || "Run"}</p>
                                <p className="mono muted m-0 text-sm">{e.date}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="mono text-sm">
                                  {formatDuration(e.movingTimeSec)}
                                </span>
                                {e.isRace ? (
                                  <Badge className="rounded-full">Race</Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </SurfaceCard>
                  </div>
                )}
              </div>
            </section>

            <p className="mono muted pb-4 text-xs">
              Estimate only — not coaching or medical advice.
            </p>
          </>
        )}
      </main>
    </AppShell>
  );
}
