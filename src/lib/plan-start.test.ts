import { describe, expect, it } from "vitest";
import { normalizeToMonday, parsePlanStartMonday } from "./plan-start";

describe("normalizeToMonday", () => {
  it("moves Wednesday back to Monday", () => {
    const d = normalizeToMonday(new Date("2026-08-12T12:00:00"));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(10);
  });
});

describe("parsePlanStartMonday", () => {
  const race = new Date("2026-11-01T12:00:00"); // Sunday

  it("accepts null as draft", () => {
    expect(parsePlanStartMonday(null, race)).toEqual({ ok: true, value: null });
  });

  it("accepts undefined as draft", () => {
    expect(parsePlanStartMonday(undefined, race)).toEqual({
      ok: true,
      value: null,
    });
  });

  it("rejects non-Monday ISO dates", () => {
    const r = parsePlanStartMonday("2026-08-12", race); // Wednesday
    expect(r.ok).toBe(false);
  });

  it("accepts a Monday on or before race week Monday", () => {
    const r = parsePlanStartMonday("2026-08-10", race);
    expect(r.ok).toBe(true);
    if (r.ok && r.value) {
      expect(r.value.getFullYear()).toBe(2026);
      expect(r.value.getMonth()).toBe(7);
      expect(r.value.getDate()).toBe(10);
    }
  });

  it("rejects a Monday after race week Monday", () => {
    const r = parsePlanStartMonday("2026-11-09", race);
    expect(r.ok).toBe(false);
  });
});
