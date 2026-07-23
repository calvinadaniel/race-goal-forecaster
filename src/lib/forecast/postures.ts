export type Intensity = "conservative" | "balanced" | "aggressive";

/** Monthly improvement as fraction of gap closed toward goal (effort-based). */
export const POSTURE_MONTHLY_GAP_CLOSE: Record<Intensity, number> = {
  conservative: 0.08,
  balanced: 0.12,
  aggressive: 0.16,
};

export const POSTURE_LABELS: Record<Intensity, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

export const POSTURE_BLURBS: Record<Intensity, string> = {
  conservative: "Steady volume, limited speedwork — slower improvement ceiling.",
  balanced: "Structured weeks with some quality sessions — typical training load.",
  aggressive: "Higher volume and frequent quality work — fastest improvement, more risk.",
};
