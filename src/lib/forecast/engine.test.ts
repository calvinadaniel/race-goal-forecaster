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

  it("keeps a goal-distance PR even when older than 90 days", () => {
    const asOf = new Date("2026-07-27T12:00:00Z");
    const raceDate = new Date("2026-11-01T12:00:00Z");
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2026-0${Math.min(i + 1, 9)}-01`,
      miles: 35,
    }));
    const aprilMarathonSec = 3 * 3600 + 54 * 60 + 23; // 3:54:23
    const result = computeForecast({
      goalDistanceKey: "marathon",
      goalDistanceM: 42195,
      targetTimeSec: 3 * 3600 + 50 * 60, // 3:50 goal
      raceDate,
      intensity: "balanced",
      asOf,
      efforts: [
        {
          id: "april-m",
          name: "April Marathon",
          startDate: new Date("2026-04-15T12:00:00Z"),
          distanceM: 42195,
          movingTimeSec: aprilMarathonSec,
          isRace: true,
          workoutType: 1,
        },
        {
          id: "slow-10k",
          name: "Easy 10K",
          startDate: new Date("2026-07-01T12:00:00Z"),
          distanceM: 10000,
          movingTimeSec: 3600, // easy default run — volume only
          isRace: false,
          workoutType: null,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.needsBaseline).toBe(false);
    expect(result.fitness.pr?.id).toBe("april-m");
    // Easy 10K must not enter recent form
    expect(result.fitness.recentForm).toBeNull();
    expect(result.fitness.divergence).toBe("pr_only");
    expect(result.currentEquivalentSec).toBe(aprilMarathonSec);
    expect(result.predictedTimeSec).toBeLessThan(4 * 3600 + 14 * 60);
  });

  it("includes quality efforts from within 12 months", () => {
    const asOf = new Date("2026-07-27T12:00:00Z");
    const raceDate = new Date("2026-11-01T12:00:00Z");
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2026-0${Math.min(i + 1, 9)}-01`,
      miles: 30,
    }));
    const halfSec = 1 * 3600 + 40 * 60; // 1:40 half
    const result = computeForecast({
      goalDistanceKey: "marathon",
      goalDistanceM: 42195,
      targetTimeSec: 4 * 3600,
      raceDate,
      intensity: "balanced",
      asOf,
      efforts: [
        {
          id: "old-half",
          name: "Autumn Half",
          startDate: new Date("2025-09-01T12:00:00Z"), // ~11 months before asOf
          distanceM: 21097.5,
          movingTimeSec: halfSec,
          isRace: true,
          workoutType: 1,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.effortsUsed.some((e) => e.id === "old-half")).toBe(true);
    // 11 months old half: outside 90d, not goal-distance PR → year fallback as form_only
    expect(result.fitness.divergence).toBe("form_only");
    expect(result.currentEquivalentSec).toBe(
      riegelEquivalentTime(halfSec, 21097.5, 42195),
    );
  });

  it("weights a recent goal-distance race over a stale PR", () => {
    const asOf = new Date("2026-07-27T12:00:00Z");
    const raceDate = new Date("2026-11-01T12:00:00Z");
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2026-0${Math.min(i + 1, 9)}-01`,
      miles: 28,
    }));
    const stalePr = 3 * 3600 + 40 * 60; // 3:40
    const recentSlow = 4 * 3600 + 10 * 60; // 4:10
    const result = computeForecast({
      goalDistanceKey: "marathon",
      goalDistanceM: 42195,
      targetTimeSec: 3 * 3600 + 55 * 60,
      raceDate,
      intensity: "balanced",
      asOf,
      efforts: [
        {
          id: "old-pr",
          name: "Old PR",
          startDate: new Date("2025-01-15T12:00:00Z"), // ~18 months
          distanceM: 42195,
          movingTimeSec: stalePr,
          isRace: true,
          workoutType: 1,
        },
        {
          id: "recent-m",
          name: "Comeback Marathon",
          startDate: new Date("2026-06-01T12:00:00Z"),
          distanceM: 42195,
          movingTimeSec: recentSlow,
          isRace: true,
          workoutType: 1,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.fitness.divergence).toBe("form_behind");
    expect(result.fitness.prWeight).toBeLessThan(0.5);
    expect(result.currentEquivalentSec).toBeGreaterThan(
      (stalePr + recentSlow) / 2 - 60,
    );
    expect(result.fitness.recentForm?.id).toBe("recent-m");
  });

  it("uses marked workouts for fitness but ignores easy default runs", () => {
    const asOf = new Date("2026-07-27T12:00:00Z");
    const raceDate = new Date("2026-11-01T12:00:00Z");
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2026-0${Math.min(i + 1, 9)}-01`,
      miles: 40,
    }));
    const workoutSec = 22 * 60; // hard 5K workout
    const easySec = 35 * 60; // easy 5K
    const result = computeForecast({
      goalDistanceKey: "marathon",
      goalDistanceM: 42195,
      targetTimeSec: 4 * 3600,
      raceDate,
      intensity: "balanced",
      asOf,
      efforts: [
        {
          id: "easy-5k",
          name: "Easy 5K",
          startDate: new Date("2026-07-20T12:00:00Z"),
          distanceM: 5000,
          movingTimeSec: easySec,
          isRace: false,
          workoutType: 0,
        },
        {
          id: "tempo-5k",
          name: "Tempo 5K",
          startDate: new Date("2026-07-10T12:00:00Z"),
          distanceM: 5000,
          movingTimeSec: workoutSec,
          isRace: false,
          workoutType: 3,
        },
      ],
      weeklyMiles: weeks,
    });
    expect(result.fitness.recentForm?.id).toBe("tempo-5k");
    expect(result.effortsUsed.every((e) => e.id !== "easy-5k")).toBe(true);
    expect(result.currentEquivalentSec).toBe(
      riegelEquivalentTime(workoutSec, 5000, 42195),
    );
  });
});
