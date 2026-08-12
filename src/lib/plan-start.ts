/** Calendar helpers for locking a training plan to a Monday start. */

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday on or before the given local date. */
export function normalizeToMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return addDays(x, -diff);
}

function parseLocalIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return startOfDay(d);
}

export type ParsePlanStartResult =
  | { ok: true; value: Date | null }
  | { ok: false; error: string };

/**
 * Validate optional plan start Monday against race date.
 * null/undefined → draft (value null).
 */
export function parsePlanStartMonday(
  iso: string | null | undefined,
  raceDate: Date,
): ParsePlanStartResult {
  if (iso === null || iso === undefined) {
    return { ok: true, value: null };
  }
  if (typeof iso !== "string" || !iso.trim()) {
    return { ok: false, error: "Start week is required" };
  }

  const parsed = parseLocalIso(iso);
  if (!parsed) {
    return { ok: false, error: "Start week must be a valid date (YYYY-MM-DD)" };
  }

  if (parsed.getDay() !== 1) {
    return { ok: false, error: "Start week must be a Monday" };
  }

  const raceMonday = normalizeToMonday(raceDate);
  if (parsed.getTime() > raceMonday.getTime()) {
    return { ok: false, error: "Start week must be on or before race week" };
  }

  const earliest = addDays(raceMonday, -52 * 7);
  if (parsed.getTime() < earliest.getTime()) {
    return {
      ok: false,
      error: "Start week cannot be more than 52 weeks before race week",
    };
  }

  return { ok: true, value: parsed };
}
