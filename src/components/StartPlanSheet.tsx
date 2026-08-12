"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { POSTURE_LABELS, type Intensity } from "@/lib/forecast/postures";
import { isoDate, normalizeToMonday } from "@/lib/plan-start";
import { cn } from "@/lib/utils";

export type StartPlanGoal = {
  distanceKey: string;
  targetTimeSec: number;
  raceDate: string;
  intensity: string;
  planStartMonday?: string | null;
  manualBaseline?: {
    distanceKey: string;
    timeSec: number;
    date: string;
  } | null;
};

function defaultMondayIso(): string {
  return isoDate(normalizeToMonday(new Date()));
}

export function StartPlanSheet({
  open,
  onOpenChange,
  goal,
  units,
  mode = "start",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: StartPlanGoal;
  units: string;
  mode?: "start" | "reschedule";
  onSaved: () => void | Promise<void>;
}) {
  const [intensity, setIntensity] = useState<Intensity>(
    (goal.intensity as Intensity) || "balanced",
  );
  const [monday, setMonday] = useState(
    goal.planStartMonday || defaultMondayIso(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setIntensity((goal.intensity as Intensity) || "balanced");
    setMonday(goal.planStartMonday || defaultMondayIso());
    setError(null);
  }, [open, goal.intensity, goal.planStartMonday]);

  function onMondayChange(raw: string) {
    if (!raw) {
      setMonday(raw);
      return;
    }
    const [y, m, d] = raw.split("-").map(Number);
    const snapped = normalizeToMonday(new Date(y, m - 1, d));
    setMonday(isoDate(snapped));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKey: goal.distanceKey,
          targetTimeSec: goal.targetTimeSec,
          raceDate: goal.raceDate,
          intensity,
          planStartMonday: monday,
          manualBaseline: goal.manualBaseline
            ? {
                distanceKey: goal.manualBaseline.distanceKey,
                timeSec: goal.manualBaseline.timeSec,
                date: goal.manualBaseline.date,
              }
            : null,
          units,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Could not start plan",
        );
      }
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start plan");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">
            {mode === "reschedule" ? "Reschedule plan" : "Start plan"}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Choose posture and which Monday is Week 1. After you start, the plan
            advances with the calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="eyebrow m-0">Posture</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(POSTURE_LABELS) as Intensity[]).map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant={intensity === id ? "default" : "outline"}
                  className="landing__btn h-10 rounded-xl font-bold"
                  onClick={() => setIntensity(id)}
                >
                  {POSTURE_LABELS[id]}
                </Button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="eyebrow">Week 1 Monday</span>
            <input
              type="date"
              className={cn(
                "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm",
              )}
              value={monday}
              onChange={(e) => onMondayChange(e.target.value)}
            />
          </label>

          {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-bold"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="landing__btn rounded-xl font-bold"
            disabled={busy || !monday}
            onClick={() => void save()}
          >
            {busy
              ? "Saving…"
              : mode === "reschedule"
                ? "Save schedule"
                : "Start plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
