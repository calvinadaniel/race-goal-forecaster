"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistance, formatDuration, type Units } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_BLURBS, POSTURE_LABELS } from "@/lib/forecast/postures";

type ForecastPayload = {
  goal: {
    distanceKey: string;
    distanceM: number;
    targetTimeSec: number;
    raceDate: string;
    intensity: string;
  };
  forecast: {
    verdict: "on_track" | "at_risk" | "unlikely";
    predictedTimeSec: number;
    targetTimeSec: number;
    currentEquivalentSec: number;
    confidence: string;
    why: string[];
    tips: string[];
    trainingPlan: {
      phase: string;
      weeklyMiles: number;
      runsPerWeek: number;
      goalPacePerMi: string;
      weeksOut: number;
      days: { day: string; focus: string; title: string; detail: string }[];
      notes: string[];
    } | null;
    kpis: {
      gapSec: number;
      gapPct: number;
      fitnessRatio: number;
      volumeScore: number;
    };
    needsBaseline: boolean;
    missing: string[];
    scenarios: {
      intensity: string;
      label: string;
      predictedTimeSec: number;
      verdict: "on_track" | "at_risk" | "unlikely";
    }[];
    history: { recentWeeklyMiles: number; weeksWithRuns: number };
    effortsUsed: { label: string; date: string; equivalentSec: number }[];
  };
  strip: {
    weeklyMiles: { weekStart: string; miles: number }[];
    topEfforts: {
      id: string;
      name: string | null;
      date: string;
      distanceM: number;
      movingTimeSec: number;
      isRace: boolean;
    }[];
  };
};

const VERDICT_LABEL = {
  on_track: "On track",
  at_risk: "At risk",
  unlikely: "Unlikely",
};

