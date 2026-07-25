export type Units = "mi" | "km";

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

export function formatDistance(meters: number, units: Units): string {
  if (units === "km") {
    return `${metersToKm(meters).toFixed(1)} km`;
  }
  return `${metersToMiles(meters).toFixed(1)} mi`;
}

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Pace from meters + moving seconds, e.g. `8:12/mi` or `5:05/km`. */
export function formatPace(
  distanceM: number,
  movingTimeSec: number,
  units: Units,
): string {
  if (!(distanceM > 0) || !(movingTimeSec > 0)) return "—";
  const dist = units === "km" ? metersToKm(distanceM) : metersToMiles(distanceM);
  if (dist < 0.05) return "—";
  const secPer = movingTimeSec / dist;
  const m = Math.floor(secPer / 60);
  const s = Math.round(secPer % 60);
  const suffix = units === "km" ? "/km" : "/mi";
  return `${m}:${String(s).padStart(2, "0")}${suffix}`;
}

export function parseDuration(input: string): number | null {
  const parts = input.trim().split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

export function weeklyVolumeFromActivities(
  activities: { startDate: Date; distanceM: number }[],
): { weekStart: string; miles: number }[] {
  const weeks = new Map<string, number>();
  for (const a of activities) {
    const d = new Date(a.startDate);
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + metersToMiles(a.distanceM));
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, miles]) => ({
      weekStart,
      miles: Math.round(miles * 10) / 10,
    }));
}
