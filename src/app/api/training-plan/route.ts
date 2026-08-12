import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { activities, goals } from "@/db/schema";
import { computeForecast } from "@/lib/forecast/engine";
import type { DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import { weeklyVolumeFromActivities } from "@/lib/units";

const INTENSITIES = new Set(["conservative", "balanced", "aggressive"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("intensity");
  if (!raw || !INTENSITIES.has(raw)) {
    return NextResponse.json(
      { error: "intensity must be conservative|balanced|aggressive" },
      { status: 400 },
    );
  }
  const intensity = raw as Intensity;

  const db = getDb();
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, session.user.id))
    .limit(1);

  if (!goal) {
    return NextResponse.json({ error: "No goal set" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, session.user.id));

  const efforts = rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.startDate,
    distanceM: r.distanceM,
    movingTimeSec: r.movingTimeSec,
    isRace: r.isRace,
    workoutType: r.workoutType,
  }));

  const weeklyMiles = weeklyVolumeFromActivities(
    rows.map((r) => ({ startDate: r.startDate, distanceM: r.distanceM })),
  );

  const forecast = computeForecast({
    goalDistanceKey: goal.distanceKey as DistanceKey,
    goalDistanceM: goal.distanceM,
    targetTimeSec: goal.targetTimeSec,
    raceDate: goal.raceDate,
    intensity,
    efforts,
    weeklyMiles,
    manualBaseline: goal.manualBaseline as {
      distanceKey: DistanceKey;
      distanceM: number;
      timeSec: number;
      date: string;
    } | null,
    planStartMonday: goal.planStartMonday ?? null,
  });

  if (forecast.needsBaseline || !forecast.trainingPlan) {
    return NextResponse.json(
      { error: "Plan unavailable", needsBaseline: forecast.needsBaseline },
      { status: 404 },
    );
  }

  return NextResponse.json({
    intensity,
    savedIntensity: goal.intensity,
    plan: forecast.trainingPlan,
  });
}
