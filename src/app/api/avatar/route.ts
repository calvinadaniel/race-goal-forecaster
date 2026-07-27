import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizeAthleteImageUrl } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const [user] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const imageUrl =
    normalizeAthleteImageUrl(user?.image) ??
    normalizeAthleteImageUrl(session.user.image);

  if (!imageUrl) {
    return new NextResponse("No avatar", { status: 404 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        "User-Agent": "race-goal-forecaster/1.0",
        // Google profile photos often require this
        Referer: "https://race-goal-forecaster.vercel.app/",
      },
      cache: "force-cache",
    });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Avatar fetch failed", { status: 502 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Avatar fetch failed", { status: 502 });
  }
}
