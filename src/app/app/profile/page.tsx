"use client";

import { AppShell } from "@/components/AppShell";
import { formatDuration } from "@/lib/units";
import { useForecastData } from "@/lib/use-forecast";

function formatPace(secPerMi: number | null): string {
  if (secPerMi == null || !Number.isFinite(secPerMi)) return "—";
  const m = Math.floor(secPerMi / 60);
  const s = Math.round(secPerMi % 60);
  return `${m}:${String(s).padStart(2, "0")}/mi`;
}

export default function ProfilePage() {
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
          <p className="muted">Loading profile…</p>
        </main>
      </AppShell>
    );
  }

  const { profile } = data;
  const ytdDisplay =
    units === "km"
      ? `${(profile.ytdMiles * 1.60934).toFixed(0)} km`
      : `${profile.ytdMiles.toFixed(0)} mi`;

  return (
    <AppShell
      headerAction={
        <button className="btn btn-ghost landing__btn" type="button" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <main className="container app-page">
        <p className="eyebrow">Profile</p>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0.35rem 0 0.75rem" }}>
          {profile.year} stats
        </h1>
        <p className="muted" style={{ margin: "0 0 1.25rem", lineHeight: 1.55 }}>
          From your synced Strava runs this calendar year.
        </p>

        <div className="profile-grid">
          <article className="card">
            <p className="eyebrow">YTD mileage</p>
            <p className="mono" style={{ fontSize: "2rem", margin: "0.35rem 0 0" }}>
              {ytdDisplay}
            </p>
          </article>
          <article className="card">
            <p className="eyebrow">Average pace</p>
            <p className="mono" style={{ fontSize: "2rem", margin: "0.35rem 0 0" }}>
              {formatPace(profile.avgPaceSecPerMi)}
            </p>
          </article>
          <article className="card">
            <p className="eyebrow">Races completed</p>
            <p className="mono" style={{ fontSize: "2rem", margin: "0.35rem 0 0" }}>
              {profile.racesCompleted}
            </p>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              Marked as race in Strava (not “wins” — we don’t have place data)
            </p>
          </article>
          <article className="card">
            <p className="eyebrow">Activities</p>
            <p className="mono" style={{ fontSize: "2rem", margin: "0.35rem 0 0" }}>
              {profile.activityCount}
            </p>
          </article>
        </div>

        {data.strip.topEfforts.length > 0 && (
          <section className="app-section">
            <h2 className="display section-title">Recent activities</h2>
            <div className="card">
              <ul style={{ margin: 0, paddingLeft: "1rem", lineHeight: 1.7 }}>
                {data.strip.topEfforts.map((e) => (
                  <li key={e.id}>
                    <span className="mono">{e.date}</span> · {e.name || "Run"} ·{" "}
                    {formatDuration(e.movingTimeSec)}
                    {e.isRace ? " · race" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
