import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCredentials,
  readCredentials,
  readGoal,
  writeCredentials,
  writeGoal,
} from "./store";
import type { CliGoal } from "./store";

const creds = {
  athlete: { id: 99, firstname: "Ada", lastname: "Runner" },
  access_token: "at",
  refresh_token: "rt",
  expires_at: 1_700_000_000,
  scope: "activity:read_all",
};

const goal: CliGoal = {
  distanceKey: "half",
  distanceM: 21097.5,
  targetTimeSec: 5520,
  raceDate: "2026-11-08",
  intensity: "balanced",
  units: "mi",
  manualBaseline: {
    distanceKey: "half",
    distanceM: 21097.5,
    timeSec: 6204,
    date: "2026-03-15",
  },
};

describe("cli store", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "truepace-"));
    process.env.TRUEPACE_HOME = home;
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRUEPACE_HOME;
  });

  it("returns null when credentials are missing", () => {
    expect(readCredentials()).toBeNull();
  });

  it("round-trips credentials", () => {
    writeCredentials(creds);
    expect(readCredentials()).toEqual(creds);
  });

  it("clearCredentials removes the file and keeps goal", () => {
    writeCredentials(creds);
    writeGoal(goal);
    clearCredentials();
    expect(readCredentials()).toBeNull();
    expect(readGoal()).toEqual(goal);
  });

  it("writes credentials with owner-only mode when chmod is supported", () => {
    writeCredentials(creds);
    const mode = readFileSync(join(home, "credentials.json")).length;
    expect(mode).toBeGreaterThan(0);
  });

  it.runIf(process.platform !== "win32")(
    "uses owner-only modes for the directory and credentials",
    () => {
      writeCredentials(creds);
      expect(statSync(home).mode & 0o777).toBe(0o700);
      expect(statSync(join(home, "credentials.json")).mode & 0o777).toBe(
        0o600,
      );
    },
  );

  it("rejects a saved goal with an unknown distance key", () => {
    writeFileSync(
      join(home, "goal.json"),
      JSON.stringify({ ...goal, distanceKey: "ultra" }),
    );
    expect(readGoal()).toBeNull();
  });
});
