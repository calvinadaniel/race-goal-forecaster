import type { ActivitySource, NormalizedActivity } from "./activity-source";

type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  average_heartrate?: number;
  suffer_score?: number;
  workout_type?: number;
};

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
}> {
  const resp = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_STRAVA_ID!,
      client_secret: process.env.AUTH_STRAVA_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Strava token refresh failed: ${resp.status}`);
  }
  return resp.json();
}

export async function getValidStravaToken(account: {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  rotated: boolean;
}> {
  const now = Math.floor(Date.now() / 1000);
  if (
    account.access_token &&
    account.expires_at &&
    account.expires_at > now + 60
  ) {
    return {
      accessToken: account.access_token,
      refreshToken: account.refresh_token!,
      expiresAt: account.expires_at,
      rotated: false,
    };
  }
  if (!account.refresh_token) {
    throw new Error("Missing Strava refresh token");
  }
  const tokens = await refreshAccessToken(account.refresh_token);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_at,
    rotated: true,
  };
}

export type StravaAthleteProfile = {
  id: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  profile_medium?: string;
};

/** Strava returns relative "avatar/athlete/…" when there is no custom photo. */
export function normalizeAthleteImageUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    if (!url) continue;
    if (url.includes("avatar/athlete")) continue;
    if (url.startsWith("https://") || url.startsWith("http://")) return url;
  }
  return null;
}

export async function fetchStravaAthlete(
  accessToken: string,
): Promise<StravaAthleteProfile> {
  const resp = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`Strava athlete fetch failed: ${resp.status}`);
  }
  return resp.json();
}

export function athleteDisplayName(athlete: StravaAthleteProfile): string | null {
  const parts = [athlete.firstname, athlete.lastname].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function athleteImageUrl(athlete: StravaAthleteProfile): string | null {
  return normalizeAthleteImageUrl(athlete.profile, athlete.profile_medium);
}

export class StravaActivitySource implements ActivitySource {
  async listActivities(
    accessToken: string,
    since: Date,
  ): Promise<NormalizedActivity[]> {
    const after = Math.floor(since.getTime() / 1000);
    const out: NormalizedActivity[] = [];
    let page = 1;

    while (page <= 20) {
      const url = new URL("https://www.strava.com/api/v3/athlete/activities");
      url.searchParams.set("after", String(after));
      url.searchParams.set("per_page", "200");
      url.searchParams.set("page", String(page));

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) {
        throw new Error(`Strava activities fetch failed: ${resp.status}`);
      }
      const batch = (await resp.json()) as StravaActivity[];
      if (!batch.length) break;

      for (const a of batch) {
        const sport = a.sport_type || a.type || "";
        if (sport !== "Run") continue;
        if (a.distance < 100) continue;
        const workoutType = a.workout_type ?? null;
        const isRace = workoutType === 1;
        out.push({
          id: String(a.id),
          name: a.name ?? null,
          startDate: new Date(a.start_date_local),
          distanceM: a.distance,
          movingTimeSec: a.moving_time,
          avgHr: a.average_heartrate ?? null,
          sufferScore: a.suffer_score ?? null,
          isRace,
          workoutType,
        });
      }
      page += 1;
    }

    return out.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }
}

export const stravaSource = new StravaActivitySource();
