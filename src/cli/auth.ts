import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
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
    handler: (ticket: string, nonce: string) => void,
  ) => Promise<{ port: number; close: () => void }>;
  timeoutMs?: number;
};

export function apiBase(): string {
  return (process.env.TRUEPACE_API ?? DEFAULT_API_BASE).replace(/\/+$/, "");
}

export async function loginWithLoopback(
  deps: LoginDeps,
): Promise<CliCredentials> {
  const nonce = randomUUID();
  let receiveTicket!: (ticket: string) => void;
  const ticketPromise = new Promise<string>((resolve) => {
    receiveTicket = resolve;
  });
  const listener = await deps.listen((ticket, callbackNonce) => {
    if (callbackNonce === nonce) {
      receiveTicket(ticket);
    }
  });
  const redirect = `http://127.0.0.1:${listener.port}/callback`;
  if (!parseLoopbackRedirect(redirect).ok) {
    listener.close();
    throw new Error("Invalid loopback redirect");
  }

  const authorizeUrl =
    `${apiBase()}/api/cli/strava/start?redirect=${encodeURIComponent(redirect)}` +
    `&nonce=${encodeURIComponent(nonce)}`;
  console.log(`Open this if your browser didn't launch: ${authorizeUrl}`);
  deps.openBrowser(authorizeUrl);

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
    if (response.status === 401) {
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

export function systemBrowserCommand(
  url: string,
  platform = process.platform,
): {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
} {
  if (platform === "win32") {
    // cmd's `start` splits on `&` unless the URL is quoted.
    return {
      command: "cmd",
      args: ["/c", "start", '""', `"${url}"`],
      windowsVerbatimArguments: true,
    };
  }
  if (platform === "darwin") {
    return { command: "open", args: [url], windowsVerbatimArguments: false };
  }
  return { command: "xdg-open", args: [url], windowsVerbatimArguments: false };
}

export function openSystemBrowser(url: string): void {
  const { command, args, windowsVerbatimArguments } = systemBrowserCommand(url);
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments,
  });
  child.once("error", () => {
    // The URL was printed for manual opening before this was called.
  });
  child.unref();
}
