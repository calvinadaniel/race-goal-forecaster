import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cliCallbackUrl } from "@/lib/cli-strava/oauth";
import { parseLoopbackRedirect } from "@/lib/cli-strava/redirect";
import { signState } from "@/lib/cli-strava/state";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const redirect = parseLoopbackRedirect(
    requestUrl.searchParams.get("redirect"),
  );
  if (!redirect.ok) {
    return NextResponse.json({ error: "Invalid redirect" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  const clientId = process.env.AUTH_STRAVA_ID;
  if (!secret || !clientId) {
    return NextResponse.json(
      { error: "OAuth is not configured" },
      { status: 500 },
    );
  }

  const redirectUri = cliCallbackUrl(process.env.AUTH_URL || requestUrl.origin);
  const state = signState(
    {
      redirect: redirect.url,
      nonce: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    secret,
  );
  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  }).toString();

  return NextResponse.redirect(authorizeUrl, 302);
}
