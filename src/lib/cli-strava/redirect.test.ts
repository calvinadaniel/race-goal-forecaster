import { describe, expect, it } from "vitest";
import {
  loopbackRedirectFromPort,
  parseLoopbackRedirect,
  parseStartLoopback,
} from "./redirect";

describe("parseLoopbackRedirect", () => {
  it("accepts 127.0.0.1 callback URLs", () => {
    const r = parseLoopbackRedirect("http://127.0.0.1:47831/callback");
    expect(r).toEqual({ ok: true, url: "http://127.0.0.1:47831/callback", port: 47831 });
  });

  it("rejects localhost, https, extra path, and open redirects", () => {
    expect(parseLoopbackRedirect("http://localhost:47831/callback").ok).toBe(false);
    expect(parseLoopbackRedirect("https://127.0.0.1:47831/callback").ok).toBe(false);
    expect(parseLoopbackRedirect("http://127.0.0.1:47831/callback/extra").ok).toBe(false);
    expect(parseLoopbackRedirect("http://evil.example/callback").ok).toBe(false);
    expect(parseLoopbackRedirect(null).ok).toBe(false);
  });
});

describe("loopbackRedirectFromPort", () => {
  it("builds a 127.0.0.1 callback URL from a port", () => {
    expect(loopbackRedirectFromPort("5555")).toEqual({
      ok: true,
      url: "http://127.0.0.1:5555/callback",
      port: 5555,
    });
  });

  it("rejects missing, non-numeric, and out-of-range ports", () => {
    expect(loopbackRedirectFromPort(null).ok).toBe(false);
    expect(loopbackRedirectFromPort("abc").ok).toBe(false);
    expect(loopbackRedirectFromPort("0").ok).toBe(false);
    expect(loopbackRedirectFromPort("65536").ok).toBe(false);
  });
});

describe("parseStartLoopback", () => {
  it("prefers port over a redirect URL so production can omit 127.0.0.1 from the query", () => {
    const url = new URL(
      "https://app.example/api/cli/strava/start?port=5555&redirect=https://evil.test&nonce=n",
    );
    expect(parseStartLoopback(url)).toEqual({
      ok: true,
      url: "http://127.0.0.1:5555/callback",
      port: 5555,
    });
  });
});
