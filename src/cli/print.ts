import type { ForecastResult, Verdict } from "@/lib/forecast/engine";
import { formatDuration } from "@/lib/units";

const DISCLAIMER = "Estimates only — not coaching or medical advice.";
const VERDICT_LABELS: Record<Verdict, string> = {
  on_track: "On track",
  at_risk: "At risk",
  unlikely: "Unlikely",
};

export function formatForecast(result: ForecastResult): string {
  if (result.needsBaseline || result.missing.length > 0) {
    return [
      "Needs baseline",
      ...result.missing,
      ...result.why,
      DISCLAIMER,
    ].join("\n");
  }

  return [
    VERDICT_LABELS[result.verdict],
    `Projected ${formatDuration(result.predictedTimeSec)} vs goal ${formatDuration(result.targetTimeSec)}`,
    ...result.why,
    DISCLAIMER,
  ].join("\n");
}

export function formatPlan(result: ForecastResult): string {
  const plan = result.trainingPlan;
  if (!plan) {
    return ["No training plan available.", DISCLAIMER].join("\n");
  }

  const lines = [
    `Week ${plan.currentWeekIndex} of ${plan.weeks.length} (${plan.phase})`,
    ...plan.days.map(
      (day) => `${day.day} · ${day.title} · ${day.detail}`,
    ),
  ];
  for (const week of plan.weeks.slice(plan.currentWeekIndex)) {
    lines.push(
      `Week ${week.weekIndex} · ${week.weekStart} · ${week.phase} · ${week.weeklyMiles} mi`,
      ...week.days.map((day) => `${day.day} · ${day.title}`),
    );
  }
  lines.push(DISCLAIMER);
  return lines.join("\n");
}
