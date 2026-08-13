import { describe, expect, it } from "vitest";
import { buildTrainingPlan } from "./training-plan";

function milesFromDetail(detail: string): number | null {
  const m = detail.match(/^(\d+(?:\.\d+)?)\s*mi\b/i);
  return m ? Number(m[1]) : null;
}

describe("long run is longest day", () => {
  it("conservative weeks never schedule an easy day longer than the Saturday long", () => {
    const plan = buildTrainingPlan({
      distanceKey: "half",
      distanceM: 21097.5,
      targetTimeSec: 7200,
      intensity: "conservative",
      verdict: "at_risk",
      monthsToRace: 4,
      recentWeeklyMiles: 28,
      raceDate: new Date("2026-11-01T12:00:00"),
      asOf: new Date("2026-07-06T12:00:00"),
    });

    for (const week of plan.weeks) {
      const long = week.days.find((d) => d.focus === "long");
      if (!long) continue;
      const longMi = milesFromDetail(long.detail);
      expect(longMi).not.toBeNull();

      for (const day of week.days) {
        if (day.focus === "long" || day.focus === "rest" || day.focus === "race") {
          continue;
        }
        const mi = milesFromDetail(day.detail);
        if (mi == null) continue;
        expect(
          mi,
          `${week.weekStart} ${day.day} (${mi} mi) should be < long (${longMi} mi)`,
        ).toBeLessThan(longMi!);
      }
    }
  });

  it("balanced and aggressive also keep the long as the longest prescribed run", () => {
    for (const intensity of ["balanced", "aggressive"] as const) {
      const plan = buildTrainingPlan({
        distanceKey: "half",
        distanceM: 21097.5,
        targetTimeSec: 7200,
        intensity,
        verdict: "at_risk",
        monthsToRace: 4,
        recentWeeklyMiles: 28,
        raceDate: new Date("2026-11-01T12:00:00"),
        asOf: new Date("2026-07-06T12:00:00"),
      });
      for (const week of plan.weeks) {
        const long = week.days.find((d) => d.focus === "long");
        if (!long) continue;
        const longMi = milesFromDetail(long.detail);
        if (longMi == null) continue;
        for (const day of week.days) {
          if (day.focus === "long" || day.focus === "rest" || day.focus === "race") {
            continue;
          }
          const mi = milesFromDetail(day.detail);
          if (mi == null) continue;
          expect(mi).toBeLessThan(longMi);
        }
      }
    }
  });
});