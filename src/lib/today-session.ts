import { isoDate } from "@/lib/plan-start";

export type SessionDay = {
  day: string;
  date?: string;
  focus: string;
  title: string;
  detail: string;
};

const JS_TO_PLAN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function findTodaySession(
  plan: {
    days: SessionDay[];
    weeks?: { days: SessionDay[] }[];
  } | null,
  today = new Date(),
): SessionDay | null {
  if (!plan) return null;
  const todayIso = isoDate(today);
  const fromWeeks = plan.weeks?.flatMap((week) => week.days) ?? [];
  const byDate = fromWeeks.find((d) => d.date === todayIso);
  if (byDate) return byDate;
  const fromCurrent = plan.days.find((d) => d.date === todayIso);
  if (fromCurrent) return fromCurrent;
  const label = JS_TO_PLAN[today.getDay()];
  return plan.days.find((d) => d.day === label) ?? null;
}

export function formatWeekdayDate(iso: string, fallback = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : fallback;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const SHORT_DISTANCE: Record<string, string> = {
  "5k": "5K",
  "10k": "10K",
  half: "Half",
  marathon: "Marathon",
};
