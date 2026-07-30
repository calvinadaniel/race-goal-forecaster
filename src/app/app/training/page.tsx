"use client";

import {
  CalendarRange,
  Download,
  Flag,
  Moon,
  Mountain,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlanDayCard } from "@/components/PlanDayCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading, SurfaceCard } from "@/components/ui-surface";
import { downloadTrainingPlanCsv } from "@/lib/export-training-plan";
import { useForecastData } from "@/lib/use-forecast";

const FOCUS_META: Record<
  string,
  { label: string; icon: typeof Zap; className: string }
> = {
  easy: {
    label: "Easy",
    icon: Sparkles,
    className: "bg-secondary text-secondary-foreground",
  },
  optional: {
    label: "Optional",
    icon: Sparkles,
    className: "bg-secondary text-secondary-foreground",
  },
  quality: {
    label: "Quality",
    icon: Zap,
    className: "bg-primary text-primary-foreground",
  },
  long: {
    label: "Long",
    icon: Mountain,
    className: "bg-[var(--pine)] text-[#fff7ef]",
  },
  rest: {
    label: "Rest",
    icon: Moon,
    className: "bg-muted text-muted-foreground",
  },
  race: {
    label: "Race",
    icon: Flag,
    className: "bg-primary text-primary-foreground",
  },
};

export default function TrainingPage() {
  const { data, error } = useForecastData();

  if (error) {
    return (
      <AppShell>
        <main className="container app-page">
          <p className="text-destructive">{error}</p>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <main className="container app-page space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-40 rounded-xl" />
        </main>
      </AppShell>
    );
  }

  const plan = data.forecast.trainingPlan;
  const weeks = plan?.weeks ?? [];

  const exportCsv = () => {
    if (!plan || weeks.length === 0) return;
    downloadTrainingPlanCsv(
      weeks,
      `training-plan-${plan.startDate ?? "export"}-to-${plan.endDate ?? "race"}.csv`,
    );
  };

  return (
    <AppShell
      headerAction={
        plan && !data.forecast.needsBaseline && weeks.length > 0 ? (
          <Button
            variant="outline"
            className="landing__btn h-10 rounded-xl font-bold"
            type="button"
            onClick={exportCsv}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        ) : undefined
      }
    >
      <main className="container app-page">
        <p className="eyebrow">Training</p>
        <h1 className="display mt-1 mb-3 text-[clamp(2rem,6vw,3rem)]">
          Full plan to race day
        </h1>

        {!plan || data.forecast.needsBaseline ? (
          <SurfaceCard>
            <CardContent>
              <p className="m-0">
                Set a goal with enough history to unlock a training plan through race day.
              </p>
            </CardContent>
          </SurfaceCard>
        ) : (
          <>
            <div className="plan-toolbar">
              <p className="muted m-0 max-w-xl leading-relaxed">
                {plan.startDate} → {plan.endDate} · {weeks.length} week
                {weeks.length === 1 ? "" : "s"} · goal pace {plan.goalPacePerMi} ·{" "}
                {plan.runsPerWeek} runs/week pattern
              </p>
              <Button
                className="landing__btn h-10 rounded-xl font-bold"
                type="button"
                onClick={exportCsv}
              >
                <Download className="size-4" />
                Export training plan
              </Button>
            </div>

            <div className="plan-full">
              {weeks.map((week) => (
                <section key={week.weekStart} className="plan-full__week">
                  <header className="plan-full__head">
                    <SectionHeading
                      icon={CalendarRange}
                      title={`Week ${week.weekIndex}`}
                      tone="pine"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {week.phase}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        starts {week.weekStart}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        ~{week.weeklyMiles} mi
                      </Badge>
                    </div>
                  </header>
                  <div className="plan-week">
                    {week.days.map((d) => {
                      const focus = FOCUS_META[d.focus] ?? FOCUS_META.easy;
                      return (
                        <PlanDayCard
                          key={`${d.day}-${d.date ?? d.title}`}
                          day={d}
                          focusMeta={focus}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <ul className="muted mt-5 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {plan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
