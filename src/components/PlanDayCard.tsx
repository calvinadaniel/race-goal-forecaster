"use client";

import { type ComponentType } from "react";
import { CircleHelp } from "lucide-react";
import { AnnotatableText } from "@/components/AnnotatableText";
import { useTermHelp } from "@/components/TermHelpProvider";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurfaceCard } from "@/components/ui-surface";
import { FOCUS_TERM_IDS } from "@/lib/training/glossary";
import { cn } from "@/lib/utils";

type Day = {
  day: string;
  date?: string;
  focus: string;
  title: string;
  detail: string;
};

/** Pull the lead mileage out of plan copy so the card can feature it. */
function splitPlanMileage(detail: string): {
  miles: string | null;
  coaching: string;
} {
  const lead = detail.match(/^(\d+(?:\.\d+)?)\s*mi\b(?:\s*[;,—–-]\s*|\s+)?/i);
  if (lead) {
    const coaching = detail.slice(lead[0].length).trim();
    return {
      miles: lead[1],
      coaching: coaching || detail,
    };
  }
  const embedded = detail.match(/(\d+(?:\.\d+)?)\s*mi\b/i);
  if (embedded) {
    return { miles: embedded[1], coaching: detail };
  }
  return { miles: null, coaching: detail };
}

export function PlanDayCard({
  day,
  focusMeta,
  className,
}: {
  day: Day;
  focusMeta: {
    label: string;
    className: string;
    icon?: ComponentType<{ className?: string }>;
  };
  className?: string;
}) {
  const { openTerm } = useTermHelp();
  const termId = FOCUS_TERM_IDS[day.focus];
  const Icon = focusMeta.icon;
  const { miles, coaching } = splitPlanMileage(day.detail);

  return (
    <SurfaceCard
      className={cn("plan-day gap-3 py-5", `plan-day--${day.focus}`, className)}
    >
      <CardHeader className="gap-2.5 px-5 pb-0">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow m-0">
            {day.day}
            {day.date ? ` · ${day.date.slice(5)}` : ""}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0"
            onClick={() => termId && openTerm(termId)}
            aria-label={`What does ${focusMeta.label} mean?`}
          >
            <Badge className={cn("rounded-full px-2.5 py-0.5", focusMeta.className)}>
              {Icon ? <Icon className="size-3" /> : null}
              {focusMeta.label}
            </Badge>
            {termId ? <CircleHelp className="size-3.5 text-muted-foreground" /> : null}
          </button>
        </div>
        {miles ? (
          <p className="plan-day__miles m-0" aria-label={`${miles} miles`}>
            <span className="plan-day__miles-value">{miles}</span>
            <span className="plan-day__miles-unit">mi</span>
          </p>
        ) : null}
        <CardTitle className="plan-day__title text-lg">
          <AnnotatableText text={day.title} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pt-0">
        <div className="muted text-sm leading-relaxed">
          <AnnotatableText text={coaching} />
        </div>
      </CardContent>
    </SurfaceCard>
  );
}
