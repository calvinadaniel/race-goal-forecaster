import { DISTANCES, type DistanceKey } from "./distances";
import { POSTURE_LABELS, type Intensity } from "./postures";

type Verdict = "on_track" | "at_risk" | "unlikely";
type Phase = "Base" | "Build" | "Peak" | "Taper";

export type PlanDay = {
  day: string;
  date?: string;
  focus: "easy" | "quality" | "long" | "rest" | "optional" | "race";
  title: string;
  detail: string;
};

export type PlanWeek = {
  weekIndex: number;
  weekStart: string;
  phase: Phase;
  weeklyMiles: number;
  days: PlanDay[];
};

export type TrainingPlan = {
  phase: Phase;
  weeklyMiles: number;
  runsPerWeek: number;
  goalPacePerMi: string;
  weeksOut: number;
  startDate: string;
  endDate: string;
  /** Current week — Forecast "this week's suggestion" */
  days: PlanDay[];
  weeks: PlanWeek[];
  notes: string[];
  planStatus: "draft" | "started";
  planStartMonday: string | null;
  /** 1-based index into `weeks` for the week containing asOf */
  currentWeekIndex: number;
};

const VOLUME_FLOOR: Record<DistanceKey, number> = {
  "5k": 20,
  "10k": 25,
  half: 32,
  marathon: 42,
};

const VOLUME_CAP: Record<DistanceKey, number> = {
  "5k": 40,
  "10k": 45,
  half: 50,
  marathon: 60,
};

/** Peak long-run targets runners expect by distance (pre-taper). */
const LONG_PEAK: Record<DistanceKey, number> = {
  "5k": 10,
  "10k": 12,
  half: 14,
  marathon: 20,
};

