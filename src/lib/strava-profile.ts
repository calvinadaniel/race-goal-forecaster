import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  athleteDisplayName,
  athleteImageUrl,
  fetchStravaAthlete,
  getValidStravaToken,
  normalizeAthleteImageUrl,
} from "@/lib/strava";

export async function refreshStravaProfile(userId: string): Promise<{
  name: string | null;
  image: string | null;
}> {
  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!account) {
    const [user] = await db
      .select({ name: users.name, image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return {
      name: user?.name ?? null,
      image: normalizeAthleteImageUrl(user?.image),
    };
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
      .where(eq(accounts.userId, userId));
  }

  const athlete = await fetchStravaAthlete(token.accessToken);
  const image = athleteImageUrl(athlete);
  const name = athleteDisplayName(athlete);

  await db
    .update(users)
    .set({
      ...(image ? { image } : { image: null }),
      ...(name ? { name } : {}),
    })
    .where(eq(users.id, userId));

  return { name, image };
}
