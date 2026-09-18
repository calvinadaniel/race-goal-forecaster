import type { CliStravaTicketPayload } from "@/db/schema";
import { hasActivityReadAll } from "./scope";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const DEFAULT_REFRESH_SCOPE = "activity:read_all";

type StravaTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  athlete?: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

export function cliCallbackUrl(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/api/cli/strava/callback`;
}

async function postStravaToken(
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<Response> {
  return fetchImpl(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

async function parseTokenResponse(
  resp: Response,
): Promise<StravaTokenResponse | null> {
  try {
    const data: unknown = await resp.json();
    if (typeof data !== "object" || data === null) {
      return null;
    }
    return data as StravaTokenResponse;
  } catch {
    return null;
  }
}

export async function exchangeCliCode(args: {
  code: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; payload: CliStravaTicketPayload }
  | { ok: false; error: "http" | "scope" | "athlete" }
> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const clientId = process.env.AUTH_STRAVA_ID;
  const clientSecret = process.env.AUTH_STRAVA_SECRET;

  if (!clientId || !clientSecret) {
    return { ok: false, error: "http" };
  }

  const resp = await postStravaToken(
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
    },
    fetchImpl,
  );

  if (!resp.ok) {
    return { ok: false, error: "http" };
  }

  const data = await parseTokenResponse(resp);
  if (!data) {
    return { ok: false, error: "http" };
  }

  if (!hasActivityReadAll(data.scope)) {
    return { ok: false, error: "scope" };
  }

  if (
    !data.athlete ||
    typeof data.athlete.id !== "number" ||
    !data.access_token ||
    !data.refresh_token ||
    typeof data.expires_at !== "number"
  ) {
    return { ok: false, error: "athlete" };
  }

  return {
    ok: true,
    payload: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      scope: data.scope!,
      athlete: {
        id: data.athlete.id,
        username: data.athlete.username,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
      },
    },
  };
}

export async function refreshCliToken(args: {
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; payload: Omit<CliStravaTicketPayload, "athlete"> }
  | { ok: false; status: number }
> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const clientId = process.env.AUTH_STRAVA_ID!;
  const clientSecret = process.env.AUTH_STRAVA_SECRET!;

  const resp = await postStravaToken(
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: args.refreshToken,
    },
    fetchImpl,
  );

  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }

  const data = await parseTokenResponse(resp);
  if (!data) {
    return { ok: false, status: 502 };
  }

  if (
    !data.access_token ||
    !data.refresh_token ||
    typeof data.expires_at !== "number"
  ) {
    return { ok: false, status: 502 };
  }

  const scope = data.scope ?? DEFAULT_REFRESH_SCOPE;

  return {
    ok: true,
    payload: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      scope,
    },
  };
}