export default function AppPage() {
  const [data, setData] = useState<ForecastPayload | null>(null);
  const [units, setUnits] = useState<Units>("mi");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const goalMeta = await fetch("/api/goal");
    if (goalMeta.ok) {
      const meta = await goalMeta.json();
      setUnits(meta.units ?? "mi");
      if (!meta.goal) {
        window.location.href = "/onboarding";
        return;
      }
    }
    const res = await fetch("/api/forecast");
    if (res.status === 404) {
      window.location.href = "/onboarding";
      return;
    }
    if (!res.ok) {
      setError("Could not load forecast");
      return;
    }
    setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setBusy(true);
    try {
      await fetch("/api/strava/sync", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="container" style={{ padding: "2rem 0" }}>
        <p style={{ color: "var(--danger)" }}>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container" style={{ padding: "2rem 0" }}>
        <p className="muted">Loading forecast…</p>
      </main>
    );
  }

  const { forecast, goal, strip } = data;
  const distLabel =
    DISTANCES[goal.distanceKey as DistanceKey]?.label ?? goal.distanceKey;

  return (
    <main>
      <header
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          padding: "1.25rem 0",
          flexWrap: "wrap",
        }}
      >
        <div className="display" style={{ fontSize: "1.25rem" }}>
          Race Goal <span style={{ color: "var(--accent)" }}>Forecaster</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/app/goal">
            Edit goal
          </Link>
          <button className="btn btn-primary" type="button" onClick={refresh} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh Strava"}
          </button>
        </div>
      </header>

      <section className="container" style={{ paddingBottom: "2rem" }}>
        <p className="eyebrow">
          {distLabel} · {goal.raceDate} · {POSTURE_LABELS[goal.intensity as keyof typeof POSTURE_LABELS]}
        </p>
        <h1
          className={`display verdict-${forecast.verdict}`}
          style={{ fontSize: "clamp(2.8rem, 9vw, 5rem)", margin: "0.35rem 0" }}
        >
          {VERDICT_LABEL[forecast.verdict]}
        </h1>
        <p className="mono" style={{ fontSize: "1.35rem", margin: "0 0 0.75rem" }}>
          Projected {formatDuration(forecast.predictedTimeSec)}
          <span className="muted"> vs goal {formatDuration(forecast.targetTimeSec)}</span>
        </p>
        <p className="muted" style={{ maxWidth: "36rem", lineHeight: 1.6 }}>
          Current equivalent fitness ≈ {formatDuration(forecast.currentEquivalentSec)} at{" "}
          {distLabel}. Confidence: {forecast.confidence}.
        </p>

        {!forecast.needsBaseline && (
          <div className="kpi-row" style={{ marginTop: "1.5rem" }}>
            <article className="card kpi">
              <p className="eyebrow">Gap to goal</p>
              <p className="mono kpi__value">
                {forecast.kpis.gapSec <= 0
                  ? "Ahead"
                  : `+${formatDuration(forecast.kpis.gapSec)}`}
              </p>
              <div
                className="kpi__bar"
                role="meter"
                aria-valuenow={Math.round(Math.min(15, Math.max(0, forecast.kpis.gapPct * 100)))}
                aria-valuemin={0}
                aria-valuemax={15}
                aria-label="Projected gap percent"
              >
                <span
                  style={{
                    width: `${Math.min(100, Math.max(4, Math.abs(forecast.kpis.gapPct) * 500))}%`,
                    background: forecast.kpis.gapSec <= 0 ? "var(--pine)" : "var(--accent)",
                  }}
                />
              </div>
              <p className="muted kpi__hint">
                {(forecast.kpis.gapPct * 100).toFixed(1)}% vs target time
              </p>
            </article>
            <article className="card kpi">
              <p className="eyebrow">Fitness vs goal</p>
              <p className="mono kpi__value">
                {(forecast.kpis.fitnessRatio * 100).toFixed(0)}%
              </p>
              <div className="kpi__bar" role="meter" aria-label="Current fitness vs goal">
                <span
                  style={{
                    width: `${Math.min(100, (1 / Math.max(forecast.kpis.fitnessRatio, 0.5)) * 100)}%`,
                    background: "var(--pine)",
                  }}
                />
              </div>
              <p className="muted kpi__hint">100% = current fitness matches goal</p>
            </article>
            <article className="card kpi">
              <p className="eyebrow">Volume score</p>
              <p className="mono kpi__value">
                {(forecast.kpis.volumeScore * 100).toFixed(0)}%
              </p>
              <div className="kpi__bar" role="meter" aria-label="Volume score">
                <span
                  style={{
                    width: `${Math.min(100, (forecast.kpis.volumeScore / 1.15) * 100)}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <p className="muted kpi__hint">Mileage + consistency (cap ~115%)</p>
            </article>
          </div>
        )}

        {forecast.needsBaseline && (
          <div className="card" style={{ marginTop: "1rem", borderColor: "var(--accent)" }}>
            <p style={{ margin: "0 0 0.5rem" }}>Need more history to forecast.</p>
            <ul className="muted" style={{ margin: 0 }}>
              {forecast.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Link className="btn btn-primary" href="/app/goal" style={{ marginTop: "1rem" }}>
              Add baseline / edit goal
            </Link>
          </div>
        )}
      </section>

      {!forecast.needsBaseline && (
        <>
          <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "2rem" }}>
            <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
              Plan to hit the goal
            </h2>
            <div className="card">
              <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                {forecast.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ol>
            </div>
          </section>

          {forecast.trainingPlan && (
            <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "2rem" }}>
              <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
                Suggested week
              </h2>
              <p className="muted" style={{ margin: 0, maxWidth: "40rem", lineHeight: 1.55 }}>
                {forecast.trainingPlan.phase} phase · ~{forecast.trainingPlan.weeksOut} weeks out ·{" "}
                {forecast.trainingPlan.weeklyMiles} mi/week · {forecast.trainingPlan.runsPerWeek}{" "}
                runs · goal pace {forecast.trainingPlan.goalPacePerMi}
              </p>
              <div className="plan-week">
                {forecast.trainingPlan.days.map((d) => (
                  <article key={d.day} className={`card plan-day plan-day--${d.focus}`}>
                    <p className="eyebrow" style={{ margin: 0 }}>
                      {d.day}
                    </p>
                    <p className="display" style={{ fontSize: "1.15rem", margin: "0.35rem 0" }}>
                      {d.title}
                    </p>
                    <p className="muted" style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45 }}>
                      {d.detail}
                    </p>
                  </article>
                ))}
              </div>
              <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.6, fontSize: "0.9rem" }}>
                {forecast.trainingPlan.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "2rem" }}>
            <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
              What if intensity changes?
            </h2>
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              }}
            >
              {forecast.scenarios.map((s) => (
                <article
                  key={s.intensity}
                  className="card"
                  style={{
                    outline:
                      s.intensity === goal.intensity
                        ? "2px solid var(--accent)"
                        : undefined,
                  }}
                >
                  <p className="eyebrow" style={{ margin: 0 }}>
                    {s.label}
                  </p>
                  <p
                    className={`display verdict-${s.verdict}`}
                    style={{ fontSize: "1.6rem", margin: "0.4rem 0" }}
                  >
                    {VERDICT_LABEL[s.verdict]}
                  </p>
                  <p className="mono" style={{ margin: 0 }}>
                    {formatDuration(s.predictedTimeSec)}
                  </p>
                  <p className="muted" style={{ fontSize: "0.85rem", margin: "0.5rem 0 0" }}>
                    {POSTURE_BLURBS[s.intensity as keyof typeof POSTURE_BLURBS]}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "2rem" }}>
            <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
              Why this forecast
            </h2>
            <div className="card">
              <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7 }}>
                {forecast.why.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "2rem" }}>
            <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
              Weekly volume
            </h2>
            <div className="card">
              <div className="week-bars" aria-label="Weekly mileage chart">
                {strip.weeklyMiles.slice(-12).map((w) => {
                  const max = Math.max(
                    ...strip.weeklyMiles.slice(-12).map((x) => x.miles),
                    1,
                  );
                  const label =
                    units === "km"
                      ? (w.miles * 1.60934).toFixed(0)
                      : w.miles.toFixed(0);
                  return (
                    <div key={w.weekStart} className="week-bars__col" title={`${w.weekStart}: ${label}`}>
                      <div
                        className="week-bars__bar"
                        style={{ height: `${Math.max(6, (w.miles / max) * 100)}%` }}
                      />
                      <span className="mono muted">{label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.85rem" }}>
                Last {Math.min(12, strip.weeklyMiles.length)} weeks ({units === "km" ? "km" : "mi"})
              </p>
            </div>
          </section>

          <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "3rem" }}>
            <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
              Recent training snapshot
            </h2>
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <article className="card">
                <p className="eyebrow">Avg weekly volume (4 wks)</p>
                <p className="mono" style={{ fontSize: "1.6rem", margin: "0.4rem 0" }}>
                  {units === "km"
                    ? `${(forecast.history.recentWeeklyMiles * 1.60934).toFixed(1)} km`
                    : `${forecast.history.recentWeeklyMiles.toFixed(1)} mi`}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {forecast.history.weeksWithRuns} weeks with runs in history
                </p>
              </article>
              <article className="card">
                <p className="eyebrow">Efforts used</p>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1rem", lineHeight: 1.6 }}>
                  {forecast.effortsUsed.map((e) => (
                    <li key={e.label + e.date}>
                      <span className="mono">{e.date}</span> · {e.label} →{" "}
                      {formatDuration(e.equivalentSec)} eq.
                    </li>
                  ))}
                </ul>
              </article>
              <article className="card">
                <p className="eyebrow">Latest activities</p>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1rem", lineHeight: 1.6 }}>
                  {strip.topEfforts.map((e) => (
                    <li key={e.id}>
                      <span className="mono">{e.date}</span> · {e.name || "Run"} ·{" "}
                      {formatDistance(e.distanceM, units)} · {formatDuration(e.movingTimeSec)}
                      {e.isRace ? " · race" : ""}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <p className="mono muted" style={{ fontSize: "0.75rem" }}>
              Estimate only — not coaching or medical advice.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
