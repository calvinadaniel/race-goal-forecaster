import { DISTANCES, type DistanceKey, nearestDistanceKey } from "./distances";
import { riegelEquivalentTime } from "./riegel";
import {
  POSTURE_LABELS,
  POSTURE_MONTHLY_GAP_CLOSE,
  type Intensity,
} from "./postures";
import { buildTrainingPlan, type TrainingPlan } from "./training-plan";

export type EffortInput = {
  id: string;
  name?: string | null;
  startDate: Date;
  distanceM: number;
  movingTimeSec: number;
  isRace: boolean;
  /** Strava workout_type: 1=race, 2=long, 3=workout; null/0 = default easy run. */
  workoutType?: number | null;
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
  planStartMonday?: Date | null;
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
  /** Dual fitness: goal-distance PR vs last-90-day form, blended for projection. */
  fitness: FitnessBreakdown;
  effortsUsed: {
    id: string;
    label: string;
    date: string;
    distanceKey: DistanceKey | "manual";
    timeSec: number;
    equivalentSec: number;
  }[];
  why: string[];
  tips: string[];
  trainingPlan: TrainingPlan | null;
  kpis: {
    gapSec: number;
    gapPct: number;
    fitnessRatio: number;
    volumeScore: number;
  };
  scenarios: ScenarioResult[];
  history: {
    recentWeeklyMiles: number;
    weeksWithRuns: number;
  };
  needsBaseline: boolean;
  missing: string[];
};

export type FitnessSignal = {
  id: string;
  label: string;
  date: string;
  distanceKey: DistanceKey | "manual";
  timeSec: number;
  equivalentSec: number;
  ageDays: number;
  isGoalDistance: boolean;
};

export type FitnessDivergence =
  | "aligned"
  | "form_behind"
  | "form_ahead"
  | "pr_only"
  | "form_only";

export type FitnessBreakdown = {
  pr: FitnessSignal | null;
  recentForm: FitnessSignal | null;
  /** Weight on PR in the blend (0–1). */
  prWeight: number;
  blendedSec: number;
  formGapSec: number | null;
  divergence: FitnessDivergence;
};

const RECENT_FORM_DAYS = 90;
const FITNESS_YEAR_DAYS = 365;

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

/** Fitness uses races + marked workouts only; easy/default runs feed volume, not Riegel. */
export function isFitnessQualityEffort(e: {
  isRace: boolean;
  workoutType?: number | null;
}): boolean {
  if (e.isRace) return true;
  // Strava: 3 = Workout (tempo/intervals/etc.). Long runs (2) stay volume-only.
  return e.workoutType === 3;
}

function isGoalDistanceEffort(distanceM: number, goalDistanceM: number): boolean {
  return Math.abs(distanceM - goalDistanceM) / goalDistanceM <= 0.04;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

type ScoredEffort = {
  id: string;
  label: string;
  date: string;
  distanceKey: DistanceKey | "manual";
  timeSec: number;
  equivalentSec: number;
  startDate: Date;
  isGoalDistance: boolean;
  isManual: boolean;
};

function toFitnessSignal(e: ScoredEffort, asOf: Date): FitnessSignal {
  return {
    id: e.id,
    label: e.label,
    date: e.date,
    distanceKey: e.distanceKey,
    timeSec: e.timeSec,
    equivalentSec: e.equivalentSec,
    ageDays: Math.round(daysBetween(e.startDate, asOf)),
    isGoalDistance: e.isGoalDistance,
  };
}

function scoreEfforts(
  efforts: EffortInput[],
  goalDistanceM: number,
  manualBaseline?: ManualBaseline | null,
): ScoredEffort[] {
  const scored: ScoredEffort[] = [];

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
      isGoalDistance: isGoalDistanceEffort(
        manualBaseline.distanceM,
        goalDistanceM,
      ),
      isManual: true,
    });
  }

  for (const e of efforts) {
    if (!isFitnessQualityEffort(e)) continue;
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
      isGoalDistance: isGoalDistanceEffort(e.distanceM, goalDistanceM),
      isManual: false,
    });
  }

  return scored;
}

/**
 * Dual fitness:
 * - PR = best goal-distance effort (any age) / goal-distance manual baseline
 * - Recent form = best equivalent in last 90 days (12-month pool still informs display)
 * Blend favors goal-distance PR over short-race proxies; trusts recent goal-distance
 * races more when the PR is stale.
 */
