import { NextResponse } from "next/server";
import { refreshCliToken } from "@/lib/cli-strava/oauth";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(req: Request): boolean {
  const now = Date.now();
  const ip = clientIp(req);
  const current = requestsByIp.get(ip);
  if (!current || current.resetAt <= now) {
    requestsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

export async function POST(req: Request) {
  // Best-effort only: serverless isolates do not share this in-memory map.
  if (isRateLimited(req)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

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
    const status = refreshed.status >= 400 && refreshed.status < 500
      ? 401
      : refreshed.status === 500
        ? 500
        : 502;
    return NextResponse.json({ error: "Token refresh failed" }, { status });
  }

  return NextResponse.json(refreshed.payload);
}
