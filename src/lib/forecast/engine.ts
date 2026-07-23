import { DISTANCES, type DistanceKey, nearestDistanceKey } from "./distances";
import { riegelEquivalentTime } from "./riegel";
import {
  POSTURE_LABELS,
  POSTURE_MONTHLY_GAP_CLOSE,
  type Intensity,
} from "./postures";

export type EffortInput = {
  id: string;
  name?: string | null;
  startDate: Date;
  distanceM: number;
  movingTimeSec: number;
  isRace: boolean;
};

export type ManualBaseline = {
  distanceKey: DistanceKey;
  distanceM: number;
  timeSec: number;
  date: string;
};

export type ForecastInput = {
  goalDistanceKey: DistanceKey;
  goalDistanceM: number;
  targetTimeSec: number;
  raceDate: Date;
  intensity: Intensity;
  efforts: EffortInput[];
  weeklyMiles: { weekStart: string; miles: number }[];
  manualBaseline?: ManualBaseline | null;
  asOf?: Date;
};

export type Verdict = "on_track" | "at_risk" | "unlikely";

export type ScenarioResult = {
  intensity: Intensity;
  label: string;
  predictedTimeSec: number;
  verdict: Verdict;
  gapCloseRate: number;
};

export type ForecastResult = {
  verdict: Verdict;
  predictedTimeSec: number;
  targetTimeSec: number;
  currentEquivalentSec: number;
  confidence: "high" | "medium" | "low";
  monthsToRace: number;
  volumeFactor: number;
  effortsUsed: {
    id: string;
    label: string;
    date: string;
    distanceKey: DistanceKey | "manual";
    timeSec: number;
    equivalentSec: number;
  }[];
  why: string[];
  scenarios: ScenarioResult[];
  history: {
    recentWeeklyMiles: number;
    weeksWithRuns: number;
  };
  needsBaseline: boolean;
  missing: string[];
};

function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4375));
}

function verdictFromPrediction(predicted: number, target: number): Verdict {
  const ratio = predicted / target;
  if (ratio <= 1.02) return "on_track";
  if (ratio <= 1.05) return "at_risk";
  return "unlikely";
}

function volumeFactor(weeklyMiles: { miles: number }[]): number {
  if (weeklyMiles.length === 0) return 0.7;
  const recent = weeklyMiles.slice(-8);
  const avg = recent.reduce((s, w) => s + w.miles, 0) / recent.length;
  const activeWeeks = recent.filter((w) => w.miles >= 10).length;
  const consistency = activeWeeks / recent.length;
  // ~20–50 mpw sweet spot; scale 0.75–1.15
  const volumeScore = Math.min(1.1, Math.max(0.75, avg / 35));
  return Math.min(1.15, Math.max(0.7, volumeScore * (0.7 + 0.3 * consistency)));
}

function collectEfforts(
  efforts: EffortInput[],
  goalDistanceM: number,
  asOf: Date,
  manualBaseline?: ManualBaseline | null,
) {
  const windowStart = new Date(asOf);
  windowStart.setDate(windowStart.getDate() - 90);

  const scored: {
    id: string;
    label: string;
    date: string;
    distanceKey: DistanceKey | "manual";
    timeSec: number;
    equivalentSec: number;
    startDate: Date;
  }[] = [];

  if (manualBaseline) {
    const d = DISTANCES[manualBaseline.distanceKey];
    scored.push({
      id: "manual-baseline",
      label: `Manual ${d.label}`,
      date: manualBaseline.date,
      distanceKey: "manual",
      timeSec: manualBaseline.timeSec,
      equivalentSec: riegelEquivalentTime(
        manualBaseline.timeSec,
        manualBaseline.distanceM,
        goalDistanceM,
      ),
      startDate: new Date(manualBaseline.date),
    });
  }

  for (const e of efforts) {
    const key = nearestDistanceKey(e.distanceM);
    if (!key && !e.isRace) continue;
    const fromM = key ? DISTANCES[key].meters : e.distanceM;
    if (e.distanceM < 3000) continue;
    const equivalentSec = riegelEquivalentTime(
      e.movingTimeSec,
      fromM,
      goalDistanceM,
    );
    scored.push({
      id: e.id,
      label: e.name || (key ? DISTANCES[key].label : "Effort"),
      date: e.startDate.toISOString().slice(0, 10),
      distanceKey: key ?? "5k",
      timeSec: e.movingTimeSec,
      equivalentSec,
      startDate: e.startDate,
    });
  }

  const recent = scored.filter((s) => s.startDate >= windowStart);
  const pool = recent.length >= 1 ? recent : scored;
  pool.sort((a, b) => a.equivalentSec - b.equivalentSec);
  return pool.slice(0, 3);
}

