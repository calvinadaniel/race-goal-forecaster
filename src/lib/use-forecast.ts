"use client";

import { useCallback, useEffect, useState } from "react";
import type { Units } from "@/lib/units";

export type ForecastPayload = {
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
      startDate?: string;
      endDate?: string;
      days: { day: string; date?: string; focus: string; title: string; detail: string }[];
      weeks?: {
        weekIndex: number;
        weekStart: string;
        phase: string;
        weeklyMiles: number;
        days: { day: string; date?: string; focus: string; title: string; detail: string }[];
      }[];
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
  profile: {
    year: number;
    name: string | null;
    image: string | null;
    hasPhoto?: boolean;
    ytdMiles: number;
    avgPaceSecPerMi: number | null;
    racesCompleted: number;
    activityCount: number;
  };
};

export const VERDICT_LABEL = {
  on_track: "On track",
  at_risk: "At risk",
  unlikely: "Unlikely",
} as const;

export function useForecastData() {
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

  return { data, units, error, busy, load, refresh };
}
