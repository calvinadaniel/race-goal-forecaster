import { describe, expect, it } from "vitest";
import { formatPace } from "@/lib/units";

describe("formatPace", () => {
  it("formats mile pace from meters and seconds", () => {
    // 1609.344 m in 8:00 → 8:00/mi
    expect(formatPace(1609.344, 480, "mi")).toBe("8:00/mi");
  });

  it("formats km pace", () => {
    expect(formatPace(1000, 300, "km")).toBe("5:00/km");
  });
});
