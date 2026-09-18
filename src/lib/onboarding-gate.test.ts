import { describe, expect, it } from "vitest";
import { onboardingPathForGoalPayload } from "./onboarding-gate";

describe("onboardingPathForGoalPayload", () => {
  it("sends returning runners with a goal to /app", () => {
    expect(
      onboardingPathForGoalPayload({
        goal: { distanceKey: "half" },
        units: "mi",
      }),
    ).toBe("/app");
  });

  it("keeps new runners on onboarding", () => {
    expect(onboardingPathForGoalPayload({ goal: null, units: "mi" })).toBeNull();
    expect(onboardingPathForGoalPayload({ error: "Unauthorized" })).toBeNull();
    expect(onboardingPathForGoalPayload(null)).toBeNull();
  });
});
