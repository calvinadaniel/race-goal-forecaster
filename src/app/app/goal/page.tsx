"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DISTANCE_LIST } from "@/lib/forecast/distances";
import { formatDuration, parseDuration } from "@/lib/units";

export default function EditGoalPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceKey, setDistanceKey] = useState("half");
  const [targetTime, setTargetTime] = useState("1:45:00");
  const [raceDate, setRaceDate] = useState("");
  const [intensity, setIntensity] = useState("balanced");
  const [units, setUnits] = useState<"mi" | "km">("mi");
  const [useBaseline, setUseBaseline] = useState(false);
  const [baselineDistance, setBaselineDistance] = useState("half");
  const [baselineTime, setBaselineTime] = useState("");
  const [baselineDate, setBaselineDate] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/goal");
      if (!res.ok) return;
      const data = await res.json();
      setUnits(data.units ?? "mi");
      if (data.goal) {
        setDistanceKey(data.goal.distanceKey);
        setTargetTime(formatDuration(data.goal.targetTimeSec));
        setRaceDate(new Date(data.goal.raceDate).toISOString().slice(0, 10));
        setIntensity(data.goal.intensity);
        if (data.goal.manualBaseline) {
          setUseBaseline(true);
          setBaselineDistance(data.goal.manualBaseline.distanceKey);
          setBaselineTime(formatDuration(data.goal.manualBaseline.timeSec));
          setBaselineDate(data.goal.manualBaseline.date);
        }
      }
      setLoaded(true);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const targetTimeSec = parseDuration(targetTime);
      if (!targetTimeSec) throw new Error("Invalid target time");
      let manualBaseline = null;
      if (useBaseline) {
        const timeSec = parseDuration(baselineTime);
        if (!timeSec || !baselineDate) throw new Error("Baseline incomplete");
        manualBaseline = {
          distanceKey: baselineDistance,
          timeSec,
          date: baselineDate,
        };
      }
      const res = await fetch("/api/goal", {
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
      if (!res.ok) throw new Error("Save failed");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <main className="container" style={{ padding: "2rem 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: "2rem 0 4rem" }}>
      <Link className="mono muted" href="/app" style={{ fontSize: "0.8rem" }}>
        ← Back to forecast
      </Link>
      <h1 className="display" style={{ fontSize: "2.4rem", margin: "0.75rem 0 1rem" }}>
        Edit goal
      </h1>
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
            <input value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
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

        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input
            type="checkbox"
            checked={useBaseline}
            onChange={(e) => setUseBaseline(e.target.checked)}
            style={{ width: "auto" }}
          />
          Manual baseline race
        </label>

        {useBaseline && (
          <div className="form-grid two">
            <label>
              Baseline distance
              <select
                value={baselineDistance}
                onChange={(e) => setBaselineDistance(e.target.value)}
              >
                {DISTANCE_LIST.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Baseline time
              <input value={baselineTime} onChange={(e) => setBaselineTime(e.target.value)} />
            </label>
            <label>
              Baseline date
              <input
                type="date"
                value={baselineDate}
                onChange={(e) => setBaselineDate(e.target.value)}
              />
            </label>
          </div>
        )}

        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
