"use client";

import { AppShell } from "@/components/AppShell";
import { useForecastData } from "@/lib/use-forecast";

export default function TrainingPage() {
  const { data, error } = useForecastData();

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
          <p className="muted">Loading plan…</p>
        </main>
      </AppShell>
    );
  }

  const plan = data.forecast.trainingPlan;

  return (
    <AppShell>
      <main className="container app-page">
        <p className="eyebrow">Training</p>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0.35rem 0 0.75rem" }}>
          Suggested week
        </h1>

        {!plan || data.forecast.needsBaseline ? (
          <div className="card">
            <p style={{ margin: 0 }}>
              Set a goal with enough history to unlock a weekly training template.
            </p>
          </div>
        ) : (
          <>
            <p className="muted" style={{ margin: "0 0 1.25rem", maxWidth: "40rem", lineHeight: 1.55 }}>
              {plan.phase} phase · ~{plan.weeksOut} weeks out · {plan.weeklyMiles} mi/week ·{" "}
              {plan.runsPerWeek} runs · goal pace {plan.goalPacePerMi}
            </p>
            <div className="plan-week">
              {plan.days.map((d) => (
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
            <ul className="muted" style={{ margin: "1rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.6, fontSize: "0.9rem" }}>
              {plan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            {data.forecast.tips.length > 0 && (
              <section className="app-section">
                <h2 className="display section-title">Tips</h2>
                <div className="card">
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                    {data.forecast.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
