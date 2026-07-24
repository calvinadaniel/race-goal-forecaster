import { describe, expect, it } from "vitest";
import { riegelEquivalentTime } from "@/lib/forecast/riegel";
import { computeForecast, hasMinimumHistory } from "@/lib/forecast/engine";

describe("riegelEquivalentTime", () => {
  it("scales half marathon toward marathon roughly", () => {
    // 1:43:24 half ≈ 6204s → marathon equivalent
    const marathon = riegelEquivalentTime(6204, 21097.5, 42195);
    expect(marathon).toBeGreaterThan(6204 * 2);
    expect(marathon).toBeLessThan(6204 * 2.3);
  });
});

describe("hasMinimumHistory", () => {
  it("blocks thin history without baseline", () => {
    const result = hasMinimumHistory([], [], null);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("allows manual baseline alone with weeks", () => {
    const weeks = Array.from({ length: 8 }, (_, i) => ({
      weekStart: `2026-01-${String(i + 1).padStart(2, "0")}`,
      miles: 25,
    }));
    const result = hasMinimumHistory([], weeks, {
      distanceKey: "half",
      distanceM: 21097.5,
      timeSec: 6204,
      date: "2026-03-15",
    });
    expect(result.ok).toBe(true);
  });
});

describe("computeForecast", () => {
  it("returns on_track when already faster than goal with time", () => {
    const raceDate = new Date();
    raceDate.setMonth(raceDate.getMonth() + 6);
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2025-1-${i + 1}`,
      miles: 40,
    }));
    const result = computeForecast({
      goalDistanceKey: "half",
      goalDistanceM: 21097.5,
      targetTimeSec: 7200,
      raceDate,
      intensity: "balanced",
      efforts: [
        {
          id: "1",
          name: "HM",
          startDate: new Date(),
          distanceM: 21097.5,
          movingTimeSec: 6000,
          isRace: true,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.needsBaseline).toBe(false);
    expect(result.verdict).toBe("on_track");
    expect(result.scenarios).toHaveLength(3);
  });

  it("marks unlikely for ambitious goal with little time", () => {
    const raceDate = new Date();
    raceDate.setMonth(raceDate.getMonth() + 1);
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2025-1-${i + 1}`,
      miles: 20,
    }));
    const result = computeForecast({
      goalDistanceKey: "marathon",
      goalDistanceM: 42195,
      targetTimeSec: 11100, // 3:05
      raceDate,
      intensity: "conservative",
      efforts: [
        {
          id: "1",
          name: "Marathon",
          startDate: new Date(),
          distanceM: 42195,
          movingTimeSec: 14063, // 3:54
          isRace: true,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.verdict).toBe("unlikely");
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.kpis.gapSec).toBeGreaterThan(0);
    expect(result.trainingPlan).not.toBeNull();
    expect(result.trainingPlan?.days).toHaveLength(7);
    expect(result.trainingPlan?.weeks.length).toBeGreaterThan(0);
    expect(result.trainingPlan?.weeklyMiles).toBeGreaterThan(0);
  });

  it("builds volume toward race then tapers (not a flat repeat)", () => {
    const asOf = new Date("2026-01-05T12:00:00");
    const raceDate = new Date("2026-07-05T12:00:00");
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2025-10-${String(i + 1).padStart(2, "0")}`,
      miles: 22,
    }));
    const result = computeForecast({
      goalDistanceKey: "half",
      goalDistanceM: 21097.5,
      targetTimeSec: 7200,
      raceDate,
      intensity: "balanced",
      asOf,
      efforts: [
        {
          id: "1",
          name: "HM",
          startDate: asOf,
          distanceM: 21097.5,
          movingTimeSec: 7500,
          isRace: true,
        },
      ],
      weeklyMiles: weeks,
    });
    const plan = result.trainingPlan!;
    expect(plan.weeks.length).toBeGreaterThan(8);
    const miles = plan.weeks.map((w) => w.weeklyMiles);
    const unique = new Set(miles);
    expect(unique.size).toBeGreaterThan(3);
    const last = miles[miles.length - 1];
    const mid = miles[Math.floor(miles.length / 2)];
    expect(mid).toBeGreaterThan(miles[0]);
    expect(last).toBeLessThan(mid);
  });
});
