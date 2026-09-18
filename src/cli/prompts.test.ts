import { describe, expect, it } from "vitest";
import { parseGoalAnswers } from "./prompts";

const asOf = new Date("2026-09-17T00:00:00Z");

describe("parseGoalAnswers", () => {
  it("builds a CliGoal from valid strings", () => {
    const g = parseGoalAnswers(
      {
        distanceKey: "half",
        goalTime: "1:32:00",
        raceDate: "2026-11-08",
        intensity: "balanced",
        units: "mi",
        baselineDistanceKey: "half",
        baselineTime: "1:43:24",
        baselineDate: "2026-03-15",
      },
      asOf,
    );
    expect("error" in g).toBe(false);
    if ("error" in g) return;
    expect(g.targetTimeSec).toBe(5520);
    expect(g.distanceM).toBe(21097.5);
    expect(g.manualBaseline.timeSec).toBe(6204);
  });

  it("rejects unknown distance and past race dates", () => {
    const badDist = parseGoalAnswers(
      {
        distanceKey: "ultra",
        goalTime: "1:32:00",
        raceDate: "2026-11-08",
        intensity: "balanced",
        units: "mi",
        baselineDistanceKey: "half",
        baselineTime: "1:43:24",
        baselineDate: "2026-03-15",
      },
      asOf,
    );
    expect("error" in badDist).toBe(true);
  });
});
