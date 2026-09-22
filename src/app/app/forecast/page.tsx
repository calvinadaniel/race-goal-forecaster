"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, SurfaceCard } from "@/components/ui-surface";
import { RecentActivitiesList } from "@/components/RecentActivitiesList";
import { formatDuration } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_BLURBS } from "@/lib/forecast/postures";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

export default function ForecastPage() {
  const { data, units, error, busy, refresh } = useForecastData();
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
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-6 w-56" />
        <div className="kpi-row mt-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </main>
    );
  }

  const { forecast, goal, strip } = data;
  const distLabel =
    DISTANCES[goal.distanceKey as DistanceKey]?.label ?? goal.distanceKey;

  return (
    <main className="container app-page">
      <div className="page-head">
        <h1 className="page-title">Forecast</h1>
        <Button
          variant="ghost"
          className="page-refresh"
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          {busy ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      <p
        className={cn(
          "display forecast-verdict",
          `verdict-${forecast.verdict}`,
        )}
      >
        {VERDICT_LABEL[forecast.verdict]}
      </p>
      <p className="mono forecast-times">
        Projected {formatDuration(forecast.predictedTimeSec)}
        <span className="muted"> vs {formatDuration(forecast.targetTimeSec)}</span>
      </p>
      <p className="muted max-w-xl leading-relaxed">
        {formatDuration(forecast.currentEquivalentSec)} fitness at {distLabel}.
        Confidence {forecast.confidence}.{" "}
        {data.stravaLinked
          ? "From synced races and workouts."
          : goal.manualBaseline
            ? "From your baseline race."
            : "Add a baseline or connect Strava for a sharper read."}
      </p>

      {forecast.fitness?.pr && !forecast.needsBaseline && (
        <p className="forecast-pr mono">
          Goal-distance PR {formatDuration(forecast.fitness.pr.equivalentSec)}
          <span className="muted">
            {" "}
            · {forecast.fitness.pr.label} · {forecast.fitness.pr.date}
          </span>
        </p>
      )}

      {!forecast.needsBaseline && (
        <div className="kpi-row mt-8">
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
        <SurfaceCard className="mt-6">
          <CardHeader>
            <CardTitle className="display text-xl">Need a baseline to forecast</CardTitle>
            <CardDescription>
              Add a recent race or sync more runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="muted m-0 list-disc pl-5">
              {forecast.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Button asChild>
              <Link href="/app/goal">Add baseline</Link>
            </Button>
          </CardContent>
        </SurfaceCard>
      )}

      {!forecast.needsBaseline && (
        <>
          {forecast.tips.length > 0 ? (
            <section className="app-section">
              <h2 className="section-title">To hit the goal</h2>
              <ol className="plain-list">
                {forecast.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="app-section">
            <h2 className="section-title">If intensity changes</h2>
            <div className="scenario-grid">
              {forecast.scenarios.map((s) => {
                const selected = s.intensity === goal.intensity;
                return (
                  <SurfaceCard
                    key={s.intensity}
                    className={cn(
                      "gap-2 py-4",
                      selected && "scenario--current",
                    )}
                  >
                    <CardHeader className="px-4 pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <CardDescription className="m-0 font-medium">
                          {s.label}
                        </CardDescription>
                        {selected ? (
                          <span className="scenario-current-label">Current</span>
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
            <h2 className="section-title">Why this forecast</h2>
            <ul className="plain-list">
              {forecast.why.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          {strip.topEfforts.length > 0 && (
            <section className="app-section">
              <h2 className="section-title">Recent activities</h2>
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
  );
}
