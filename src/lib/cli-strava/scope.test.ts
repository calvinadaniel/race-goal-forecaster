import { describe, expect, it } from "vitest";
import { hasActivityReadAll } from "./scope";

describe("hasActivityReadAll", () => {
  it("accepts comma or space lists that include activity:read_all", () => {
    expect(hasActivityReadAll("read,activity:read_all")).toBe(true);
    expect(hasActivityReadAll("activity:read_all read")).toBe(true);
  });

  it("rejects weaker activity:read", () => {
    expect(hasActivityReadAll("read,activity:read")).toBe(false);
    expect(hasActivityReadAll(null)).toBe(false);
  });
});
