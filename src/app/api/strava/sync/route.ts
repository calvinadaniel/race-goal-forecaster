import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, activities, users } from "@/db/schema";
import {
  athleteDisplayName,
  athleteImageUrl,
  fetchStravaAthlete,
  getValidStravaToken,
  stravaSource,
} from "@/lib/strava";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "No Strava account linked" }, { status: 400 });
  }

  const token = await getValidStravaToken(account);
  if (token.rotated) {
    await db
      .update(accounts)
      .set({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expires_at: token.expiresAt,
      })
      .where(eq(accounts.userId, session.user.id));
  }

  try {
    const athlete = await fetchStravaAthlete(token.accessToken);
    const image = athleteImageUrl(athlete);
    const name = athleteDisplayName(athlete);
    if (image || name) {
      await db
        .update(users)
        .set({
          ...(image ? { image } : {}),
          ...(name ? { name } : {}),
        })
        .where(eq(users.id, session.user.id));
    }
  } catch {
    // Profile photo/name is best-effort; activity sync should still proceed.
  }

  const since = new Date();
  since.setMonth(since.getMonth() - 18);

  const rows = await stravaSource.listActivities(token.accessToken, since);

  for (const a of rows) {
    await db
      .insert(activities)
      .values({
        id: a.id,
        userId: session.user.id,
        source: "strava",
        name: a.name,
        startDate: a.startDate,
        distanceM: a.distanceM,
        movingTimeSec: a.movingTimeSec,
        avgHr: a.avgHr,
        sufferScore: a.sufferScore,
        isRace: a.isRace,
        workoutType: a.workoutType,
      })
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          name: a.name,
          startDate: a.startDate,
          distanceM: a.distanceM,
          movingTimeSec: a.movingTimeSec,
          avgHr: a.avgHr,
          sufferScore: a.sufferScore,
          isRace: a.isRace,
          workoutType: a.workoutType,
        },
      });
  }

  return NextResponse.json({ synced: rows.length });
}
