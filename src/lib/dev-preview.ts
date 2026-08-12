import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { goals, users } from "@/db/schema";
import { DISTANCES } from "@/lib/forecast/distances";

export const DEV_PREVIEW_EMAIL = "dev-preview@localhost";

export function isDevPreviewEnabled() {
  return process.env.AUTH_DEV_BYPASS === "1";
}

/** Ensure a local demo runner exists with a race goal + baseline. */
export async function ensureDevPreviewUser() {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_PREVIEW_EMAIL))
    .limit(1);

  let userId = existing?.id;
  if (!userId) {
    const [created] = await db
      .insert(users)
      .values({
        name: "Demo Runner",
        email: DEV_PREVIEW_EMAIL,
        units: "mi",
      })
      .returning();
    userId = created.id;
  }

  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .limit(1);

  if (!goal) {
    const raceDate = new Date();
    raceDate.setDate(raceDate.getDate() + 84);

    const baselineDate = new Date();
    baselineDate.setDate(baselineDate.getDate() - 60);

    await db.insert(goals).values({
      userId,
      distanceKey: "half",
      distanceM: DISTANCES.half.meters,
      targetTimeSec: 1 * 3600 + 45 * 60,
      raceDate,
      intensity: "balanced",
      manualBaseline: {
        distanceKey: "half",
        distanceM: DISTANCES.half.meters,
        timeSec: 1 * 3600 + 43 * 60 + 24,
        date: baselineDate.toISOString().slice(0, 10),
      },
    });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    id: userId,
    name: user?.name ?? "Demo Runner",
    email: user?.email ?? DEV_PREVIEW_EMAIL,
    image: user?.image ?? null,
  };
}
