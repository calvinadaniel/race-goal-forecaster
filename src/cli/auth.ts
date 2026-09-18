import { spawn } from "node:child_process";
import { parseLoopbackRedirect } from "@/lib/cli-strava/redirect";
import {
  clearCredentials,
  readCredentials,
  writeCredentials,
  type CliCredentials,
} from "./store";

const DEFAULT_API_BASE = "https://race-goal-forecaster.vercel.app";

export type LoginDeps = {
  openBrowser: (url: string) => void;
  fetchImpl: typeof fetch;
  listen: (
    handler: (ticket: string) => void,
  ) => Promise<{ port: number; close: () => void }>;
  timeoutMs?: number;
};

export function apiBase(): string {
  return (process.env.TRUEPACE_API ?? DEFAULT_API_BASE).replace(/\/+$/, "");
}

export async function loginWithLoopback(
  deps: LoginDeps,
): Promise<CliCredentials> {
  let receiveTicket!: (ticket: string) => void;
  const ticketPromise = new Promise<string>((resolve) => {
    receiveTicket = resolve;
  });
  const listener = await deps.listen(receiveTicket);
  const redirect = `http://127.0.0.1:${listener.port}/callback`;
  if (!parseLoopbackRedirect(redirect).ok) {
    listener.close();
    throw new Error("Invalid loopback redirect");
  }

  deps.openBrowser(
    `${apiBase()}/api/cli/strava/start?redirect=${encodeURIComponent(redirect)}`,
  );

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const ticket = await Promise.race([
      ticketPromise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Login timed out. Run login again.")),
          deps.timeoutMs ?? 120_000,
        );
      }),
    ]);
    const response = await deps.fetchImpl(
      `${apiBase()}/api/cli/strava/redeem`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      },
    );
    if (!response.ok) {
      throw new Error("Ticket expired or already used. Run login again.");
    }
    const credentials = (await response.json()) as CliCredentials;
    writeCredentials(credentials);
    return credentials;
  } finally {
    if (timeout) clearTimeout(timeout);
    listener.close();
  }
}

export async function ensureFreshCredentials(
  nowSec = Math.floor(Date.now() / 1000),
): Promise<CliCredentials> {
  const credentials = readCredentials();
  if (!credentials) {
    throw new Error("No saved credentials");
  }
  if (credentials.expires_at > nowSec + 60) {
    return credentials;
  }

  const response = await fetch(`${apiBase()}/api/cli/strava/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: credentials.refresh_token }),
  });
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      clearCredentials();
    }
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const refreshed = (await response.json()) as Pick<
    CliCredentials,
    "access_token" | "refresh_token" | "expires_at"
  >;
  const updated = { ...credentials, ...refreshed };
  writeCredentials(updated);
  return updated;
}

export function openSystemBrowser(url: string): void {
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
}
