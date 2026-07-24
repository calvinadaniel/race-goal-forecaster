import { DISTANCES, type DistanceKey } from "./distances";
import { POSTURE_LABELS, type Intensity } from "./postures";

type Verdict = "on_track" | "at_risk" | "unlikely";

export type PlanDay = {
  day: string;
  focus: "easy" | "quality" | "long" | "rest" | "optional";
  title: string;
  detail: string;
};

export type TrainingPlan = {
  phase: "Base" | "Build" | "Peak" | "Taper";
  weeklyMiles: number;
  runsPerWeek: number;
  goalPacePerMi: string;
  weeksOut: number;
  days: PlanDay[];
  notes: string[];
};

const VOLUME_FLOOR: Record<DistanceKey, number> = {
  "5k": 20,
  "10k": 25,
  half: 30,
  marathon: 35,
};

const VOLUME_CAP: Record<DistanceKey, number> = {
  "5k": 40,
  "10k": 45,
  half: 50,
  marathon: 60,
};

const INTENSITY_BUMP: Record<Intensity, number> = {
  conservative: 1.0,
  balanced: 1.08,
  aggressive: 1.15,
};

function phaseForMonths(months: number): TrainingPlan["phase"] {
  if (months >= 4) return "Base";
  if (months >= 2) return "Build";
  if (months >= 0.75) return "Peak";
  return "Taper";
}

function pacePerMile(targetTimeSec: number, distanceM: number): string {
  const miles = distanceM / 1609.34;
  if (miles <= 0) return "—";
  const sec = targetTimeSec / miles;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}/mi`;
}

function weeklyTarget(
  distanceKey: DistanceKey,
  recentWeeklyMiles: number,
  intensity: Intensity,
  verdict: Verdict,
): number {
  const floor = VOLUME_FLOOR[distanceKey];
  const cap = VOLUME_CAP[distanceKey];
  const bump =
    INTENSITY_BUMP[intensity] * (verdict === "on_track" ? 1 : verdict === "at_risk" ? 1.05 : 1.1);
  const raw = Math.max(floor, (recentWeeklyMiles || floor) * bump);
  return Math.round(Math.min(cap, raw));
}

/** One-week template scaled to posture + race phase. Not coaching — a starting skeleton. */
export function buildTrainingPlan(args: {
  distanceKey: DistanceKey;
  distanceM: number;
  targetTimeSec: number;
  intensity: Intensity;
  verdict: Verdict;
  monthsToRace: number;
  recentWeeklyMiles: number;
}): TrainingPlan {
  const phase = phaseForMonths(args.monthsToRace);
  const weeksOut = Math.max(1, Math.round(args.monthsToRace * 4.345));
  const weeklyMiles = weeklyTarget(
    args.distanceKey,
    args.recentWeeklyMiles,
    args.intensity,
    args.verdict,
  );
  const pace = pacePerMile(args.targetTimeSec, args.distanceM);
  const dist = DISTANCES[args.distanceKey].label;

  const longShare =
    args.distanceKey === "marathon" ? 0.3 : args.distanceKey === "half" ? 0.28 : 0.25;
  const longMi = Math.round(weeklyMiles * longShare);
  const qualityMi =
    args.intensity === "conservative"
      ? Math.max(3, Math.round(weeklyMiles * 0.15))
      : Math.max(4, Math.round(weeklyMiles * 0.2));

  const runsPerWeek =
    args.intensity === "conservative" ? 4 : args.intensity === "balanced" ? 5 : 6;

  const qualityTitle =
    phase === "Taper"
      ? "Short race-pace touch"
      : phase === "Base"
        ? "Steady tempo"
        : "Goal-pace intervals";

  const qualityDetail =
    phase === "Taper"
      ? `20–30 min easy + 2–3 × 3 min @ ~${pace}, full recoveries.`
      : phase === "Base"
        ? `${qualityMi} mi continuous @ comfortably hard (slower than ${pace}).`
        : args.distanceKey === "marathon" || args.distanceKey === "half"
          ? `${qualityMi} mi with 3–5 × 1 mi @ ~${pace}, jog recoveries.`
          : `${qualityMi} mi with 6–10 × 400–800m @ faster than ${pace}, jog recoveries.`;

  const longDetail =
    phase === "Taper"
      ? `${Math.max(4, Math.round(longMi * 0.6))} mi easy — keep it conversational.`
      : `${longMi} mi easy; last ${Math.min(3, Math.round(longMi * 0.2))} mi near ${pace} if feeling good.`;

  const easyFill = Math.max(
    3,
    Math.round((weeklyMiles - longMi - qualityMi) / Math.max(1, runsPerWeek - 2)),
  );

  const days: PlanDay[] =
    runsPerWeek >= 6
      ? [
          { day: "Mon", focus: "easy", title: "Easy", detail: `${easyFill} mi easy.` },
          { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
          { day: "Wed", focus: "easy", title: "Easy", detail: `${easyFill} mi easy.` },
          { day: "Thu", focus: "optional", title: "Optional easy / strides", detail: `${Math.max(3, easyFill - 1)} mi easy + 4 strides.` },
          { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest or 20–30 min walk." },
          { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
          { day: "Sun", focus: "easy", title: "Easy shakeout", detail: `${Math.max(3, easyFill - 1)} mi easy.` },
        ]
      : runsPerWeek === 5
        ? [
            { day: "Mon", focus: "rest", title: "Rest", detail: "Full rest or easy walk." },
            { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
            { day: "Wed", focus: "easy", title: "Easy", detail: `${easyFill} mi easy.` },
            { day: "Thu", focus: "easy", title: "Easy + strides", detail: `${easyFill} mi easy + 4 strides.` },
            { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
            { day: "Sun", focus: "easy", title: "Easy", detail: `${Math.max(3, easyFill - 1)} mi easy.` },
          ]
        : [
            { day: "Mon", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
            { day: "Wed", focus: "rest", title: "Rest", detail: "Rest or cross-train easy." },
            { day: "Thu", focus: "easy", title: "Easy", detail: `${easyFill + 1} mi easy.` },
            { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
            { day: "Sun", focus: "easy", title: "Easy", detail: `${easyFill} mi easy.` },
          ];

  const notes = [
    `~${weeklyMiles} mi/week target for a ${dist} under ${POSTURE_LABELS[args.intensity].toLowerCase()} load (${phase}, ~${weeksOut} weeks out).`,
    `Goal pace ≈ ${pace}. Easy days should feel conversational — leave quality for the marked session.`,
    "Cut volume 20–30% if sore, sick, or sleep-deprived. This is a template, not personalized coaching.",
  ];

  if (phase === "Taper") {
    notes.unshift("Taper week: protect freshness over mileage.");
  }

  return {
    phase,
    weeklyMiles,
    runsPerWeek,
    goalPacePerMi: pace,
    weeksOut,
    days,
    notes,
  };
}
