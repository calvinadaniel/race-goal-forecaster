import { describe, expect, it } from "vitest";
import type { ForecastResult } from "@/lib/forecast/engine";
import { formatForecast } from "./print";

describe("formatForecast", () => {
  it("prints the friendly verdict label and disclaimer", () => {
    const result = {
      verdict: "on_track",
      predictedTimeSec: 7100,
      targetTimeSec: 7200,
      why: ["Current fitness supports the target."],
      needsBaseline: false,
      missing: [],
    } as unknown as ForecastResult;

    const output = formatForecast(result);

    expect(output).toContain("On track");
    expect(output).toContain(
      "Estimates only — not coaching or medical advice.",
    );
  });
});
