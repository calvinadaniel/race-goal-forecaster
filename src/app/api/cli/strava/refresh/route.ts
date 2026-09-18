import { NextResponse } from "next/server";
import { refreshCliToken } from "@/lib/cli-strava/oauth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Missing refresh token" },
      { status: 400 },
    );
  }

  const refreshToken =
    typeof body === "object" &&
    body !== null &&
    "refresh_token" in body &&
    typeof body.refresh_token === "string"
      ? body.refresh_token
      : null;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Missing refresh token" },
      { status: 400 },
    );
  }

  const refreshed = await refreshCliToken({ refreshToken });
  if (!refreshed.ok) {
    const status =
      refreshed.status >= 400 && refreshed.status < 500 ? 401 : 502;
    return NextResponse.json({ error: "Token refresh failed" }, { status });
  }

  return NextResponse.json(refreshed.payload);
}
