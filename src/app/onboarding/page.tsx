"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTANCE_LIST } from "@/lib/forecast/distances";
import { parseDuration } from "@/lib/units";

export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [distanceKey, setDistanceKey] = useState("half");
  const [targetTime, setTargetTime] = useState("1:45:00");
  const [raceDate, setRaceDate] = useState("");
  const [intensity, setIntensity] = useState("balanced");
  const [units, setUnits] = useState<"mi" | "km">("mi");
  const [baselineDistance, setBaselineDistance] = useState("half");
  const [baselineTime, setBaselineTime] = useState("1:43:24");
  const [baselineDate, setBaselineDate] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSyncNote("Checking for Strava…");
      const sync = await fetch("/api/strava/sync", { method: "POST" });
      const syncData = await sync.json().catch(() => ({}));
      if (syncData.skipped) {
        setSyncNote(
          syncData.message ||
            "No Strava linked — forecast will use your baseline.",
        );
      } else if (sync.ok) {
        setSyncNote(`Synced ${syncData.synced ?? 0} runs.`);
      } else {
        setSyncNote(
          syncData.message ||
            "Strava sync unavailable — continuing with baseline.",
        );
      }

      const targetTimeSec = parseDuration(targetTime);
      if (!targetTimeSec) throw new Error("Invalid target time (use H:MM:SS or M:SS)");
      if (!raceDate) throw new Error("Race date is required");

      const timeSec = parseDuration(baselineTime);
      if (!timeSec || !baselineDate) {
        throw new Error("A recent race baseline (time + date) is required");
      }
      const manualBaseline = {
        distanceKey: baselineDistance,
        timeSec,
        date: baselineDate,
      };

      const goalRes = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKey,
          targetTimeSec,
          raceDate,
          intensity,
          units,
          manualBaseline,
        }),
      });
      if (!goalRes.ok) throw new Error("Could not save goal");
      router.push("/app/forecast");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ padding: "2rem 0 4rem" }}>
      <p className="eyebrow">Onboarding</p>
      <h1 className="display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0.4rem 0 0.5rem" }}>
        Set your race goal
      </h1>
      <p className="muted" style={{ marginBottom: "1.5rem", maxWidth: "36rem" }}>
        Add a recent race or time trial as your baseline so we can forecast.
        Connect Strava anytime from Profile for synced history.
      </p>

      <form className="card form-grid" onSubmit={onSubmit}>
        <div className="form-grid two">
          <label>
            Goal distance
            <select value={distanceKey} onChange={(e) => setDistanceKey(e.target.value)}>
              {DISTANCE_LIST.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target finish time
            <input
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              placeholder="3:05:00"
              required
            />
          </label>
          <label>
            Race date
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              required
            />
          </label>
          <label>
            Training posture
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
          <label>
            Units
            <select value={units} onChange={(e) => setUnits(e.target.value as "mi" | "km")}>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </label>
        </div>

        <div>
          <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>
            Required baseline
          </p>
          <div className="form-grid two">
            <label>
              Baseline distance
              <select
                value={baselineDistance}
                onChange={(e) => setBaselineDistance(e.target.value)}
                required
              >
                {DISTANCE_LIST.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Baseline finish time
              <input
                value={baselineTime}
                onChange={(e) => setBaselineTime(e.target.value)}
                placeholder="1:43:24"
                required
              />
            </label>
            <label>
              Baseline date
              <input
                type="date"
                value={baselineDate}
                onChange={(e) => setBaselineDate(e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--danger)", margin: 0 }} role="alert">
            {error}
          </p>
        )}
        {syncNote && (
          <p className="muted mono" style={{ margin: 0, fontSize: "0.8rem" }}>
            {syncNote}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Working…" : "Save goal & forecast"}
        </button>
      </form>
    </main>
  );
}
