import { computeForecast, type ForecastResult } from "@/lib/forecast/engine";
import { stravaSource } from "@/lib/strava";
import { weeklyVolumeFromActivities } from "@/lib/units";
import { ensureFreshCredentials } from "./auth";
import { promptGoal } from "./prompts";
import { readGoal, writeGoal } from "./store";

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof Error) ||
        !error.message.includes(" 429") ||
        attempt === attempts - 1
      ) {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function loadForecast(args: {
  resetGoal?: boolean;
  listActivities?: typeof stravaSource.listActivities;
  asOf?: Date;
}): Promise<ForecastResult> {
  const credentials = await ensureFreshCredentials();
  let goal = args.resetGoal ? null : readGoal();
  if (!goal) {
    goal = await promptGoal();
    writeGoal(goal);
  }

  const asOf = args.asOf ?? new Date();
  const since = new Date(asOf);
  since.setMonth(since.getMonth() - 18);
  const listActivities =
    args.listActivities ?? stravaSource.listActivities.bind(stravaSource);
  const activities = await withRetry(() =>
    listActivities(credentials.access_token, since),
  );

  return computeForecast({
    goalDistanceKey: goal.distanceKey,
    goalDistanceM: goal.distanceM,
    targetTimeSec: goal.targetTimeSec,
    raceDate: new Date(goal.raceDate),
    intensity: goal.intensity,
    efforts: activities,
    weeklyMiles: weeklyVolumeFromActivities(activities),
    manualBaseline: goal.manualBaseline,
    asOf,
  });
}
