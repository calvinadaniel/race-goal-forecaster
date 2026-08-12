import { describe, expect, it } from "vitest";
import { buildTrainingPlan } from "./training-plan";

const base = {
  distanceKey: "half" as const,
  distanceM: 21097.5,
  targetTimeSec: 7200,
  intensity: "balanced" as const,
  verdict: "at_risk" as const,
  monthsToRace: 4,
  recentWeeklyMiles: 25,
  raceDate: new Date("2026-11-01T12:00:00"),
};

describe("calendar-locked plan start", () => {
  it("started plan: asOf three weeks later uses week 4 days, not week 1", () => {
    const start = new Date("2026-07-06T12:00:00"); // Monday
    const plan = buildTrainingPlan({
      ...base,
      asOf: new Date("2026-07-27T12:00:00"), // Monday, 3 weeks later
      planStartMonday: start,
    });
    expect(plan.planStatus).toBe("started");
    expect(plan.currentWeekIndex).toBe(4);
    expect(plan.weeks[0]!.weekStart).toBe("2026-07-06");
    expect(plan.days[0]?.date).toBe(plan.weeks[3]!.days[0]?.date);
  });

  it("draft plan has planStatus draft and current week 1", () => {
    const plan = buildTrainingPlan({
      ...base,
      asOf: new Date("2026-07-27T12:00:00"),
    });
    expect(plan.planStatus).toBe("draft");
    expect(plan.currentWeekIndex).toBe(1);
    expect(plan.planStartMonday).toBeNull();
    expect(plan.days[0]?.date).toBe(plan.weeks[0]!.days[0]?.date);
  });
});
