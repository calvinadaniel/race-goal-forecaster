import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedActivity } from "@/lib/activity-source";
import { loadForecast, withRetry } from "./forecast";
import { writeCredentials, writeGoal, type CliGoal } from "./store";

const asOf = new Date("2026-01-05T12:00:00Z");
const goal: CliGoal = {
  distanceKey: "half",
  distanceM: 21097.5,
  targetTimeSec: 7200,
  raceDate: "2026-04-05",
  intensity: "balanced",
  units: "mi",
  manualBaseline: {
    distanceKey: "half",
    distanceM: 21097.5,
    timeSec: 6204,
    date: "2025-10-05",
  },
};

function activity(
  id: string,
  startDate: Date,
  distanceM: number,
  movingTimeSec: number,
  workoutType: number | null = null,
): NormalizedActivity {
  return {
    id,
    name: id,
    startDate,
    distanceM,
    movingTimeSec,
    avgHr: null,
    sufferScore: null,
    isRace: workoutType === 1,
    workoutType,
  };
}

describe("loadForecast", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "truepace-"));
    process.env.TRUEPACE_HOME = home;
    writeCredentials({
      athlete: { id: 5, firstname: "Ada" },
      access_token: "fresh-at",
      refresh_token: "rt",
      expires_at: 4_000_000_000,
      scope: "activity:read_all",
    });
    writeGoal(goal);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRUEPACE_HOME;
  });

  it("computes an on-track forecast from Strava effort and volume", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const runs = [
      activity("comfortable-half", asOf, 21097.5, 6000, 1),
      ...Array.from({ length: 12 }, (_, index) =>
        activity(
          `volume-${index}`,
          new Date(asOf.getTime() - (index + 1) * 7 * 86_400_000),
          40 * 1609.344,
          4 * 3600,
        ),
      ),
    ];
    const listActivities = vi.fn(async () => runs);

    const result = await loadForecast({ listActivities, asOf });

    expect(result.verdict).toBe("on_track");
    expect(result.needsBaseline).toBe(false);
    expect(listActivities).toHaveBeenCalledOnce();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("withRetry", () => {
  it("retries 429 failures and succeeds on the third attempt", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("Strava activities fetch failed: 429"))
      .mockRejectedValueOnce(new Error("Strava activities fetch failed: 429"))
      .mockResolvedValue("ok");

    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
