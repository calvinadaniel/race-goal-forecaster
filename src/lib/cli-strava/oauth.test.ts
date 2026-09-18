import { afterEach, describe, expect, it } from "vitest";
import { cliCallbackUrl, exchangeCliCode, refreshCliToken } from "./oauth";

afterEach(() => {
  delete process.env.AUTH_STRAVA_ID;
  delete process.env.AUTH_STRAVA_SECRET;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cliCallbackUrl", () => {
  it("joins origin and callback path", () => {
    expect(cliCallbackUrl("https://race-goal-forecaster.vercel.app")).toBe(
      "https://race-goal-forecaster.vercel.app/api/cli/strava/callback",
    );
  });
});

describe("exchangeCliCode", () => {
  it("maps a Strava token response into a ticket payload", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const fetchImpl: typeof fetch = async () =>
      jsonResponse({
        access_token: "at",
        refresh_token: "rt",
        expires_at: 42,
        scope: "read,activity:read_all",
        athlete: { id: 7, firstname: "Ada", lastname: "N", username: "ada" },
      });
    const result = await exchangeCliCode({
      code: "c",
      redirectUri: "https://example.com/api/cli/strava/callback",
      fetchImpl,
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        access_token: "at",
        refresh_token: "rt",
        expires_at: 42,
        scope: "read,activity:read_all",
        athlete: { id: 7, firstname: "Ada", lastname: "N", username: "ada" },
      },
    });
  });

  it("rejects missing activity:read_all", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await exchangeCliCode({
      code: "c",
      redirectUri: "https://example.com/api/cli/strava/callback",
      fetchImpl: async () =>
        jsonResponse({
          access_token: "at",
          refresh_token: "rt",
          expires_at: 42,
          scope: "activity:read",
          athlete: { id: 7 },
        }),
    });
    expect(result).toEqual({ ok: false, error: "scope" });
  });
});

describe("refreshCliToken", () => {
  it.each(["AUTH_STRAVA_ID", "AUTH_STRAVA_SECRET"] as const)(
    "returns 500 without calling Strava when %s is missing",
    async (missingName) => {
      process.env.AUTH_STRAVA_ID = "id";
      process.env.AUTH_STRAVA_SECRET = "secret";
      delete process.env[missingName];
      let called = false;

      const result = await refreshCliToken({
        refreshToken: "old",
        fetchImpl: async () => {
          called = true;
          return jsonResponse({});
        },
      });

      expect(result).toEqual({ ok: false, status: 500 });
      expect(called).toBe(false);
    },
  );

  it("returns rotated tokens", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await refreshCliToken({
      refreshToken: "old",
      fetchImpl: async () =>
        jsonResponse({
          access_token: "new-at",
          refresh_token: "new-rt",
          expires_at: 99,
          scope: "activity:read_all",
        }),
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        access_token: "new-at",
        refresh_token: "new-rt",
        expires_at: 99,
        scope: "activity:read_all",
      },
    });
  });

  it("surfaces HTTP status on failure", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await refreshCliToken({
      refreshToken: "old",
      fetchImpl: async () => jsonResponse({ message: "no" }, 400),
    });
    expect(result).toEqual({ ok: false, status: 400 });
  });

  it("rejects 200 responses missing token fields", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await refreshCliToken({
      refreshToken: "old",
      fetchImpl: async () => jsonResponse({ scope: "activity:read_all" }),
    });
    expect(result).toEqual({ ok: false, status: 502 });
  });

  it("rejects 200 responses with invalid JSON", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await refreshCliToken({
      refreshToken: "old",
      fetchImpl: async () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    expect(result).toEqual({ ok: false, status: 502 });
  });

  it("rejects 200 responses with null JSON", async () => {
    process.env.AUTH_STRAVA_ID = "id";
    process.env.AUTH_STRAVA_SECRET = "secret";
    const result = await refreshCliToken({
      refreshToken: "old",
      fetchImpl: async () =>
        new Response("null", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    expect(result).toEqual({ ok: false, status: 502 });
  });
});
