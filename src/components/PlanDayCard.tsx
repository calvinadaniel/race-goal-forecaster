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

  return (
    <SurfaceCard className={cn("plan-day gap-2 py-3", `plan-day--${day.focus}`, className)}>
      <CardHeader className="gap-2 px-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow m-0">
            {day.day}
            {day.date ? ` · ${day.date.slice(5)}` : ""}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
            onClick={() => termId && openTerm(termId)}
            aria-label={`What does ${focusMeta.label} mean?`}
          >
            <Badge className={cn("rounded-full", focusMeta.className)}>
              {Icon ? <Icon className="size-3" /> : null}
              {focusMeta.label}
            </Badge>
            {termId ? <CircleHelp className="size-3.5 text-muted-foreground" /> : null}
          </button>
        </div>
        <CardTitle className="display text-lg">
          <AnnotatableText text={day.title} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <div className="muted text-sm leading-snug">
          <AnnotatableText text={day.detail} />
        </div>
      </CardContent>
    </SurfaceCard>
  );
}
