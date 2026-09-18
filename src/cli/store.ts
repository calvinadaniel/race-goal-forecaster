import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import type { ManualBaseline } from "@/lib/forecast/engine";
import type { Units } from "@/lib/units";

export type CliAthlete = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
};

export type CliCredentials = {
  athlete: CliAthlete;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
};

export type CliGoal = {
  distanceKey: DistanceKey;
  distanceM: number;
  targetTimeSec: number;
  raceDate: string;
  intensity: Intensity;
  units: Units;
  manualBaseline: ManualBaseline;
};

export function truepaceDir(): string {
  return process.env.TRUEPACE_HOME ?? join(homedir(), ".truepace");
}

function credentialsPath() {
  return join(truepaceDir(), "credentials.json");
}

function goalPath() {
  return join(truepaceDir(), "goal.json");
}

function ensureDir() {
  mkdirSync(truepaceDir(), { mode: 0o700, recursive: true });
}

function writePrivate(path: string, body: string) {
  ensureDir();
  writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows may ignore chmod; file is still user-local under the homedir.
  }
}

export function readCredentials(): CliCredentials | null {
  try {
    return JSON.parse(readFileSync(credentialsPath(), "utf8")) as CliCredentials;
  } catch {
    return null;
  }
}

export function writeCredentials(creds: CliCredentials): void {
  writePrivate(credentialsPath(), JSON.stringify(creds, null, 2));
}

export function clearCredentials(): void {
  rmSync(credentialsPath(), { force: true });
}

export function readGoal(): CliGoal | null {
  try {
    const goal = JSON.parse(readFileSync(goalPath(), "utf8")) as CliGoal;
    return DISTANCES[goal.distanceKey] ? goal : null;
  } catch {
    return null;
  }
}

export function writeGoal(goal: CliGoal): void {
  if (!DISTANCES[goal.distanceKey]) {
    throw new Error(`Unknown distanceKey ${goal.distanceKey}`);
  }
  writePrivate(goalPath(), JSON.stringify(goal, null, 2));
}

export function clearGoal(): void {
  rmSync(goalPath(), { force: true });
}
