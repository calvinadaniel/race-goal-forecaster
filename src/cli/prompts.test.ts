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

  it("rejects unknown distance", () => {
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

  it('rejects "constructor" as distance key', () => {
    const badDist = parseGoalAnswers(
      {
        distanceKey: "constructor",
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

  it("rejects past race date relative to asOf", () => {
    const pastRace = parseGoalAnswers(
      {
        distanceKey: "half",
        goalTime: "1:32:00",
        raceDate: "2026-09-17",
        intensity: "balanced",
        units: "mi",
        baselineDistanceKey: "half",
        baselineTime: "1:43:24",
        baselineDate: "2026-03-15",
      },
      asOf,
    );
    expect("error" in pastRace).toBe(true);
    if ("error" in pastRace) {
      expect(pastRace.error).toMatch(/future/i);
    }
  });

  it("rejects malformed goal and baseline times", () => {
    const validAnswers = {
      distanceKey: "half",
      goalTime: "1:32:00",
      raceDate: "2026-11-08",
      intensity: "balanced",
      units: "mi",
      baselineDistanceKey: "half",
      baselineTime: "1:43:24",
      baselineDate: "2026-03-15",
    };

    for (const goalTime of ["5520", "1:99:00"]) {
      const badGoal = parseGoalAnswers({ ...validAnswers, goalTime }, asOf);
      expect("error" in badGoal).toBe(true);
      if ("error" in badGoal) {
        expect(badGoal.error).toMatch(/goal time/i);
      }
    }

    for (const baselineTime of ["5520", "1:99:00"]) {
      const badBaseline = parseGoalAnswers(
        { ...validAnswers, baselineTime },
        asOf,
      );
      expect("error" in badBaseline).toBe(true);
      if ("error" in badBaseline) {
        expect(badBaseline.error).toMatch(/baseline time/i);
      }
    }
  });
});
