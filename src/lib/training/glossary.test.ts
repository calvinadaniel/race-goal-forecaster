import { describe, expect, it } from "vitest";
import { GLOSSARY } from "./glossary";

describe("GLOSSARY", () => {
  it("has unique ids", () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires label and short for every term", () => {
    for (const t of GLOSSARY) {
      expect(t.label.trim().length).toBeGreaterThan(0);
      expect(t.short.trim().length).toBeGreaterThan(10);
    }
  });
});
