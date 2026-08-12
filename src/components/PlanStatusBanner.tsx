"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanStatusBanner({
  planStatus,
  currentWeekIndex,
  weeksOut,
  planStartMonday,
  phase,
  className,
  onStart,
  onReschedule,
  onBackToDraft,
  backToDraftBusy,
}: {
  planStatus: "draft" | "started";
  currentWeekIndex: number;
  weeksOut: number;
  planStartMonday?: string | null;
  phase?: string;
  className?: string;
  onStart: () => void;
  onReschedule: () => void;
  onBackToDraft: () => void;
  backToDraftBusy?: boolean;
}) {
  if (planStatus === "draft") {
    return (
      <div
        className={cn(
          "plan-status-banner plan-status-banner--draft flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="eyebrow m-0">Draft plan</p>
          <p className="muted m-0 text-sm leading-relaxed">
            Week 1 is this week until you start. Starting locks your Monday and
            posture so the plan follows the calendar.
          </p>
        </div>
        <Button
          type="button"
          className="landing__btn h-10 shrink-0 rounded-xl font-bold"
          onClick={onStart}
        >
          Start plan
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "plan-status-banner plan-status-banner--started flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="eyebrow m-0">
          Week {currentWeekIndex} of {weeksOut}
          {phase ? ` · ${phase}` : ""}
        </p>
        <p className="muted m-0 text-sm leading-relaxed">
          Started {planStartMonday ?? "—"}. Future weeks update if you change
          posture or race date; past weeks keep their numbers.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="landing__btn h-10 rounded-xl font-bold"
          onClick={onReschedule}
        >
          Reschedule
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl font-bold"
          disabled={backToDraftBusy}
          onClick={onBackToDraft}
        >
          Back to draft
        </Button>
      </div>
    </div>
  );
}
