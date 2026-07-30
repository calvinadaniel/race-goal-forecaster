import { describe, expect, it } from "vitest";
import { buildTrainingPlan } from "./training-plan";

function extractLongMiles(detail: string): number {
  const m = detail.match(/(\d+)\s*mi/);
  return m ? Number(m[1]) : 0;
}

function longMilesByWeek(plan: ReturnType<typeof buildTrainingPlan>) {
  return plan.weeks.map((w) => {
    const long = w.days.find((d) => d.focus === "long");
    return {
      phase: w.phase,
      weekly: w.weeklyMiles,
      longMi: long ? extractLongMiles(long.detail) : 0,
    };
  });
}

describe("marathon long-run progression", () => {
  it("peaks a long run of at least 18 miles before taper", () => {
    const plan = buildTrainingPlan({
      distanceKey: "marathon",
      distanceM: 42195,
      targetTimeSec: 14400,
      intensity: "balanced",
      verdict: "at_risk",
      monthsToRace: 6,
      recentWeeklyMiles: 25,
      raceDate: new Date("2026-07-05"),
      asOf: new Date("2026-01-05"),
    });
    const rows = longMilesByWeek(plan);
    const buildLongs = rows.filter((r) => r.phase !== "Taper").map((r) => r.longMi);
    const maxLong = Math.max(...buildLongs, 0);
    expect(maxLong).toBeGreaterThanOrEqual(18);
    expect(buildLongs[0]!).toBeLessThan(maxLong);
  });

  it("half marathon peaks a long run of at least 12 miles", () => {
    const plan = buildTrainingPlan({
      distanceKey: "half",
      distanceM: 21097.5,
      targetTimeSec: 7200,
      intensity: "balanced",
      verdict: "at_risk",
      monthsToRace: 4,
      recentWeeklyMiles: 20,
      raceDate: new Date("2026-05-05"),
      asOf: new Date("2026-01-05"),
    });
    const buildLongs = longMilesByWeek(plan)
      .filter((r) => r.phase !== "Taper")
      .map((r) => r.longMi);
    expect(Math.max(...buildLongs, 0)).toBeGreaterThanOrEqual(12);
  });
});

describe("posture intensity", () => {
  it("aggressive schedules more runs than conservative", () => {
    const base = {
      distanceKey: "half" as const,
      distanceM: 21097.5,
      targetTimeSec: 7200,
      verdict: "at_risk" as const,
      monthsToRace: 4,
      recentWeeklyMiles: 30,
      raceDate: new Date("2026-11-01"),
      asOf: new Date("2026-07-01"),
    };
    const c = buildTrainingPlan({ ...base, intensity: "conservative" });
    const a = buildTrainingPlan({ ...base, intensity: "aggressive" });
    expect(a.runsPerWeek).toBeGreaterThan(c.runsPerWeek);
  });
});
