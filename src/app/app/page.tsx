"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { formatDuration } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_LABELS } from "@/lib/forecast/postures";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";

export default function HomePage() {
  const { data, error, busy, refresh } = useForecastData();

  if (error) {
    return (
      <AppShell>
        <main className="container app-page">
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <main className="container app-page">
          <p className="muted">Loading…</p>
        </main>
      </AppShell>
    );
  }

  const { forecast, goal } = data;
  const distLabel =
    DISTANCES[goal.distanceKey as DistanceKey]?.label ?? goal.distanceKey;

  return (
    <AppShell
      headerAction={
        <button className="btn btn-ghost landing__btn" type="button" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <main className="container app-page">
        <p className="eyebrow">Home</p>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0.35rem 0 0.75rem" }}>
          {distLabel}
        </h1>
        <p className="muted" style={{ margin: "0 0 1.25rem", lineHeight: 1.55 }}>
          Race day {goal.raceDate} ·{" "}
          {POSTURE_LABELS[goal.intensity as keyof typeof POSTURE_LABELS]} · goal{" "}
          {formatDuration(goal.targetTimeSec)}
        </p>

        <Link href="/app/forecast" className="card home-verdict">
          <p className="eyebrow" style={{ margin: 0 }}>
            Today&apos;s forecast
          </p>
          <p className={`display verdict-${forecast.verdict}`} style={{ fontSize: "2.4rem", margin: "0.35rem 0" }}>
            {VERDICT_LABEL[forecast.verdict]}
          </p>
          <p className="mono" style={{ margin: 0 }}>
            {formatDuration(forecast.predictedTimeSec)}
            <span className="muted"> / {formatDuration(forecast.targetTimeSec)}</span>
          </p>
        </Link>

        <div className="home-links">
          <Link className="card" href="/app/training">
            <p className="eyebrow" style={{ margin: 0 }}>
              Training
            </p>
            <p className="display" style={{ fontSize: "1.35rem", margin: "0.35rem 0 0" }}>
              Suggested week
            </p>
          </Link>
          <Link className="card" href="/app/goal">
            <p className="eyebrow" style={{ margin: 0 }}>
              Goal
            </p>
            <p className="display" style={{ fontSize: "1.35rem", margin: "0.35rem 0 0", color: "var(--accent)" }}>
              Edit goal →
            </p>
          </Link>
          <Link className="card" href="/app/profile">
            <p className="eyebrow" style={{ margin: 0 }}>
              Profile
            </p>
            <p className="display" style={{ fontSize: "1.35rem", margin: "0.35rem 0 0" }}>
              Yearly stats
            </p>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
