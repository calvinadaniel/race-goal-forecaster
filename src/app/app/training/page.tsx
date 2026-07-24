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
  const weeks = plan?.weeks ?? [];

  return (
    <AppShell>
      <main className="container app-page">
        <p className="eyebrow">Training</p>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0.35rem 0 0.75rem" }}>
          Full plan to race day
        </h1>

        {!plan || data.forecast.needsBaseline ? (
          <div className="card">
            <p style={{ margin: 0 }}>
              Set a goal with enough history to unlock a training plan through race day.
            </p>
          </div>
        ) : (
          <>
            <p className="muted" style={{ margin: "0 0 1.25rem", maxWidth: "40rem", lineHeight: 1.55 }}>
              {plan.startDate} → {plan.endDate} · {weeks.length} week
              {weeks.length === 1 ? "" : "s"} · goal pace {plan.goalPacePerMi} ·{" "}
              {plan.runsPerWeek} runs/week pattern
            </p>

            <div className="plan-full">
              {weeks.map((week) => (
                <section key={week.weekStart} className="plan-full__week">
                  <header className="plan-full__head">
                    <h2 className="display" style={{ fontSize: "1.35rem", margin: 0 }}>
                      Week {week.weekIndex}
                    </h2>
                    <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      {week.phase} · starts {week.weekStart} · ~{week.weeklyMiles} mi
                    </p>
                  </header>
                  <div className="plan-week">
                    {week.days.map((d) => (
                      <article
                        key={`${week.weekStart}-${d.day}-${d.date ?? ""}`}
                        className={`card plan-day plan-day--${d.focus}`}
                      >
                        <p className="eyebrow" style={{ margin: 0 }}>
                          {d.day}
                          {d.date ? ` · ${d.date.slice(5)}` : ""}
                        </p>
                        <p className="display" style={{ fontSize: "1.1rem", margin: "0.35rem 0" }}>
                          {d.title}
                        </p>
                        <p className="muted" style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.45 }}>
                          {d.detail}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <ul
              className="muted"
              style={{ margin: "1.25rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.6, fontSize: "0.9rem" }}
            >
              {plan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
