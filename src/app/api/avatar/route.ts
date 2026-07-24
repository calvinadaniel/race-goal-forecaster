import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizeAthleteImageUrl } from "@/lib/strava";
import { refreshStravaProfile } from "@/lib/strava-profile";

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

  let imageUrl = normalizeAthleteImageUrl(user?.image);

  if (!imageUrl) {
    try {
      const refreshed = await refreshStravaProfile(session.user.id);
      imageUrl = refreshed.image;
    } catch {
      return new NextResponse("No avatar", { status: 404 });
    }
  }

  if (!imageUrl) {
    return new NextResponse("No avatar", { status: 404 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: { "User-Agent": "race-goal-forecaster/1.0" },
      cache: "force-cache",
    });
    if (!upstream.ok || !upstream.body) {
      // Stale URL — refresh from Strava once
      const refreshed = await refreshStravaProfile(session.user.id);
      if (!refreshed.image) {
        return new NextResponse("No avatar", { status: 404 });
      }
      const retry = await fetch(refreshed.image, {
        headers: { "User-Agent": "race-goal-forecaster/1.0" },
      });
      if (!retry.ok || !retry.body) {
        return new NextResponse("Avatar fetch failed", { status: 502 });
      }
      return new NextResponse(retry.body, {
        headers: {
          "Content-Type": retry.headers.get("Content-Type") ?? "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
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
