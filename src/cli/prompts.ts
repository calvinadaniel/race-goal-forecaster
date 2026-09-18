import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import { parseDuration, type Units } from "@/lib/units";
import type { CliGoal } from "./store";

export type GoalAnswers = {
  distanceKey: string;
  goalTime: string;
  raceDate: string;
  intensity: string;
  units: string;
  baselineDistanceKey: string;
  baselineTime: string;
  baselineDate: string;
};

const INTENSITIES = new Set<Intensity>([
  "conservative",
  "balanced",
  "aggressive",
]);
const UNIT_VALUES = new Set<Units>(["mi", "km"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLON_TIME_RE = /^\d+:[0-5]\d(?::[0-5]\d)?$/;

function parseColonDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!COLON_TIME_RE.test(trimmed)) return null;
  return parseDuration(trimmed);
}

function isDistanceKey(key: string): key is DistanceKey {
  return Object.hasOwn(DISTANCES, key);
}

function parseDateKey(value: string): string | null {
  const trimmed = value.trim();
  if (!DATE_RE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

function asOfDateKey(asOf: Date): string {
  return asOf.toISOString().slice(0, 10);
}

export function parseGoalAnswers(
  answers: GoalAnswers,
  asOf: Date = new Date(),
): CliGoal | { error: string } {
  const distanceKey = answers.distanceKey.trim();
  if (!isDistanceKey(distanceKey)) {
    return { error: `Unknown distance "${answers.distanceKey}"` };
  }

  const targetTimeSec = parseColonDuration(answers.goalTime);
  if (targetTimeSec == null || targetTimeSec <= 0) {
    return { error: "Invalid goal time" };
  }

  const raceDate = parseDateKey(answers.raceDate);
  if (!raceDate) {
    return { error: "Invalid race date (use YYYY-MM-DD)" };
  }
  if (raceDate <= asOfDateKey(asOf)) {
    return { error: "Race date must be in the future" };
  }

  const intensity = answers.intensity.trim() as Intensity;
  if (!INTENSITIES.has(intensity)) {
    return { error: `Unknown posture "${answers.intensity}"` };
  }

  const units = answers.units.trim() as Units;
  if (!UNIT_VALUES.has(units)) {
    return { error: `Unknown units "${answers.units}"` };
  }

  const baselineDistanceKey = answers.baselineDistanceKey.trim();
  if (!isDistanceKey(baselineDistanceKey)) {
    return { error: `Unknown baseline distance "${answers.baselineDistanceKey}"` };
  }

  const baselineTimeSec = parseColonDuration(answers.baselineTime);
  if (baselineTimeSec == null || baselineTimeSec <= 0) {
    return { error: "Invalid baseline time" };
  }

  const baselineDate = parseDateKey(answers.baselineDate);
  if (!baselineDate) {
    return { error: "Invalid baseline date (use YYYY-MM-DD)" };
  }

  return {
    distanceKey,
    distanceM: DISTANCES[distanceKey].meters,
    targetTimeSec,
    raceDate,
    intensity,
    units,
    manualBaseline: {
      distanceKey: baselineDistanceKey,
      distanceM: DISTANCES[baselineDistanceKey].meters,
      timeSec: baselineTimeSec,
      date: baselineDate,
    },
  };
}

async function askGoalQuestions(
  question: (q: string) => Promise<string>,
): Promise<GoalAnswers> {
  return {
    distanceKey: await question("Distance (5k, 10k, half, marathon): "),
    goalTime: await question("Goal time (h:mm:ss or mm:ss): "),
    raceDate: await question("Race date (YYYY-MM-DD): "),
    intensity: await question(
      "Posture (conservative, balanced, aggressive): ",
    ),
    units: await question("Units (mi or km): "),
    baselineDistanceKey: await question(
      "Baseline distance (5k, 10k, half, marathon): ",
    ),
    baselineTime: await question("Baseline time (h:mm:ss or mm:ss): "),
    baselineDate: await question("Baseline date (YYYY-MM-DD): "),
  };
}

export async function promptGoal(
  io?: { question: (q: string) => Promise<string> },
): Promise<CliGoal> {
  let rl: readline.Interface | undefined;
  const question =
    io?.question ??
    (() => {
      rl = readline.createInterface({ input, output });
      return (q: string) => rl!.question(q);
    })();

  try {
    const asOf = new Date();
    while (true) {
      const answers = await askGoalQuestions(question);
      const result = parseGoalAnswers(answers, asOf);
      if (!("error" in result)) return result;
      console.error(result.error);
    }
  } finally {
    rl?.close();
  }
}
