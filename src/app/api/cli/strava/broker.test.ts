import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signState, verifyState } from "@/lib/cli-strava/state";

const { exchangeCliCode, refreshCliToken, insertTicket, redeemTicket } = vi.hoisted(
  () => ({
    exchangeCliCode: vi.fn(),
    refreshCliToken: vi.fn(),
    insertTicket: vi.fn(),
    redeemTicket: vi.fn(),
  }),
);

vi.mock("@/lib/cli-strava/oauth", () => ({
  cliCallbackUrl: (origin: string) =>
    `${origin.replace(/\/+$/, "")}/api/cli/strava/callback`,
  exchangeCliCode,
  refreshCliToken,
}));

vi.mock("@/lib/cli-strava/tickets", () => ({
  ticketStore: {
    insertTicket,
    redeemTicket,
  },
}));

const secret = "s".repeat(32);
const redirect = "http://127.0.0.1:5555/callback";
const payload = {
  access_token: "at",
  refresh_token: "rt",
  expires_at: 1,
  scope: "activity:read_all",
  athlete: { id: 1 },
};

describe("Strava CLI broker routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("AUTH_STRAVA_ID", "cid");
    vi.stubEnv("AUTH_URL", "https://app.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("GET start", () => {
    it("rejects a non-loopback redirect", async () => {
      const { GET } = await import("./start/route");
      const res = await GET(
        new Request(
          "https://app.example/api/cli/strava/start?redirect=https://evil.test",
        ),
      );

      expect(res.status).toBe(400);
    });

    it.each(["AUTH_SECRET", "AUTH_STRAVA_ID"] as const)(
      "returns 500 when %s is missing",
      async (name) => {
        vi.stubEnv(name, "");
        const { GET } = await import("./start/route");
        const res = await GET(
          new Request(
            `https://app.example/api/cli/strava/start?redirect=${encodeURIComponent(redirect)}`,
          ),
        );

        expect(res.status).toBe(500);
      },
    );

    it("302s to Strava with the exact OAuth parameters and signed state", async () => {
      const before = Math.floor(Date.now() / 1000);
      const { GET } = await import("./start/route");
      const res = await GET(
        new Request(
          `https://request.example/api/cli/strava/start?redirect=${encodeURIComponent(redirect)}`,
        ),
      );
      const after = Math.floor(Date.now() / 1000);

      expect(res.status).toBe(302);
      const location = new URL(res.headers.get("location")!);
      expect(`${location.origin}${location.pathname}`).toBe(
        "https://www.strava.com/oauth/authorize",
      );
      expect(Object.fromEntries(location.searchParams)).toMatchObject({
        client_id: "cid",
        response_type: "code",
        redirect_uri: "https://app.example/api/cli/strava/callback",
        approval_prompt: "auto",
        scope: "activity:read_all",
      });
      const state = verifyState(location.searchParams.get("state")!, secret);
      expect(state?.redirect).toBe(redirect);
      expect(state?.nonce).toBeTruthy();
      expect(state?.exp).toBeGreaterThanOrEqual(before + 600);
      expect(state?.exp).toBeLessThanOrEqual(after + 600);
    });

    it("uses the request origin for the callback when AUTH_URL is unset", async () => {
      vi.stubEnv("AUTH_URL", "");
      const { GET } = await import("./start/route");
      const res = await GET(
        new Request(
          `https://request.example/api/cli/strava/start?redirect=${encodeURIComponent(redirect)}`,
        ),
      );

      const location = new URL(res.headers.get("location")!);
      expect(location.searchParams.get("redirect_uri")).toBe(
        "https://request.example/api/cli/strava/callback",
      );
    });
  });

  describe("GET callback", () => {
    function callbackRequest(query: Record<string, string>) {
      const url = new URL("https://app.example/api/cli/strava/callback");
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
      return new Request(url);
    }

    function validState() {
      return signState(
        {
          redirect,
          nonce: "nonce",
          exp: Math.floor(Date.now() / 1000) + 600,
        },
        secret,
      );
    }

    it("returns the authorization failure page for an OAuth error", async () => {
      const { GET } = await import("./callback/route");
      const res = await GET(callbackRequest({ error: "access_denied" }));

      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("Authorization failed");
    });

    it("returns the authorization failure page for invalid state", async () => {
      const { GET } = await import("./callback/route");
      const res = await GET(callbackRequest({ code: "code", state: "bad" }));

      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("Authorization failed");
      expect(exchangeCliCode).not.toHaveBeenCalled();
    });

    it.each(["scope", "http"] as const)(
      "returns the authorization failure page for an exchange %s failure",
      async (error) => {
        exchangeCliCode.mockResolvedValue({ ok: false, error });
        const { GET } = await import("./callback/route");
        const res = await GET(
          callbackRequest({ code: "code", state: validState() }),
        );

        expect(res.status).toBe(400);
        expect(await res.text()).toContain("Authorization failed");
        expect(insertTicket).not.toHaveBeenCalled();
      },
    );

    it("creates a ticket and redirects to the loopback callback", async () => {
      exchangeCliCode.mockResolvedValue({ ok: true, payload });
      insertTicket.mockResolvedValue("ticket-1");
      const { GET } = await import("./callback/route");
      const res = await GET(
        callbackRequest({ code: "code", state: validState() }),
      );

      expect(exchangeCliCode).toHaveBeenCalledWith({
        code: "code",
        redirectUri: "https://app.example/api/cli/strava/callback",
      });
      expect(insertTicket).toHaveBeenCalledWith(payload);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(`${redirect}?ticket=ticket-1`);
    });
  });

  describe("POST redeem", () => {
    it("returns 400 when the ticket is missing", async () => {
      const { POST } = await import("./redeem/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/redeem", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 when the ticket cannot be redeemed", async () => {
      redeemTicket.mockResolvedValue(null);
      const { POST } = await import("./redeem/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/redeem", {
          method: "POST",
          body: JSON.stringify({ ticket: "missing" }),
        }),
      );

      expect(res.status).toBe(404);
    });

    it("returns the redeemed token and athlete payload", async () => {
      redeemTicket.mockResolvedValue(payload);
      const { POST } = await import("./redeem/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/redeem", {
          method: "POST",
          body: JSON.stringify({ ticket: "ticket-1" }),
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(payload);
    });
  });

  describe("POST refresh", () => {
    it("returns 400 when the refresh token is missing", async () => {
      const { POST } = await import("./refresh/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/refresh", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("returns 401 when Strava returns a 4xx response", async () => {
      refreshCliToken.mockResolvedValue({ ok: false, status: 400 });
      const { POST } = await import("./refresh/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: "rt" }),
        }),
      );

      expect(res.status).toBe(401);
    });

    it("returns 502 when Strava returns a 5xx response", async () => {
      refreshCliToken.mockResolvedValue({ ok: false, status: 503 });
      const { POST } = await import("./refresh/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: "rt" }),
        }),
      );

      expect(res.status).toBe(502);
    });

    it("returns refreshed tokens and scope", async () => {
      const refreshed = {
        access_token: "new-at",
        refresh_token: "new-rt",
        expires_at: 2,
        scope: "activity:read_all",
      };
      refreshCliToken.mockResolvedValue({ ok: true, payload: refreshed });
      const { POST } = await import("./refresh/route");
      const res = await POST(
        new Request("https://app.example/api/cli/strava/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: "rt" }),
        }),
      );

      expect(refreshCliToken).toHaveBeenCalledWith({ refreshToken: "rt" });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(refreshed);
    });
  });
});
