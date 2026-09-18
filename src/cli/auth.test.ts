import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiBase,
  ensureFreshCredentials,
  loginWithLoopback,
} from "./auth";
import { readCredentials, writeCredentials } from "./store";

const credentials = {
  access_token: "at",
  refresh_token: "rt",
  expires_at: 99,
  scope: "activity:read_all",
  athlete: { id: 5, firstname: "Ada" },
};

describe("CLI authentication", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "truepace-"));
    process.env.TRUEPACE_HOME = home;
    process.env.TRUEPACE_API = "https://app.example/";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRUEPACE_HOME;
    delete process.env.TRUEPACE_API;
  });

  it("normalizes the configured API base", () => {
    expect(apiBase()).toBe("https://app.example");
  });

  it("redeems a ticket and writes credentials", async () => {
    const opened: string[] = [];
    const close = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const creds = await loginWithLoopback({
      openBrowser: (url) => opened.push(url),
      timeoutMs: 1000,
      listen: async (onTicket) => {
        setTimeout(() => {
          const nonce = new URL(opened[0]).searchParams.get("nonce")!;
          onTicket("t1", nonce);
        }, 0);
        return { port: 5555, close };
      },
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe(
          "https://app.example/api/cli/strava/redeem",
        );
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ ticket: "t1" }));
        return new Response(JSON.stringify(credentials), { status: 200 });
      },
    });

    expect(opened[0]).toContain(
      "redirect=http%3A%2F%2F127.0.0.1%3A5555%2Fcallback",
    );
    expect(opened[0]).toContain("&nonce=");
    expect(console.log).toHaveBeenCalledWith(
      `Open this if your browser didn't launch: ${opened[0]}`,
    );
    expect(creds.athlete.id).toBe(5);
    expect(readCredentials()?.access_token).toBe("at");
    expect(close).toHaveBeenCalledOnce();
  });

  it("refreshes expired credentials and rewrites the file", async () => {
    writeCredentials(credentials);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        expect(String(input)).toBe(
          "https://app.example/api/cli/strava/refresh",
        );
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ refresh_token: "rt" }));
        return new Response(
          JSON.stringify({
            access_token: "new-at",
            refresh_token: "new-rt",
            expires_at: 5000,
          }),
          { status: 200 },
        );
      }),
    );

    const refreshed = await ensureFreshCredentials(100);

    expect(refreshed.access_token).toBe("new-at");
    expect(refreshed.athlete.id).toBe(5);
    expect(readCredentials()?.refresh_token).toBe("new-rt");
  });

  it("clears credentials when refresh is rejected", async () => {
    writeCredentials(credentials);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(ensureFreshCredentials(100)).rejects.toThrow(
      "Token refresh failed",
    );
    expect(readCredentials()).toBeNull();
  });

  it("keeps credentials when refresh has a server error", async () => {
    writeCredentials(credentials);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );

    await expect(ensureFreshCredentials(100)).rejects.toThrow(
      "Token refresh failed (502)",
    );
    expect(readCredentials()).toEqual(credentials);
  });

  it("ignores a loopback ticket with a mismatched nonce", async () => {
    const fetchImpl = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      loginWithLoopback({
        openBrowser: vi.fn(),
        timeoutMs: 5,
        listen: async (onTicket) => {
          queueMicrotask(() => onTicket("attacker-ticket", "wrong-nonce"));
          return { port: 5555, close: vi.fn() };
        },
        fetchImpl,
      }),
    ).rejects.toThrow("Login timed out");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
