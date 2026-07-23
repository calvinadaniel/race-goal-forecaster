export const DISTANCES = {
  "5k": { key: "5k", label: "5K", meters: 5000 },
  "10k": { key: "10k", label: "10K", meters: 10000 },
  half: { key: "half", label: "Half Marathon", meters: 21097.5 },
  marathon: { key: "marathon", label: "Marathon", meters: 42195 },
} as const;

export type DistanceKey = keyof typeof DISTANCES;

export const DISTANCE_LIST = Object.values(DISTANCES);

/** Match activity distance to a standard race (±4%). */
export function nearestDistanceKey(distanceM: number): DistanceKey | null {
  let best: DistanceKey | null = null;
  let bestPct = Infinity;
  for (const d of DISTANCE_LIST) {
    const pct = Math.abs(distanceM - d.meters) / d.meters;
    if (pct <= 0.04 && pct < bestPct) {
      bestPct = pct;
      best = d.key;
    }
  }
  return best;
}