const INTENSITY_BUMP: Record<Intensity, number> = {
  conservative: 1.0,
  balanced: 1.08,
  aggressive: 1.15,
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOnOrBefore(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return addDays(x, -diff);
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
}

function phaseForMonths(months: number): Phase {
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

function peakWeeklyMiles(
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
  // Weekly peak must be able to host the distance's peak long (~38–42% of week)
  const longSupport = Math.ceil(LONG_PEAK[distanceKey] / 0.4);
  return Math.round(Math.min(cap, Math.max(raw, longSupport)));
}

function runsPerWeekFor(intensity: Intensity): number {
  return intensity === "conservative" ? 4 : intensity === "balanced" ? 5 : 6;
}

/** Absolute long-run progression toward distance peak — not only % of weekly volume. */
function longRunMiles(args: {
  distanceKey: DistanceKey;
  weeklyMiles: number;
  phase: Phase;
  weekIndex: number;
  totalWeeks: number;
}): number {
  const peakLong = LONG_PEAK[args.distanceKey];
  const taperWeeks = Math.min(3, Math.max(1, Math.round(args.totalWeeks * 0.15)));
  const buildWeeks = Math.max(1, args.totalWeeks - taperWeeks);

  if (args.phase === "Taper" || args.weekIndex >= buildWeeks) {
    const step = Math.max(0, args.weekIndex - buildWeeks);
    const factors = [0.6, 0.45, 0.35];
    return Math.max(6, Math.round(peakLong * (factors[step] ?? 0.35)));
  }

  const startLong = Math.min(
    Math.round(peakLong * 0.45),
    Math.max(args.distanceKey === "marathon" ? 8 : 5, Math.round(args.weeklyMiles * 0.22)),
  );
  const buildProgress = buildWeeks === 1 ? 1 : args.weekIndex / (buildWeeks - 1);
  const target = Math.round(startLong + (peakLong - startLong) * buildProgress);
  // Cap at 42% of the week so other runs still fit; weekly peak is sized to allow peak long
  const weekCap = Math.max(startLong, Math.round(args.weeklyMiles * 0.42));
  const deload = args.weekIndex > 0 && (args.weekIndex + 1) % 4 === 0 && args.weekIndex < buildWeeks - 1;
  const miles = Math.min(peakLong, target, weekCap);
  return Math.round(deload ? miles * 0.85 : miles);
}

function weekMilesForPhase(
  weekIndex: number,
  totalWeeks: number,
  startMiles: number,
  peakMiles: number,
): number {
  if (totalWeeks <= 1) return Math.round((startMiles + peakMiles) / 2);

  // Last ~15% of plan (min 1, max 3 weeks) tapers down toward race
  const taperWeeks = Math.min(3, Math.max(1, Math.round(totalWeeks * 0.15)));
  const buildWeeks = Math.max(1, totalWeeks - taperWeeks);

  if (weekIndex >= buildWeeks) {
    const step = weekIndex - buildWeeks;
    const factors = [0.72, 0.55, 0.4];
    return Math.max(8, Math.round(peakMiles * (factors[step] ?? 0.4)));
  }

  const progress = buildWeeks === 1 ? 1 : weekIndex / (buildWeeks - 1);
  const ramped = startMiles + (peakMiles - startMiles) * progress;
  // Deload every 4th build week so the plan isn't a flat climb
  const deload = weekIndex > 0 && (weekIndex + 1) % 4 === 0 && weekIndex < buildWeeks - 1;
  return Math.round(deload ? ramped * 0.8 : ramped);
}

function buildWeekTemplate(args: {
  phase: Phase;
  weeklyMiles: number;
  intensity: Intensity;
  pace: string;
  distanceKey: DistanceKey;
  weekStart: Date;
  raceDate: Date;
  weekIndex: number;
  totalWeeks: number;
}): PlanDay[] {
  const {
    phase,
    weeklyMiles,
    intensity,
    pace,
    distanceKey,
    weekStart,
    raceDate,
    weekIndex,
    totalWeeks,
  } = args;
  const raceIso = iso(raceDate);
  const runsPerWeek = runsPerWeekFor(intensity);
  const progress = totalWeeks <= 1 ? 1 : weekIndex / Math.max(1, totalWeeks - 1);

  let longMi = longRunMiles({
    distanceKey,
    weeklyMiles,
    phase,
    weekIndex,
    totalWeeks,
  });
  let qualityMi =
    intensity === "conservative"
      ? Math.max(3, Math.round(weeklyMiles * 0.15))
      : Math.max(4, Math.round(weeklyMiles * 0.2));

  // Workout structure advances with plan progress, not only phase label
  const intervalReps =
    phase === "Taper"
      ? 2 + Math.round(progress)
      : phase === "Base"
        ? 3
        : phase === "Build"
          ? 4 + Math.round(progress * 2)
          : 5 + Math.round(progress * 2);

  const qualityTitle =
    phase === "Taper"
      ? "Short race-pace touch"
      : phase === "Base"
        ? progress < 0.35
          ? "Easy tempo"
          : "Steady tempo"
        : phase === "Build"
          ? progress < 0.5
            ? "Cruise intervals"
            : "Goal-pace intervals"
          : "Race-pace sharpeners";

  const finishMiles = Math.min(3, Math.max(1, Math.round(longMi * (0.12 + progress * 0.12))));
  // Miles shown on the long-run card (taper shortens the prescribed long)
  let longDisplayMi =
    phase === "Taper"
      ? Math.max(4, Math.round(longMi * 0.6))
      : longMi;

  // Long must stay the longest run of the week — never let easy/quality overshoot it.
  if (qualityMi >= longDisplayMi) {
    longDisplayMi = qualityMi + 1;
    longMi = Math.max(longMi, longDisplayMi);
  }

  const easySlots = Math.max(1, runsPerWeek - 2);
  let easyFill = Math.max(
    3,
    Math.round((weeklyMiles - longDisplayMi - qualityMi) / easySlots),
  );
  const maxEasy = Math.max(3, longDisplayMi - 1);
  if (easyFill > maxEasy) {
    const overflow = (easyFill - maxEasy) * easySlots;
    longDisplayMi += overflow;
    longMi = Math.max(longMi, longDisplayMi);
    easyFill = maxEasy;
  }

  const easyDayMi = (boost = 0) =>
    Math.min(Math.max(3, easyFill + boost), Math.max(3, longDisplayMi - 1));

  const qualityDetail =
    phase === "Taper"
      ? `20–30 min easy + ${intervalReps} × 3 min @ ~${pace}, full recoveries.`
      : phase === "Base"
        ? `${qualityMi} mi continuous @ comfortably hard (slower than ${pace}).`
        : distanceKey === "marathon" || distanceKey === "half"
          ? `${qualityMi} mi with ${intervalReps} × 1 mi @ ~${pace}, jog recoveries.`
          : `${qualityMi} mi with ${intervalReps + 2} × 400–800m @ faster than ${pace}, jog recoveries.`;

  const longDetail =
    phase === "Taper"
      ? `${longDisplayMi} mi easy — keep it conversational.`
      : phase === "Base"
        ? `${longDisplayMi} mi easy throughout.`
        : `${longDisplayMi} mi easy; last ${Math.min(finishMiles, Math.max(1, longDisplayMi - 1))} mi near ${pace} if feeling good.`;

  const skeleton: Omit<PlanDay, "date">[] =
    runsPerWeek >= 6
      ? [
          { day: "Mon", focus: "easy", title: "Easy", detail: `${easyDayMi()} mi easy.` },
          { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
          { day: "Wed", focus: "easy", title: "Easy", detail: `${easyDayMi()} mi easy.` },
          {
            day: "Thu",
            focus: "optional",
            title: "Optional easy / strides",
            detail: `${easyDayMi(-1)} mi easy + 4 strides.`,
          },
          { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest or 20–30 min walk." },
          { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
          {
            day: "Sun",
            focus: "easy",
            title: "Easy shakeout",
            detail: `${easyDayMi(-1)} mi easy.`,
          },
        ]
      : runsPerWeek === 5
        ? [
            { day: "Mon", focus: "rest", title: "Rest", detail: "Full rest or easy walk." },
            { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
            { day: "Wed", focus: "easy", title: "Easy", detail: `${easyDayMi()} mi easy.` },
            {
              day: "Thu",
              focus: "easy",
              title: "Easy + strides",
              detail: `${easyDayMi()} mi easy + 4 strides.`,
            },
            { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
            {
              day: "Sun",
              focus: "easy",
              title: "Easy",
              detail: `${easyDayMi(-1)} mi easy.`,
            },
          ]
        : [
            { day: "Mon", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Tue", focus: "quality", title: qualityTitle, detail: qualityDetail },
            { day: "Wed", focus: "rest", title: "Rest", detail: "Rest or cross-train easy." },
            { day: "Thu", focus: "easy", title: "Easy", detail: `${easyDayMi(1)} mi easy.` },
            { day: "Fri", focus: "rest", title: "Rest", detail: "Full rest." },
            { day: "Sat", focus: "long", title: "Long run", detail: longDetail },
            { day: "Sun", focus: "easy", title: "Easy", detail: `${easyDayMi()} mi easy.` },
          ];

  return skeleton.map((slot, i) => {
    const date = addDays(weekStart, i);
    const dateStr = iso(date);
    if (dateStr === raceIso) {
      return {
        ...slot,
        day: WEEKDAYS[i],
        date: dateStr,
        focus: "race" as const,
        title: "Race day",
        detail: `Goal race — target ~${pace}. Trust the taper.`,
      };
    }
    return { ...slot, day: WEEKDAYS[i], date: dateStr };
  });
}

/** Full plan through race day. Draft starts this Monday; started locks Week 1. */
export function buildTrainingPlan(args: {
  distanceKey: DistanceKey;
  distanceM: number;
  targetTimeSec: number;
  intensity: Intensity;
  verdict: Verdict;
  monthsToRace: number;
  recentWeeklyMiles: number;
  raceDate: Date;
  asOf?: Date;
  /** When set, Week 1 is this Monday and the plan is "started". */
  planStartMonday?: Date | null;
}): TrainingPlan {
  const asOf = startOfDay(args.asOf ?? new Date());
  const raceDate = startOfDay(args.raceDate);
  const end = raceDate < asOf ? asOf : raceDate;
  const started =
    args.planStartMonday != null && !Number.isNaN(args.planStartMonday.getTime());
  const lockedStart = started
    ? mondayOnOrBefore(args.planStartMonday!)
    : null;
  const firstMonday = lockedStart ?? mondayOnOrBefore(asOf);
  const lastMonday = mondayOnOrBefore(end);

  const peak = peakWeeklyMiles(
    args.distanceKey,
    args.recentWeeklyMiles,
    args.intensity,
    args.verdict,
  );
  // Always leave headroom so volume climbs toward peak (even if already trained)
  const fromHistory = Math.round(args.recentWeeklyMiles || peak * 0.7);
  const startMiles = Math.min(
    Math.round(peak * 0.82),
    Math.max(Math.round(VOLUME_FLOOR[args.distanceKey] * 0.75), fromHistory),
  );
  const pace = pacePerMile(args.targetTimeSec, args.distanceM);
  const runsPerWeek = runsPerWeekFor(args.intensity);

  const totalWeeks = Math.max(
    1,
    Math.round((lastMonday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1,
  );

  const weeks: PlanWeek[] = [];
  let cursor = firstMonday;
  let weekIndex = 0;
  // ponytail: hard cap 52 weeks — longer goals still get a year of plan
  while (cursor <= lastMonday && weekIndex < 52) {
    const monthsLeft = monthsBetween(cursor, end);
    const phase = phaseForMonths(monthsLeft);
    const weeklyMiles = weekMilesForPhase(weekIndex, totalWeeks, startMiles, peak);
    const days = buildWeekTemplate({
      phase,
      weeklyMiles,
      intensity: args.intensity,
      pace,
      distanceKey: args.distanceKey,
      weekStart: cursor,
      raceDate: end,
      weekIndex,
      totalWeeks,
    });

    weeks.push({
      weekIndex: weekIndex + 1,
      weekStart: iso(cursor),
      phase,
      weeklyMiles,
      days,
    });

    cursor = addDays(cursor, 7);
    weekIndex += 1;
  }

  if (weeks.length === 0) {
    const phase = phaseForMonths(args.monthsToRace);
    const days = buildWeekTemplate({
      phase,
      weeklyMiles: peak,
      intensity: args.intensity,
      pace,
      distanceKey: args.distanceKey,
      weekStart: firstMonday,
      raceDate: end,
      weekIndex: 0,
      totalWeeks: 1,
    });
    weeks.push({
      weekIndex: 1,
      weekStart: iso(firstMonday),
      phase,
      weeklyMiles: peak,
      days,
    });
  }

  const asOfMonday = mondayOnOrBefore(asOf);
  let currentIdx = weeks.findIndex((w) => {
    const start = startOfDay(new Date(`${w.weekStart}T00:00:00`));
    const endWeek = addDays(start, 7);
    return asOf >= start && asOf < endWeek;
  });
  if (currentIdx < 0) {
    if (asOfMonday.getTime() < firstMonday.getTime()) currentIdx = 0;
    else currentIdx = weeks.length - 1;
  }
  const current = weeks[currentIdx]!;

  const dist = DISTANCES[args.distanceKey].label;
  const planStatus = started ? ("started" as const) : ("draft" as const);
  const planStartMondayIso = lockedStart ? iso(lockedStart) : null;
  const notes = [
    planStatus === "draft"
      ? `Draft plan ${iso(firstMonday)} → ${iso(end)} (${weeks.length} week${weeks.length === 1 ? "" : "s"}) for a ${dist}. Start the plan to lock Week 1.`
      : `Plan runs ${planStartMondayIso} → ${iso(end)} (${weeks.length} week${weeks.length === 1 ? "" : "s"}) for a ${dist}. You are on week ${current.weekIndex}.`,
    `Volume builds ~${startMiles} → peak ~${peak} mi/week, with deload every 4th week, then taper. Goal pace ≈ ${pace}.`,
    "Cut volume 20–30% if sore, sick, or sleep-deprived. Template only — not personalized coaching.",
  ];

  return {
    phase: current.phase,
    weeklyMiles: current.weeklyMiles,
    runsPerWeek,
    goalPacePerMi: pace,
    weeksOut: weeks.length,
    startDate: iso(firstMonday),
    endDate: iso(end),
    days: current.days,
    weeks,
    notes,
    planStatus,
    planStartMonday: planStartMondayIso,
    currentWeekIndex: current.weekIndex,
  };
}