export function assessFitness(
  efforts: EffortInput[],
  goalDistanceM: number,
  asOf: Date,
  vol: number,
  manualBaseline?: ManualBaseline | null,
): {
  fitness: FitnessBreakdown;
  effortsUsed: ScoredEffort[];
} {
  const scored = scoreEfforts(efforts, goalDistanceM, manualBaseline);
  const yearStart = new Date(asOf);
  yearStart.setFullYear(yearStart.getFullYear() - 1);
  const recentStart = new Date(asOf);
  recentStart.setDate(recentStart.getDate() - RECENT_FORM_DAYS);

  const prEffort = scored
    .filter((s) => s.isGoalDistance)
    .sort((a, b) => a.timeSec - b.timeSec)[0];

  const recentEffort = scored
    .filter((s) => s.startDate >= recentStart)
    .sort((a, b) => a.equivalentSec - b.equivalentSec)[0];

  // If nothing in 90d and no goal-distance PR, fall back to best effort in 12 months.
  const yearBest =
    !prEffort && !recentEffort
      ? scored
          .filter((s) => s.startDate >= yearStart || s.isManual)
          .sort((a, b) => a.equivalentSec - b.equivalentSec)[0]
      : undefined;

  const fitness = blendFitnessSignals(
    prEffort ?? null,
    recentEffort ?? yearBest ?? null,
    asOf,
    vol,
  );

  const byId = new Map<string, ScoredEffort>();
  for (const s of scored.filter((x) => x.startDate >= yearStart)) {
    byId.set(s.id, s);
  }
  if (prEffort) byId.set(prEffort.id, prEffort);
  if (recentEffort) byId.set(recentEffort.id, recentEffort);
  for (const s of scored) {
    if (s.isManual) byId.set(s.id, s);
  }
  const effortsUsed = [...byId.values()]
    .sort((a, b) => a.equivalentSec - b.equivalentSec)
    .slice(0, 3);

  return { fitness, effortsUsed };
}

function blendFitnessSignals(
  prEffort: ScoredEffort | null,
  recentEffort: ScoredEffort | null,
  asOf: Date,
  vol: number,
): FitnessBreakdown {
  const pr = prEffort ? toFitnessSignal(prEffort, asOf) : null;
  const recentForm = recentEffort ? toFitnessSignal(recentEffort, asOf) : null;

  if (!pr && !recentForm) {
    return {
      pr: null,
      recentForm: null,
      prWeight: 0,
      blendedSec: 0,
      formGapSec: null,
      divergence: "form_only",
    };
  }

  if (!pr && recentForm) {
    return {
      pr: null,
      recentForm,
      prWeight: 0,
      blendedSec: recentForm.equivalentSec,
      formGapSec: null,
      divergence: "form_only",
    };
  }

  if (pr && !recentForm) {
    return {
      pr,
      recentForm: null,
      prWeight: 1,
      blendedSec: pr.equivalentSec,
      formGapSec: null,
      divergence: "pr_only",
    };
  }

  // Both present (narrowed by guards above)
  const prSec = pr!.equivalentSec;
  const formSec = recentForm!.equivalentSec;
  const formGapSec = formSec - prSec;
  const prFreshness = clamp(1 - pr!.ageDays / FITNESS_YEAR_DAYS, 0.2, 1);

  if (formSec <= prSec * 1.02) {
    const usePr = prSec <= formSec;
    return {
      pr,
      recentForm,
      prWeight: usePr ? 1 : 0,
      blendedSec: Math.min(prSec, formSec),
      formGapSec,
      divergence: formSec < prSec * 0.98 ? "form_ahead" : "aligned",
    };
  }

  // Form behind PR: short-race proxies keep PR primary; recent goal-distance races pull harder when PR is old.
  let prWeight = recentForm!.isGoalDistance
    ? prFreshness * 0.45
    : 0.65 + 0.3 * prFreshness;

  if (vol < 0.85 && pr!.ageDays > 120) {
    prWeight *= 0.85;
  }
  prWeight = clamp(prWeight, 0.15, 0.95);

  const blendedSec = prWeight * prSec + (1 - prWeight) * formSec;
  return {
    pr,
    recentForm,
    prWeight,
    blendedSec,
    formGapSec,
    divergence: "form_behind",
  };
}

