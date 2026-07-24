"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { formatDuration } from "@/lib/units";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { POSTURE_BLURBS, POSTURE_LABELS } from "@/lib/forecast/postures";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";

export default function ForecastPage() {
  const { data, units, error, busy, refresh } = useForecastData();

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
          <p className="muted">Loading forecast…</p>
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
        <button className="btn btn-ghost landing__btn" type="button" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <main className="container app-page">
        <p className="eyebrow">
          {distLabel} · {goal.raceDate} ·{" "}
          {POSTURE_LABELS[goal.intensity as keyof typeof POSTURE_LABELS]}
        </p>
        <h1
          className={`display verdict-${forecast.verdict}`}
          style={{ fontSize: "clamp(2.6rem, 8vw, 4.5rem)", margin: "0.35rem 0" }}
        >
          {VERDICT_LABEL[forecast.verdict]}
        </h1>
        <p className="mono" style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>
          Projected {formatDuration(forecast.predictedTimeSec)}
          <span className="muted"> vs goal {formatDuration(forecast.targetTimeSec)}</span>
        </p>
        <p className="muted" style={{ maxWidth: "36rem", lineHeight: 1.6 }}>
          Current equivalent ≈ {formatDuration(forecast.currentEquivalentSec)} at {distLabel}.
          Confidence: {forecast.confidence}.
        </p>

        {!forecast.needsBaseline && (
          <div className="kpi-row" style={{ marginTop: "1.5rem" }}>
            <article className="card kpi">
              <p className="eyebrow">Gap to goal</p>
              <p className="mono kpi__value">
                {forecast.kpis.gapSec <= 0 ? "Ahead" : `+${formatDuration(forecast.kpis.gapSec)}`}
              </p>
              <div className="kpi__bar" role="meter" aria-label="Projected gap">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(4, Math.abs(forecast.kpis.gapPct) * 500))}%`,
                    background: forecast.kpis.gapSec <= 0 ? "var(--pine)" : "var(--accent)",
                  }}
                />
              </div>
            </article>
            <article className="card kpi">
              <p className="eyebrow">Fitness vs goal</p>
              <p className="mono kpi__value">{(forecast.kpis.fitnessRatio * 100).toFixed(0)}%</p>
              <div className="kpi__bar" role="meter" aria-label="Fitness">
                <span
                  style={{
                    width: `${Math.min(100, (1 / Math.max(forecast.kpis.fitnessRatio, 0.5)) * 100)}%`,
                    background: "var(--pine)",
                  }}
                />
              </div>
            </article>
            <article className="card kpi">
              <p className="eyebrow">Volume score</p>
              <p className="mono kpi__value">{(forecast.kpis.volumeScore * 100).toFixed(0)}%</p>
              <div className="kpi__bar" role="meter" aria-label="Volume">
                <span
                  style={{
                    width: `${Math.min(100, (forecast.kpis.volumeScore / 1.15) * 100)}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
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
            <Link className="btn btn-primary landing__btn" href="/app/goal" style={{ marginTop: "1rem" }}>
              Add baseline / edit goal
            </Link>
          </div>
        )}

        {!forecast.needsBaseline && (
          <>
            <section className="app-section">
              <h2 className="display section-title">Plan to hit the goal</h2>
              <div className="card">
                <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  {forecast.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="app-section">
              <h2 className="display section-title">What if intensity changes?</h2>
              <div className="scenario-grid">
                {forecast.scenarios.map((s) => (
                  <article
                    key={s.intensity}
                    className="card"
                    style={{
                      outline: s.intensity === goal.intensity ? "2px solid var(--accent)" : undefined,
                    }}
                  >
                    <p className="eyebrow" style={{ margin: 0 }}>
                      {s.label}
                    </p>
                    <p className={`display verdict-${s.verdict}`} style={{ fontSize: "1.5rem", margin: "0.4rem 0" }}>
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

            <section className="app-section">
              <h2 className="display section-title">Why this forecast</h2>
              <div className="card">
                <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7 }}>
                  {forecast.why.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="app-section">
              <h2 className="display section-title">Weekly volume</h2>
              <div className="card">
                <div className="week-bars" aria-label="Weekly mileage chart">
                  {strip.weeklyMiles.map((w) => {
                    const max = Math.max(...strip.weeklyMiles.map((x) => x.miles), 1);
                    const label =
                      units === "km" ? (w.miles * 1.60934).toFixed(0) : w.miles.toFixed(0);
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
              </div>
            </section>

            <p className="mono muted" style={{ fontSize: "0.75rem", paddingBottom: "1rem" }}>
              Estimate only — not coaching or medical advice.
            </p>
          </>
        )}
      </main>
    </AppShell>
  );
}
