type PlanDay = {
  day: string;
  date?: string;
  focus: string;
  title: string;
  detail: string;
};

type PlanWeek = {
  weekIndex: number;
  weekStart: string;
  phase: string;
  weeklyMiles: number;
  days: PlanDay[];
};

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV of the on-screen full training plan (one row per day). */
export function trainingPlanToCsv(weeks: PlanWeek[]): string {
  const header = [
    "Week",
    "Week Start",
    "Phase",
    "Weekly Miles",
    "Date",
    "Day",
    "Focus",
    "Title",
    "Detail",
  ];
  const lines = [header.map(csvEscape).join(",")];

  for (const week of weeks) {
    for (const day of week.days) {
      lines.push(
        [
          week.weekIndex,
          week.weekStart,
          week.phase,
          week.weeklyMiles,
          day.date ?? "",
          day.day,
          day.focus,
          day.title,
          day.detail,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadTrainingPlanCsv(
  weeks: PlanWeek[],
  filename = "training-plan.csv",
): void {
  const csv = trainingPlanToCsv(weeks);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
