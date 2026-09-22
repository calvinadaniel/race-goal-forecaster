"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { isoDate } from "@/lib/plan-start";
import {
  findTodaySession,
  formatWeekdayDate,
} from "@/lib/today-session";
import { formatDuration } from "@/lib/units";
import { useForecastData, VERDICT_LABEL } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

function splitPlanMileage(detail: string): {
  miles: string | null;
  coaching: string;
} {
  const lead = detail.match(/^(\d+(?:\.\d+)?)\s*mi\b(?:\s*[;,—–-]\s*|\s+)?/i);
  if (lead) {
    return {
      miles: lead[1],
      coaching: detail.slice(lead[0].length).trim() || detail,
    };
  }
  const embedded = detail.match(/(\d+(?:\.\d+)?)\s*mi\b/i);
  if (embedded) {
    return { miles: embedded[1], coaching: detail };
  }
  return { miles: null, coaching: detail };
}

export default function TodayPage() {
  const { data, error } = useForecastData();
  const [todayIso, setTodayIso] = useState<string | null>(null);

  useEffect(() => {
    setTodayIso(isoDate(new Date()));
  }, []);

  if (error) {
    return (
      <main className="container app-page">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!data || !todayIso) {
    return (
      <main className="container app-page space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-20 w-full max-w-xl" />
      </main>
    );
  }

  const { forecast, goal } = data;
  const session = findTodaySession(forecast.trainingPlan);
  const { miles, coaching } = session
    ? splitPlanMileage(session.detail)
    : { miles: null, coaching: "" };
  const dateLabel = formatWeekdayDate(session?.date ?? todayIso);
  const projected = formatDuration(forecast.predictedTimeSec);
  const target = formatDuration(forecast.targetTimeSec);

  return (
    <main className="container app-page">
      <p className="today-date">{dateLabel}</p>

      {forecast.needsBaseline || !session ? (
        <div className="today-empty">
          <h1 className="display today-title">Set the race to unlock today.</h1>
          <p className="muted max-w-md leading-relaxed">
            Add a goal and a recent baseline. Then this screen shows the session
            you owe and whether the finish is still honest.
          </p>
          <Link href="/app/goal" className="btn btn-primary">
            Set goal
          </Link>
        </div>
      ) : (
        <article className="today-session">
          {miles ? (
            <p className="today-miles" aria-label={`${miles} miles`}>
              <span className="today-miles__value">{miles}</span>
              <span className="today-miles__unit">mi</span>
            </p>
          ) : null}

          <h1 className="display today-title">{session.title}</h1>

          <p className="today-coaching muted leading-relaxed">{coaching}</p>

          <Link
            href="/app/training"
            className="today-plan-link"
          >
            Full plan
          </Link>
        </article>
      )}

      {!forecast.needsBaseline ? (
        <Link
          href="/app/forecast"
          className={cn("today-status", `today-status--${forecast.verdict}`)}
        >
          <span className="today-status__verdict">
            {VERDICT_LABEL[forecast.verdict]}
          </span>
          <span className="today-status__times mono">
            Projected {projected}
            <span className="muted"> vs {target}</span>
          </span>
        </Link>
      ) : null}

      {goal.planStartMonday == null &&
      forecast.trainingPlan &&
      !forecast.needsBaseline ? (
        <p className="muted today-draft-note">
          Draft week —{" "}
          <Link href="/app/training" className="today-inline-link">
            start the plan
          </Link>{" "}
          to lock it to the calendar.
        </p>
      ) : null}
    </main>
  );
}
