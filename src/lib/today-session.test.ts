import { describe, expect, it } from "vitest";
import { findTodaySession } from "./today-session";

const monday = {
  day: "Mon",
  date: "2026-09-14",
  focus: "easy",
  title: "Easy",
  detail: "5 mi easy.",
};
const tuesday = {
  day: "Tue",
  date: "2026-09-15",
  focus: "quality",
  title: "Intervals",
  detail: "6 mi; 8 x 400.",
};

describe("findTodaySession", () => {
  it("returns the day matching today's date from weeks", () => {
    const plan = {
      days: [monday],
      weeks: [{ days: [monday, tuesday] }],
    };
    const hit = findTodaySession(plan, new Date(2026, 8, 15));
    expect(hit?.title).toBe("Intervals");
  });

  it("falls back to weekday label on the current week", () => {
    const plan = {
      days: [
        { ...monday, date: undefined },
        { ...tuesday, date: undefined },
      ],
    };
    const hit = findTodaySession(plan, new Date(2026, 8, 15));
    expect(hit?.day).toBe("Tue");
  });

  it("returns null without a plan", () => {
    expect(findTodaySession(null)).toBeNull();
  });
});
