import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { activities, goals, users } from "@/db/schema";
import { computeForecast } from "@/lib/forecast/engine";
import type { DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import { weeklyVolumeFromActivities } from "@/lib/units";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, session.user.id))
    .limit(1);

  if (!goal) {
    return NextResponse.json({ error: "No goal set", needsGoal: true }, { status: 404 });
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
  }));

  const weeklyMiles = weeklyVolumeFromActivities(
    rows.map((r) => ({ startDate: r.startDate, distanceM: r.distanceM })),
  );

  const forecast = computeForecast({
    goalDistanceKey: goal.distanceKey as DistanceKey,
    goalDistanceM: goal.distanceM,
    targetTimeSec: goal.targetTimeSec,
    raceDate: goal.raceDate,
    intensity: goal.intensity as Intensity,
    efforts,
    weeklyMiles,
    manualBaseline: goal.manualBaseline as {
      distanceKey: DistanceKey;
      distanceM: number;
      timeSec: number;
      date: string;
    } | null,
  });

  const topEfforts = rows
    .slice()
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      name: r.name,
      date: r.startDate.toISOString().slice(0, 10),
      distanceM: r.distanceM,
      movingTimeSec: r.movingTimeSec,
      isRace: r.isRace,
    }));

  const year = new Date().getFullYear();
  const ytd = rows.filter((r) => r.startDate.getFullYear() === year);
  const ytdMeters = ytd.reduce((s, r) => s + r.distanceM, 0);
  const ytdSeconds = ytd.reduce((s, r) => s + r.movingTimeSec, 0);
  const ytdMiles = ytdMeters / 1609.34;
  const avgPaceSecPerMi =
    ytdMiles > 0.5 ? ytdSeconds / ytdMiles : null;

  const [user] = await db
    .select({ name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    goal: {
      distanceKey: goal.distanceKey,
      distanceM: goal.distanceM,
      targetTimeSec: goal.targetTimeSec,
      raceDate: goal.raceDate.toISOString().slice(0, 10),
      intensity: goal.intensity,
      manualBaseline: goal.manualBaseline,
    },
    forecast,
    strip: {
      weeklyMiles: weeklyMiles.slice(-12),
      topEfforts,
    },
    profile: {
      year,
      name: user?.name ?? session.user.name ?? null,
      image: user?.image ?? session.user.image ?? null,
      ytdMiles,
      avgPaceSecPerMi,
      racesCompleted: ytd.filter((r) => r.isRace).length,
      activityCount: ytd.length,
    },
  });
}
