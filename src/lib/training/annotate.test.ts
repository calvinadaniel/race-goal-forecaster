import { describe, expect, it } from "vitest";
import { annotateText } from "./annotate";

describe("annotateText", () => {
  it("matches longest alias first (race-pace before pace)", () => {
    const parts = annotateText("near race-pace work");
    const term = parts.find((p) => p.type === "term");
    expect(term).toEqual({
      type: "term",
      value: "race-pace",
      termId: "race-pace",
    });
  });

  it("is case-insensitive and preserves original casing in value", () => {
    const parts = annotateText("Easy + Strides today");
    expect(parts.some((p) => p.type === "term" && p.termId === "strides")).toBe(
      true,
    );
    const strides = parts.find(
      (p) => p.type === "term" && p.termId === "strides",
    );
    expect(strides && strides.type === "term" && strides.value).toBe("Strides");
  });

  it("returns plain text when nothing matches", () => {
    expect(annotateText("Hello world")).toEqual([
      { type: "text", value: "Hello world" },
    ]);
  });

  it("does not match inside unrelated longer words when using word boundaries", () => {
    // "rest" should not match inside "interest" if we use word boundaries
    const parts = annotateText("interest only");
    expect(parts.every((p) => p.type === "text")).toBe(true);
  });

  it("checks the first character when an alias begins at index one", () => {
    const parts = annotateText("arest day");
    expect(parts.every((p) => p.type === "text")).toBe(true);
  });
});