export function hasMinimumHistory(
  efforts: EffortInput[],
  weeklyMiles: { miles: number }[],
  manualBaseline?: ManualBaseline | null,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const weeks = weeklyMiles.filter((w) => w.miles > 0).length;
  const quality =
    efforts.filter((e) => e.isRace || nearestDistanceKey(e.distanceM)).length +
    (manualBaseline ? 1 : 0);

  if (weeks < 8 && !manualBaseline) {
    missing.push("At least 8 weeks of running history (or a manual baseline race)");
  }
  if (quality < 1) {
    missing.push("At least one quality effort near 5K–marathon, or a manual baseline");
  }
  return { ok: missing.length === 0, missing };
}

function projectTime(
  currentEquivalentSec: number,
  targetTimeSec: number,
  monthsToRace: number,
  intensity: Intensity,
  vol: number,
): number {
  const gapClose =
    POSTURE_MONTHLY_GAP_CLOSE[intensity] * vol * Math.min(monthsToRace, 24);
  const gap = currentEquivalentSec - targetTimeSec;
  if (gap <= 0) {
    // Already fitter than goal — slight fade risk if far out
    return Math.max(targetTimeSec * 0.98, currentEquivalentSec * (1 - 0.01 * monthsToRace));
  }
  const closed = gap * (1 - Math.exp(-gapClose));
  return currentEquivalentSec - closed;
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const asOf = input.asOf ?? new Date();
  const gate = hasMinimumHistory(
    input.efforts,
    input.weeklyMiles,
    input.manualBaseline,
  );

  if (!gate.ok) {
    return {
      verdict: "unlikely",
      predictedTimeSec: input.targetTimeSec,
      targetTimeSec: input.targetTimeSec,
      currentEquivalentSec: input.targetTimeSec,
      confidence: "low",
      monthsToRace: monthsBetween(asOf, input.raceDate),
      volumeFactor: volumeFactor(input.weeklyMiles),
      effortsUsed: [],
      why: ["Not enough history to forecast yet."],
      scenarios: [],
      history: {
        recentWeeklyMiles: avgRecentMiles(input.weeklyMiles),
        weeksWithRuns: input.weeklyMiles.filter((w) => w.miles > 0).length,
      },
      needsBaseline: true,
      missing: gate.missing,
    };
  }

  const used = collectEfforts(
    input.efforts,
    input.goalDistanceM,
    asOf,
    input.manualBaseline,
  );
  const currentEquivalentSec = used[0]?.equivalentSec ?? input.targetTimeSec;
  const vol = volumeFactor(input.weeklyMiles);
  const monthsToRace = monthsBetween(asOf, input.raceDate);
  const intensities: Intensity[] = ["conservative", "balanced", "aggressive"];

  const scenarios: ScenarioResult[] = intensities.map((intensity) => {
    const predictedTimeSec = projectTime(
      currentEquivalentSec,
      input.targetTimeSec,
      monthsToRace,
      intensity,
      vol,
    );
    return {
      intensity,
      label: POSTURE_LABELS[intensity],
      predictedTimeSec,
      verdict: verdictFromPrediction(predictedTimeSec, input.targetTimeSec),
      gapCloseRate: POSTURE_MONTHLY_GAP_CLOSE[intensity] * vol,
    };
  });

  const primary =
    scenarios.find((s) => s.intensity === input.intensity) ?? scenarios[1];

  const confidence: ForecastResult["confidence"] =
    used.length >= 2 && vol >= 0.9 ? "high" : used.length >= 1 ? "medium" : "low";

  const why = [
    `Fitness from ${used[0]?.label ?? "baseline"} (${used[0]?.date}) → ~${formatRough(
      currentEquivalentSec,
    )} at goal distance.`,
    `Volume factor ${vol.toFixed(2)} from recent weekly mileage/consistency.`,
    `${POSTURE_LABELS[input.intensity]} posture closes ~${(
      POSTURE_MONTHLY_GAP_CLOSE[input.intensity] * 100
    ).toFixed(0)}% of the gap per month (adjusted by volume).`,
    `${monthsToRace.toFixed(1)} months until race day.`,
  ];

  return {
    verdict: primary.verdict,
    predictedTimeSec: primary.predictedTimeSec,
    targetTimeSec: input.targetTimeSec,
    currentEquivalentSec,
    confidence,
    monthsToRace,
    volumeFactor: vol,
    effortsUsed: used.map((item) => ({
      id: item.id,
      label: item.label,
      date: item.date,
      distanceKey: item.distanceKey,
      timeSec: item.timeSec,
      equivalentSec: item.equivalentSec,
    })),
    why,
    scenarios,
    history: {
      recentWeeklyMiles: avgRecentMiles(input.weeklyMiles),
      weeksWithRuns: input.weeklyMiles.filter((w) => w.miles > 0).length,
    },
    needsBaseline: false,
    missing: [],
  };
}

function avgRecentMiles(weeklyMiles: { miles: number }[]): number {
  const recent = weeklyMiles.slice(-4);
  if (!recent.length) return 0;
  return recent.reduce((s, w) => s + w.miles, 0) / recent.length;
}

function formatRough(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
