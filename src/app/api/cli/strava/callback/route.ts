import { NextResponse } from "next/server";
import { cliCallbackUrl, exchangeCliCode } from "@/lib/cli-strava/oauth";
import { parseLoopbackRedirect } from "@/lib/cli-strava/redirect";
import { verifyState } from "@/lib/cli-strava/state";
import { ticketStore } from "@/lib/cli-strava/tickets";

function authorizationFailed() {
  return new NextResponse("<h2>Authorization failed</h2>", {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  if (requestUrl.searchParams.has("error")) {
    return authorizationFailed();
  }

  const secret = process.env.AUTH_SECRET;
  const rawState = requestUrl.searchParams.get("state");
  if (!secret || !rawState) {
    return authorizationFailed();
  }

  const state = verifyState(rawState, secret);
  if (!state) {
    return authorizationFailed();
  }

  const redirectUri = cliCallbackUrl(
    process.env.AUTH_URL || requestUrl.origin,
  );
  const exchange = await exchangeCliCode({
    code: requestUrl.searchParams.get("code") ?? "",
    redirectUri,
  });
  if (!exchange.ok) {
    return authorizationFailed();
  }

  const redirect = parseLoopbackRedirect(state.redirect);
  if (!redirect.ok) {
    return authorizationFailed();
  }
  const ticket = await ticketStore.insertTicket(exchange.payload);
  const loopbackUrl = new URL(redirect.url);
  loopbackUrl.searchParams.set("ticket", ticket);
  loopbackUrl.searchParams.set("nonce", state.nonce);
  return NextResponse.redirect(loopbackUrl, 302);
}
