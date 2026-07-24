import { describe, expect, it } from "vitest";
import { trainingPlanToCsv } from "@/lib/export-training-plan";
import { normalizeAthleteImageUrl } from "@/lib/strava";

describe("normalizeAthleteImageUrl", () => {
  it("accepts absolute Strava CDN URLs", () => {
    expect(
      normalizeAthleteImageUrl(
        "https://dgalywyr863hv.cloudfront.net/pictures/athletes/1/large.jpg",
      ),
    ).toBe("https://dgalywyr863hv.cloudfront.net/pictures/athletes/1/large.jpg");
  });

  it("rejects default relative avatar paths", () => {
    expect(normalizeAthleteImageUrl("avatar/athlete/large.png")).toBeNull();
    expect(
      normalizeAthleteImageUrl("avatar/athlete/large.png", "avatar/athlete/medium.png"),
    ).toBeNull();
  });

  it("falls back to the first usable absolute URL", () => {
    expect(
      normalizeAthleteImageUrl(
        "avatar/athlete/large.png",
        "https://example.com/photo.jpg",
      ),
    ).toBe("https://example.com/photo.jpg");
  });
});

describe("trainingPlanToCsv", () => {
  it("exports one row per day with escaped fields", () => {
    const csv = trainingPlanToCsv([
      {
        weekIndex: 1,
        weekStart: "2026-07-20",
        phase: "Build",
        weeklyMiles: 30,
        days: [
          {
            day: "Mon",
            date: "2026-07-20",
            focus: "easy",
            title: 'Easy "recovery"',
            detail: "Keep it easy, 5 mi",
          },
        ],
      },
    ]);
    expect(csv).toContain("Week,Week Start,Phase,Weekly Miles,Date,Day,Focus,Title,Detail");
    expect(csv).toContain(
      '1,2026-07-20,Build,30,2026-07-20,Mon,easy,"Easy ""recovery""","Keep it easy, 5 mi"',
    );
  });
});
