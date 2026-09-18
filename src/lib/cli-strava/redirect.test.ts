import { describe, expect, it } from "vitest";
import { parseLoopbackRedirect } from "./redirect";

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