export function hasMinimumHistory(
  efforts: EffortInput[],
  weeklyMiles: { miles: number }[],
  manualBaseline?: ManualBaseline | null,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const weeks = weeklyMiles.filter((w) => w.miles > 0).length;
  const quality =
    efforts.filter((e) => isFitnessQualityEffort(e)).length +
    (manualBaseline ? 1 : 0);

  if (weeks < 8 && !manualBaseline) {
    missing.push("At least 8 weeks of running history (or a manual baseline race)");
  }
  if (quality < 1) {
    missing.push(
      "At least one race or marked workout (or a manual baseline) — easy runs count for volume only",
    );
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
    const vol = volumeFactor(input.weeklyMiles);
    const monthsToRace = monthsBetween(asOf, input.raceDate);
    return {
      verdict: "unlikely",
      predictedTimeSec: input.targetTimeSec,
      targetTimeSec: input.targetTimeSec,
      currentEquivalentSec: input.targetTimeSec,
      confidence: "low",
      monthsToRace,
      volumeFactor: vol,
      fitness: {
        pr: null,
        recentForm: null,
        prWeight: 0,
        blendedSec: input.targetTimeSec,
        formGapSec: null,
        divergence: "form_only",
      },
      effortsUsed: [],
      why: ["Not enough history to forecast yet."],
      tips: [
        "Sync more Strava history or add a recent race/time-trial baseline on the goal screen.",
      ],
      trainingPlan: null,
      kpis: buildKpis(input.targetTimeSec, input.targetTimeSec, input.targetTimeSec, vol),
      scenarios: [],
      history: {
        recentWeeklyMiles: avgRecentMiles(input.weeklyMiles),
        weeksWithRuns: input.weeklyMiles.filter((w) => w.miles > 0).length,
      },
      needsBaseline: true,
      missing: gate.missing,
    };
  }

  const vol = volumeFactor(input.weeklyMiles);
  const { fitness, effortsUsed: used } = assessFitness(
    input.efforts,
    input.goalDistanceM,
    asOf,
    vol,
    input.manualBaseline,
  );
  const currentEquivalentSec =
    fitness.blendedSec > 0 ? fitness.blendedSec : input.targetTimeSec;
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

  const why = buildFitnessWhy(fitness, currentEquivalentSec, input.intensity, vol, monthsToRace);

  const recentWeeklyMiles = avgRecentMiles(input.weeklyMiles);
  const tips = buildTips({
    verdict: primary.verdict,
    intensity: input.intensity,
    predictedTimeSec: primary.predictedTimeSec,
    targetTimeSec: input.targetTimeSec,
    currentEquivalentSec,
    monthsToRace,
    volumeFactor: vol,
    recentWeeklyMiles,
    scenarios,
    fitness,
  });

  return {
    verdict: primary.verdict,
    predictedTimeSec: primary.predictedTimeSec,
    targetTimeSec: input.targetTimeSec,
    currentEquivalentSec,
    confidence,
    monthsToRace,
    volumeFactor: vol,
    fitness,
    effortsUsed: used.map((item) => ({
      id: item.id,
      label: item.label,
      date: item.date,
      distanceKey: item.distanceKey,
      timeSec: item.timeSec,
      equivalentSec: item.equivalentSec,
    })),
    why,
    tips,
    trainingPlan: buildTrainingPlan({
      distanceKey: input.goalDistanceKey,
      distanceM: input.goalDistanceM,
      targetTimeSec: input.targetTimeSec,
      intensity: input.intensity,
      verdict: primary.verdict,
      monthsToRace,
      recentWeeklyMiles,
      raceDate: input.raceDate,
      asOf,
      planStartMonday: input.planStartMonday ?? null,
    }),
    kpis: buildKpis(
      primary.predictedTimeSec,
      input.targetTimeSec,
      currentEquivalentSec,
      vol,
    ),
    scenarios,
    history: {
      recentWeeklyMiles,
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

function buildKpis(
  predictedTimeSec: number,
  targetTimeSec: number,
  currentEquivalentSec: number,
  volumeFactor: number,
) {
  const gapSec = predictedTimeSec - targetTimeSec;
  return {
    gapSec,
    gapPct: targetTimeSec > 0 ? gapSec / targetTimeSec : 0,
    fitnessRatio: targetTimeSec > 0 ? currentEquivalentSec / targetTimeSec : 1,
    volumeScore: volumeFactor,
  };
}

function buildFitnessWhy(
  fitness: FitnessBreakdown,
  blendedSec: number,
  intensity: Intensity,
  vol: number,
  monthsToRace: number,
): string[] {
  const why: string[] = [];

  if (fitness.pr) {
    why.push(
      `Goal-distance PR: ${fitness.pr.label} (${fitness.pr.date}) → ~${formatRough(fitness.pr.equivalentSec)}.`,
    );
  }
  if (fitness.recentForm) {
    why.push(
      `Recent form (90d races/workouts): ${fitness.recentForm.label} (${fitness.recentForm.date}) → ~${formatRough(fitness.recentForm.equivalentSec)}.`,
    );
  }

  if (fitness.divergence === "form_behind" && fitness.pr && fitness.recentForm) {
    why.push(
      `Blended fitness ~${formatRough(blendedSec)} (${Math.round(fitness.prWeight * 100)}% PR / ${Math.round((1 - fitness.prWeight) * 100)}% recent) — recent form trails the PR.`,
    );
  } else if (fitness.divergence === "form_ahead") {
    why.push(
      `Blended fitness ~${formatRough(blendedSec)} — recent form is ahead of the PR.`,
    );
  } else {
    why.push(`Blended fitness used for projection: ~${formatRough(blendedSec)} at goal distance.`);
  }

  why.push(
    `Volume factor ${vol.toFixed(2)} from recent weekly mileage/consistency.`,
  );
  why.push(
    `${POSTURE_LABELS[intensity]} posture closes ~${(
      POSTURE_MONTHLY_GAP_CLOSE[intensity] * 100
    ).toFixed(0)}% of the gap per month (adjusted by volume).`,
  );
  why.push(`${monthsToRace.toFixed(1)} months until race day.`);
  return why;
}

function buildTips(args: {
  verdict: Verdict;
  intensity: Intensity;
  predictedTimeSec: number;
  targetTimeSec: number;
  currentEquivalentSec: number;
  monthsToRace: number;
  volumeFactor: number;
  recentWeeklyMiles: number;
  scenarios: ScenarioResult[];
  fitness?: FitnessBreakdown;
}): string[] {
  const tips: string[] = [];
  const gapSec = args.predictedTimeSec - args.targetTimeSec;
  const fitnessGap = args.currentEquivalentSec - args.targetTimeSec;

  if (
    args.fitness?.divergence === "form_behind" &&
    args.fitness.formGapSec &&
    args.fitness.formGapSec > 5 * 60
  ) {
    tips.push(
      `Recent form sits ~${formatRough(args.fitness.formGapSec)} behind your goal-distance PR — a tune-up race or race-pace long run would re-anchor the forecast.`,
    );
  }

  if (args.verdict === "on_track") {
    tips.push(
      "Hold weekly volume steady and keep one quality session (tempo or long run) so fitness doesn’t fade before race day.",
    );
    if (args.monthsToRace > 3) {
      tips.push(
        "With months left, schedule a tune-up race or time trial at ~half goal distance to re-check the forecast.",
      );
    }
  } else {
    if (gapSec > 0) {
      tips.push(
        `Projected finish is ~${formatRough(gapSec)} slower than goal — close that gap with quality work, not junk miles.`,
      );
    }
    if (fitnessGap > 0) {
      tips.push(
        `Current race-distance fitness sits ~${formatRough(fitnessGap)} off goal. Add a weekly tempo or interval session near goal pace.`,
      );
    }
    if (args.volumeFactor < 0.9) {
      const targetMiles = Math.max(30, Math.round(args.recentWeeklyMiles * 1.15) || 30);
      tips.push(
        `Volume/consistency is soft (factor ${args.volumeFactor.toFixed(2)}). Nudge toward ~${targetMiles}+ mi/week with ≥3 run days.`,
      );
    }
    const harder = args.scenarios.find(
      (s) =>
        s.intensity !== args.intensity &&
        (s.verdict === "on_track" || s.verdict === "at_risk") &&
        s.predictedTimeSec < args.predictedTimeSec,
    );
    if (harder && args.intensity !== "aggressive") {
      tips.push(
        `${harder.label} posture projects ${formatRough(harder.predictedTimeSec)} (${VERDICT_WORD[harder.verdict]}). Only step up intensity if recovery stays solid.`,
      );
    }
    if (args.monthsToRace < 2 && args.verdict === "unlikely") {
      tips.push(
        "Under ~2 months left: prioritize race-pace reps and a honest long run; or ease the target time if the goal is still a stretch.",
      );
    }
  }

  // ponytail: rule tips only — LLM plans if users want personalized coaching later
  return tips.slice(0, 4);
}

const VERDICT_WORD: Record<Verdict, string> = {
  on_track: "on track",
  at_risk: "at risk",
  unlikely: "unlikely",
};

function formatRough(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
