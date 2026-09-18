# TruePace Strava CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `npm run truepace -- <cmd>` so a runner can log in with Strava (no Google), then print a local forecast and training plan from their activities.

**Architecture:** CLI stores tokens in `~/.truepace`. Login uses a TruePace ticket broker (secret stays on the server): loopback listener → Strava via `{AUTH_URL}/api/cli/strava/*` → one-time Neon ticket → redeem. Forecast/plan call `computeForecast` in-process after fetching Strava with the access token. No `users`/`accounts` row.

**Tech Stack:** Next.js App Router route handlers, Drizzle/Neon, Node `http` loopback, Vitest, existing `src/lib/forecast` + `stravaSource`.

**Spec:** `docs/superpowers/specs/2026-09-17-strava-cli-design.md`

## Global Constraints

- Strava is CLI identity; no Google; no Neon `users` row for CLI login
- Client secret never ships in the CLI; broker does code exchange and refresh
- Strava authorize `redirect_uri` is always `{AUTH_URL}/api/cli/strava/callback`, never loopback
- Loopback redirect must be exactly `http://127.0.0.1:<port>/callback` (not `localhost`, not other hosts)
- Ticket TTL 2 minutes, single redeem; require scope `activity:read_all`
- Default API base `https://race-goal-forecaster.vercel.app`; override with `TRUEPACE_API`
- Persist goal to `goal.json`; `--reset-goal` re-prompts; `logout --all` also deletes goal
- Estimates-only line on `forecast` and `plan`; do not invent proof
- Do not publish npm, do not replace Auth.js, do not write CLI tokens into `accounts`
- Do not commit `.env.local` or secrets
- Tests must not hit live Strava or a real browser; use `TRUEPACE_HOME` for a temp dir

## File map

| File | Responsibility |
|------|----------------|
| `src/cli/store.ts` | `~/.truepace` credentials + goal read/write/delete |
| `src/cli/store.test.ts` | Store tests |
| `src/lib/cli-strava/redirect.ts` | Validate loopback callback URL |
| `src/lib/cli-strava/state.ts` | HMAC-signed OAuth `state` |
| `src/lib/cli-strava/scope.ts` | `activity:read_all` check |
| `src/lib/cli-strava/oauth.ts` | Server-side code exchange + refresh (uses env secret) |
| `src/lib/cli-strava/tickets.ts` | Insert/redeem/purge Neon tickets |
| `src/db/schema.ts` | `cli_strava_tickets` table |
| `src/app/api/cli/strava/start/route.ts` | Redirect to Strava |
| `src/app/api/cli/strava/callback/route.ts` | Exchange code, store ticket, 302 to loopback |
| `src/app/api/cli/strava/redeem/route.ts` | Ticket → tokens, one shot |
| `src/app/api/cli/strava/refresh/route.ts` | Refresh token → new tokens |
| `src/cli/auth.ts` | Loopback login + broker redeem/refresh |
| `src/cli/prompts.ts` | Interactive goal + baseline |
| `src/cli/print.ts` | whoami / verdict / plan text |
| `src/cli/forecast.ts` | Fetch activities, `computeForecast` |
| `src/cli/index.ts` | argv dispatch |
| `package.json` | `truepace` script + `tsx` |
| `README.md` | CLI usage |

---

### Task 1: Local store (`credentials.json` + `goal.json`)

**Files:**
- Create: `src/cli/store.ts`
- Test: `src/cli/store.test.ts`

**Interfaces:**
- Consumes: Node `fs` / `os` / `path`
- Produces:
  - `truepaceDir(): string`
  - `CliAthlete { id: number; username?: string \| null; firstname?: string \| null; lastname?: string \| null }`
  - `CliCredentials { athlete: CliAthlete; access_token: string; refresh_token: string; expires_at: number; scope: string }`
  - `CliGoal` matching engine fields: `{ distanceKey, distanceM, targetTimeSec, raceDate: string, intensity, units: "mi" \| "km", manualBaseline: { distanceKey, distanceM, timeSec, date } }`
  - `readCredentials(): CliCredentials | null`
  - `writeCredentials(c: CliCredentials): void`
  - `clearCredentials(): void`
  - `readGoal(): CliGoal | null`
  - `writeGoal(g: CliGoal): void`
  - `clearGoal(): void`

- [ ] **Step 1: Write failing tests**

```ts
// src/cli/store.test.ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCredentials,
  readCredentials,
  readGoal,
  writeCredentials,
  writeGoal,
} from "./store";
import type { CliGoal } from "./store";

const creds = {
  athlete: { id: 99, firstname: "Ada", lastname: "Runner" },
  access_token: "at",
  refresh_token: "rt",
  expires_at: 1_700_000_000,
  scope: "activity:read_all",
};

const goal: CliGoal = {
  distanceKey: "half",
  distanceM: 21097.5,
  targetTimeSec: 5520,
  raceDate: "2026-11-08",
  intensity: "balanced",
  units: "mi",
  manualBaseline: {
    distanceKey: "half",
    distanceM: 21097.5,
    timeSec: 6204,
    date: "2026-03-15",
  },
};

describe("cli store", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "truepace-"));
    process.env.TRUEPACE_HOME = home;
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRUEPACE_HOME;
  });

  it("returns null when credentials are missing", () => {
    expect(readCredentials()).toBeNull();
  });

  it("round-trips credentials", () => {
    writeCredentials(creds);
    expect(readCredentials()).toEqual(creds);
  });

  it("clearCredentials removes the file and keeps goal", () => {
    writeCredentials(creds);
    writeGoal(goal);
    clearCredentials();
    expect(readCredentials()).toBeNull();
    expect(readGoal()).toEqual(goal);
  });

  it("writes credentials with owner-only mode when chmod is supported", () => {
    writeCredentials(creds);
    const mode = readFileSync(join(home, "credentials.json")).length;
    expect(mode).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npx vitest run src/cli/store.test.ts`

Expected: FAIL resolving `./store`

- [ ] **Step 3: Implement store**

```ts
// src/cli/store.ts
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import type { Intensity } from "@/lib/forecast/postures";
import type { ManualBaseline } from "@/lib/forecast/engine";
import type { Units } from "@/lib/units";

export type CliAthlete = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
};

export type CliCredentials = {
  athlete: CliAthlete;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
};

export type CliGoal = {
  distanceKey: DistanceKey;
  distanceM: number;
  targetTimeSec: number;
  raceDate: string;
  intensity: Intensity;
  units: Units;
  manualBaseline: ManualBaseline;
};

export function truepaceDir(): string {
  return process.env.TRUEPACE_HOME ?? join(homedir(), ".truepace");
}

function credentialsPath() {
  return join(truepaceDir(), "credentials.json");
}

function goalPath() {
  return join(truepaceDir(), "goal.json");
}

function ensureDir() {
  mkdirSync(truepaceDir(), { recursive: true });
}

function writePrivate(path: string, body: string) {
  ensureDir();
  writeFileSync(path, body, "utf8");
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows may ignore chmod; file is still user-local under the homedir.
  }
}

export function readCredentials(): CliCredentials | null {
  try {
    return JSON.parse(readFileSync(credentialsPath(), "utf8")) as CliCredentials;
  } catch {
    return null;
  }
}

export function writeCredentials(creds: CliCredentials): void {
  writePrivate(credentialsPath(), JSON.stringify(creds, null, 2));
}

export function clearCredentials(): void {
  rmSync(credentialsPath(), { force: true });
}

export function readGoal(): CliGoal | null {
  try {
    return JSON.parse(readFileSync(goalPath(), "utf8")) as CliGoal;
  } catch {
    return null;
  }
}

export function writeGoal(goal: CliGoal): void {
  if (!DISTANCES[goal.distanceKey]) {
    throw new Error(`Unknown distanceKey ${goal.distanceKey}`);
  }
  writePrivate(goalPath(), JSON.stringify(goal, null, 2));
}

export function clearGoal(): void {
  rmSync(goalPath(), { force: true });
}
```

- [ ] **Step 4: Re-run tests — expect PASS**

Run: `npx vitest run src/cli/store.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/store.ts src/cli/store.test.ts
git commit -m "feat(cli): persist Strava credentials and goal under ~/.truepace"
```

---

### Task 2: Loopback URL + HMAC state + scope

**Files:**
- Create: `src/lib/cli-strava/redirect.ts`
- Create: `src/lib/cli-strava/state.ts`
- Create: `src/lib/cli-strava/scope.ts`
- Test: `src/lib/cli-strava/redirect.test.ts`
- Test: `src/lib/cli-strava/state.test.ts`
- Test: `src/lib/cli-strava/scope.test.ts`

**Interfaces:**
- Consumes: `AUTH_SECRET` (state signing)
- Produces:
  - `parseLoopbackRedirect(raw: string | null): { ok: true; url: string; port: number } | { ok: false }`
  - `signState(payload: { redirect: string; nonce: string; exp: number }, secret: string): string`
  - `verifyState(state: string, secret: string, nowSec?: number): { redirect: string; nonce: string; exp: number } | null`
  - `hasActivityReadAll(scope: string | null | undefined): boolean`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/cli-strava/redirect.test.ts
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
```

```ts
// src/lib/cli-strava/state.test.ts
import { describe, expect, it } from "vitest";
import { signState, verifyState } from "./state";

const secret = "test-secret-for-hmac";
const payload = {
  redirect: "http://127.0.0.1:9/callback",
  nonce: "abc",
  exp: 2_000_000_000,
};

describe("cli oauth state", () => {
  it("round-trips a signed payload", () => {
    const token = signState(payload, secret);
    expect(verifyState(token, secret, 1_900_000_000)).toEqual(payload);
  });

  it("rejects tampering and expiry", () => {
    const token = signState(payload, secret);
    expect(verifyState(token + "x", secret, 1_900_000_000)).toBeNull();
    expect(verifyState(signState({ ...payload, exp: 10 }, secret), secret, 11)).toBeNull();
  });
});
```

```ts
// src/lib/cli-strava/scope.test.ts
import { describe, expect, it } from "vitest";
import { hasActivityReadAll } from "./scope";

describe("hasActivityReadAll", () => {
  it("accepts comma or space lists that include activity:read_all", () => {
    expect(hasActivityReadAll("read,activity:read_all")).toBe(true);
    expect(hasActivityReadAll("activity:read_all read")).toBe(true);
  });

  it("rejects weaker activity:read", () => {
    expect(hasActivityReadAll("read,activity:read")).toBe(false);
    expect(hasActivityReadAll(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/lib/cli-strava/redirect.test.ts src/lib/cli-strava/state.test.ts src/lib/cli-strava/scope.test.ts`

Expected: FAIL missing modules

- [ ] **Step 3: Implement**

```ts
// src/lib/cli-strava/redirect.ts
const LOOPBACK = /^http:\/\/127\.0\.0\.1:(\d{1,5})\/callback$/;

export function parseLoopbackRedirect(
  raw: string | null,
): { ok: true; url: string; port: number } | { ok: false } {
  if (!raw) return { ok: false };
  const m = LOOPBACK.exec(raw);
  if (!m) return { ok: false };
  const port = Number(m[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false };
  return { ok: true, url: raw, port };
}
```

```ts
// src/lib/cli-strava/state.ts
import { createHmac, timingSafeEqual } from "node:crypto";

export type CliOAuthState = {
  redirect: string;
  nonce: string;
  exp: number;
};

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hmac(secret: string, data: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function signState(payload: CliOAuthState, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(secret, body)}`;
}

export function verifyState(
  state: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): CliOAuthState | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmac(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CliOAuthState;
    if (!json.redirect || !json.nonce || typeof json.exp !== "number") return null;
    if (json.exp <= nowSec) return null;
    return json;
  } catch {
    return null;
  }
}
```

```ts
// src/lib/cli-strava/scope.ts
export function hasActivityReadAll(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope
    .split(/[,\s]+/)
    .filter(Boolean)
    .includes("activity:read_all");
}
```

- [ ] **Step 4: Re-run tests — expect PASS**

Run: `npx vitest run src/lib/cli-strava/redirect.test.ts src/lib/cli-strava/state.test.ts src/lib/cli-strava/scope.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cli-strava
git commit -m "feat(cli): sign OAuth state and allow only 127.0.0.1 loopback redirects"
```

---

### Task 3: Ticket table + redeem-once helpers

**Files:**
- Modify: `src/db/schema.ts` (append table after `goals`)
- Create: `src/lib/cli-strava/tickets.ts`
- Test: `src/lib/cli-strava/tickets.test.ts`

**Interfaces:**
- Consumes: `getDb()`, `CliCredentials` token fields
- Produces:
  - Table `cliStravaTickets`
  - `CliStravaTicketPayload` (tokens + athlete + scope)
  - `TICKET_TTL_MS = 2 * 60 * 1000`
  - `newTicketId(): string`
  - `insertTicket(payload: CliStravaTicketPayload, now?: Date): Promise<string>`
  - `redeemTicket(id: string, now?: Date): Promise<CliStravaTicketPayload | null>`

- [ ] **Step 1: Write failing tests with an in-memory fake db**

Keep `tickets.ts` injecting the db via `ticketDb` argument so tests do not need Neon:

```ts
// src/lib/cli-strava/tickets.test.ts
import { describe, expect, it } from "vitest";
import {
  TICKET_TTL_MS,
  createMemoryTicketStore,
} from "./tickets";

const payload = {
  access_token: "a",
  refresh_token: "r",
  expires_at: 9,
  scope: "activity:read_all",
  athlete: { id: 1, firstname: "Ada" },
};

describe("cli tickets", () => {
  it("redeems once then fails", async () => {
    const store = createMemoryTicketStore();
    const id = await store.insertTicket(payload);
    expect(await store.redeemTicket(id)).toEqual(payload);
    expect(await store.redeemTicket(id)).toBeNull();
  });

  it("rejects expired tickets", async () => {
    const store = createMemoryTicketStore();
    const now = new Date("2026-09-17T00:00:00Z");
    const id = await store.insertTicket(payload, now);
    const later = new Date(now.getTime() + TICKET_TTL_MS + 1000);
    expect(await store.redeemTicket(id, later)).toBeNull();
  });

  it("unknown id is null", async () => {
    const store = createMemoryTicketStore();
    expect(await store.redeemTicket("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/cli-strava/tickets.test.ts`

Expected: FAIL missing module

- [ ] **Step 3: Implement schema + store**

Append to `src/db/schema.ts`:

```ts
export type CliStravaTicketPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  athlete: {
    id: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

export const cliStravaTickets = pgTable("cli_strava_tickets", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<CliStravaTicketPayload>().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
```

```ts
// src/lib/cli-strava/tickets.ts
import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { cliStravaTickets, type CliStravaTicketPayload } from "@/db/schema";

export const TICKET_TTL_MS = 2 * 60 * 1000;

export function newTicketId(): string {
  return randomBytes(24).toString("base64url");
}

export type TicketStore = {
  insertTicket(payload: CliStravaTicketPayload, now?: Date): Promise<string>;
  redeemTicket(id: string, now?: Date): Promise<CliStravaTicketPayload | null>;
};

function expiresAt(now: Date): Date {
  return new Date(now.getTime() + TICKET_TTL_MS);
}

export function createDbTicketStore(): TicketStore {
  return {
    async insertTicket(payload, now = new Date()) {
      const db = getDb();
      await db.delete(cliStravaTickets).where(lt(cliStravaTickets.expiresAt, now));
      const id = newTicketId();
      await db.insert(cliStravaTickets).values({
        id,
        payload,
        expiresAt: expiresAt(now),
        createdAt: now,
      });
      return id;
    },
    async redeemTicket(id, now = new Date()) {
      const db = getDb();
      const [row] = await db
        .select()
        .from(cliStravaTickets)
        .where(eq(cliStravaTickets.id, id))
        .limit(1);
      if (!row) return null;
      await db.delete(cliStravaTickets).where(eq(cliStravaTickets.id, id));
      if (row.expiresAt.getTime() <= now.getTime()) return null;
      return row.payload;
    },
  };
}

export function createMemoryTicketStore(): TicketStore {
  const rows = new Map<string, { payload: CliStravaTicketPayload; expiresAt: Date }>();
  return {
    async insertTicket(payload, now = new Date()) {
      const id = newTicketId();
      rows.set(id, { payload, expiresAt: expiresAt(now) });
      return id;
    },
    async redeemTicket(id, now = new Date()) {
      const row = rows.get(id);
      if (!row) return null;
      rows.delete(id);
      if (row.expiresAt.getTime() <= now.getTime()) return null;
      return row.payload;
    },
  };
}

export const ticketStore: TicketStore = createDbTicketStore();
```

- [ ] **Step 4: Re-run tests — expect PASS**

Run: `npx vitest run src/lib/cli-strava/tickets.test.ts`

Expected: PASS

- [ ] **Step 5: Push schema**

Run: `npm run db:push`

Expected: Drizzle applies `cli_strava_tickets` (needs `DATABASE_URL` in `.env.local`). If push cannot run in CI, still commit the schema; the engineer doing local work runs push.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/lib/cli-strava/tickets.ts src/lib/cli-strava/tickets.test.ts
git commit -m "feat(cli): one-time Strava login tickets with a 2-minute TTL"
```

---

### Task 4: Server OAuth helpers (code exchange + refresh)

**Files:**
- Create: `src/lib/cli-strava/oauth.ts`
- Test: `src/lib/cli-strava/oauth.test.ts`

**Interfaces:**
- Consumes: `AUTH_STRAVA_ID`, `AUTH_STRAVA_SECRET`, `hasActivityReadAll`
- Produces:
  - `cliCallbackUrl(origin: string): string` → `{origin}/api/cli/strava/callback` with no trailing slash on origin
  - `exchangeCliCode(args: { code: string; redirectUri: string; fetchImpl?: typeof fetch }): Promise<{ ok: true; payload: CliStravaTicketPayload } | { ok: false; error: "http" | "scope" | "athlete" }>`
  - `refreshCliToken(args: { refreshToken: string; fetchImpl?: typeof fetch }): Promise<{ ok: true; payload: Omit<CliStravaTicketPayload, "athlete"> } | { ok: false; status: number }>`

- [ ] **Step 1: Write failing tests with a mock fetch**

```ts
// src/lib/cli-strava/oauth.test.ts
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
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/cli-strava/oauth.test.ts`

Expected: FAIL missing module

- [ ] **Step 3: Implement `oauth.ts`**

Post to `https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `grant_type=authorization_code` + `code` + `redirect_uri`, or `grant_type=refresh_token` + `refresh_token`. Do not log token bodies. If `scope` is omitted on refresh, default to `activity:read_all` only when the HTTP call succeeded (Strava often omits scope on refresh); still require `activity:read_all` on **authorization_code** responses.

- [ ] **Step 4: Re-run — expect PASS**

Run: `npx vitest run src/lib/cli-strava/oauth.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cli-strava/oauth.ts src/lib/cli-strava/oauth.test.ts
git commit -m "feat(cli): exchange and refresh Strava tokens on the broker"
```

---

### Task 5: Broker routes

**Files:**
- Create: `src/app/api/cli/strava/start/route.ts`
- Create: `src/app/api/cli/strava/callback/route.ts`
- Create: `src/app/api/cli/strava/redeem/route.ts`
- Create: `src/app/api/cli/strava/refresh/route.ts`
- Test: `src/app/api/cli/strava/broker.test.ts`

These routes are **not** behind `middleware.ts` (matcher is only `/app` and `/onboarding`). Do not add them to the matcher.

**Interfaces:**
- Consumes: `parseLoopbackRedirect`, `signState`, `verifyState`, `exchangeCliCode`, `refreshCliToken`, `ticketStore` (mock with `vi.mock("@/lib/cli-strava/tickets")`)
- Produces: the four HTTP handlers

**Behavior (exact):**

`GET /api/cli/strava/start?redirect=`
- 400 if redirect invalid
- 500 if `AUTH_SECRET` or `AUTH_STRAVA_ID` missing
- 302 to `https://www.strava.com/oauth/authorize` with `client_id`, `response_type=code`, `redirect_uri={AUTH_URL or request origin}/api/cli/strava/callback`, `approval_prompt=auto`, `scope=activity:read_all`, `state=signState({ redirect, nonce, exp: now+600 })`

`GET /api/cli/strava/callback`
- If `error` query: 400 `text/html` “Authorization failed”
- Verify state; 400 HTML if bad
- `exchangeCliCode`; 400 HTML on scope/http failure (do not create a ticket)
- `insertTicket`; 302 to `{redirect}?ticket={id}`

`POST /api/cli/strava/redeem` JSON `{ ticket: string }`
- 400 if missing
- 404 if redeem returns null
- 200 JSON payload (tokens + athlete). Do not log it.

`POST /api/cli/strava/refresh` JSON `{ refresh_token: string }`
- 400 if missing
- 401 if Strava 4xx
- 502 if Strava 5xx
- 200 `{ access_token, refresh_token, expires_at, scope }`

- [ ] **Step 1: Write failing route tests**

Mock tickets in-memory and `exchangeCliCode` via `vi.mock`. Example start test:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/cli-strava/tickets", () => {
  const store = {
    insertTicket: vi.fn(async () => "ticket-1"),
    redeemTicket: vi.fn(async (id: string) =>
      id === "ticket-1"
        ? {
            access_token: "at",
            refresh_token: "rt",
            expires_at: 1,
            scope: "activity:read_all",
            athlete: { id: 1 },
          }
        : null,
    ),
  };
  return { ticketStore: store };
});

describe("GET start", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "s".repeat(32);
    process.env.AUTH_STRAVA_ID = "cid";
    process.env.AUTH_URL = "https://app.example";
  });

  it("rejects a non-loopback redirect", async () => {
    const { GET } = await import("./start/route");
    const res = await GET(
      new Request("https://app.example/api/cli/strava/start?redirect=https://evil.test"),
    );
    expect(res.status).toBe(400);
  });

  it("302s to Strava with signed state", async () => {
    const { GET } = await import("./start/route");
    const res = await GET(
      new Request(
        "https://app.example/api/cli/strava/start?redirect=http://127.0.0.1:5555/callback",
      ),
    );
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc.startsWith("https://www.strava.com/oauth/authorize")).toBe(true);
    expect(loc).toContain("redirect_uri=" + encodeURIComponent("https://app.example/api/cli/strava/callback"));
    expect(loc).toContain("scope=activity%3Aread_all");
  });
});
```

Add sibling tests in the same file for redeem 404 and refresh 401 (mock `refreshCliToken`). Because `vi.mock` is hoisted, keep all broker tests in this one file.

- [ ] **Step 2: Run — expect FAIL (routes missing)**

Run: `npx vitest run src/app/api/cli/strava/broker.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement the four routes**

Use `NextResponse.redirect` / `NextResponse.json`. Error pages: `new NextResponse("<h2>Authorization failed</h2>", { status: 400, headers: { "content-type": "text/html" } })`. Prefer `process.env.AUTH_URL` for `redirect_uri`; if unset, `new URL(req.url).origin`.

- [ ] **Step 4: Re-run — expect PASS**

Run: `npx vitest run src/app/api/cli/strava/broker.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cli/strava
git commit -m "feat(cli): add Strava ticket-broker HTTP routes"
```

---

### Task 6: CLI login / logout / whoami

**Files:**
- Create: `src/cli/auth.ts`
- Create: `src/cli/index.ts`
- Test: `src/cli/auth.test.ts`
- Modify: `package.json` (add `"truepace": "tsx src/cli/index.ts"` and devDependency `tsx`)

**Interfaces:**
- Consumes: `parseLoopbackRedirect` (for sanity), `writeCredentials`, `readCredentials`, `clearCredentials`, `clearGoal`
- Produces:
  - `apiBase(): string` — `process.env.TRUEPACE_API ?? "https://race-goal-forecaster.vercel.app"` with no trailing slash
  - `loginWithLoopback(deps: LoginDeps): Promise<CliCredentials>`
  - `LoginDeps { openBrowser: (url: string) => void; fetchImpl: typeof fetch; listen: (handler: (ticket: string) => void) => Promise<{ port: number; close: () => void }>; timeoutMs?: number }`
  - `ensureFreshCredentials(nowSec?: number): Promise<CliCredentials>` — refresh via broker if `expires_at <= now+60`; on refresh 4xx call `clearCredentials()` and throw
  - `openSystemBrowser(url: string): void` used only from `index.ts`, not tests

**Login algorithm:**
1. `listen` binds `127.0.0.1` ephemeral port, path `/callback`, reads `ticket` query
2. `openBrowser(`${apiBase()}/api/cli/strava/start?redirect=${encodeURIComponent("http://127.0.0.1:"+port+"/callback")}`)`
3. Wait for ticket or `timeoutMs` default 120_000
4. `POST ${apiBase()}/api/cli/strava/redeem` JSON `{ ticket }`
5. If !ok, throw with “Ticket expired or already used. Run login again.”
6. `writeCredentials(json)` and return

- [ ] **Step 1: Write failing auth tests** (no real server required — inject `listen`)

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loginWithLoopback, ensureFreshCredentials } from "./auth";
import { readCredentials, writeCredentials } from "./store";

describe("loginWithLoopback", () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "truepace-"));
    process.env.TRUEPACE_HOME = home;
    process.env.TRUEPACE_API = "https://app.example";
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRUEPACE_HOME;
    delete process.env.TRUEPACE_API;
  });

  it("redeems a ticket and writes credentials", async () => {
    const opened: string[] = [];
    const creds = await loginWithLoopback({
      openBrowser: (url) => opened.push(url),
      timeoutMs: 1000,
      listen: async (onTicket) => {
        queueMicrotask(() => onTicket("t1"));
        return { port: 5555, close: () => {} };
      },
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe("https://app.example/api/cli/strava/redeem");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            access_token: "at",
            refresh_token: "rt",
            expires_at: 99,
            scope: "activity:read_all",
            athlete: { id: 5, firstname: "Ada" },
          }),
          { status: 200 },
        );
      },
    });
    expect(opened[0]).toContain("redirect=http%3A%2F%2F127.0.0.1%3A5555%2Fcallback");
    expect(creds.athlete.id).toBe(5);
    expect(readCredentials()?.access_token).toBe("at");
  });
});
```

Add `ensureFreshCredentials` test: expired token → POST refresh → rewritten file; 401 → credentials cleared and throw.

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/cli/auth.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement `auth.ts` + `index.ts`**

`index.ts` for this task handles `login | logout | whoami` only (forecast/plan in Task 8):

```ts
const [cmd, ...rest] = process.argv.slice(2);
```

- `login` → real `listen` using `node:http.createServer` on `127.0.0.1`, port `0`; `openSystemBrowser`; print `Authorized as {firstname lastname} (id)`
- `logout` → `clearCredentials()`; if `rest.includes("--all")` also `clearGoal()`
- `whoami` → `ensureFreshCredentials()`; if no name, `GET https://www.strava.com/api/v3/athlete` with Bearer (use `fetchStravaAthlete` from `@/lib/strava`); print name + id; if no credentials, stderr “Run npm run truepace -- login” exit 1
- unknown cmd → usage, exit 1

Install `tsx` as a devDependency. Add script `"truepace": "tsx src/cli/index.ts"`.

- [ ] **Step 4: Re-run unit tests + `npx vitest run` (full suite still green)**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/auth.ts src/cli/auth.test.ts src/cli/index.ts package.json package-lock.json
git commit -m "feat(cli): Strava login via loopback ticket redeem"
```

---

### Task 7: Interactive goal prompts

**Files:**
- Create: `src/cli/prompts.ts`
- Test: `src/cli/prompts.test.ts`

**Interfaces:**
- Consumes: `DISTANCES`, `parseDuration`, `CliGoal`
- Produces: `parseGoalAnswers(answers: GoalAnswers): CliGoal | { error: string }` where `GoalAnswers` is the raw strings from readline (so tests do not use stdin):
  - `distanceKey` (`5k|10k|half|marathon`)
  - `goalTime` (`h:mm:ss` or `mm:ss`)
  - `raceDate` (`YYYY-MM-DD`, must be in the future relative to `asOf`)
  - `intensity` (`conservative|balanced|aggressive`)
  - `units` (`mi|km`)
  - `baselineDistanceKey`, `baselineTime`, `baselineDate`
- `promptGoal(io: { question: (q: string) => Promise<string> }): Promise<CliGoal>` loops until `parseGoalAnswers` succeeds

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseGoalAnswers } from "./prompts";

const asOf = new Date("2026-09-17T00:00:00Z");

describe("parseGoalAnswers", () => {
  it("builds a CliGoal from valid strings", () => {
    const g = parseGoalAnswers(
      {
        distanceKey: "half",
        goalTime: "1:32:00",
        raceDate: "2026-11-08",
        intensity: "balanced",
        units: "mi",
        baselineDistanceKey: "half",
        baselineTime: "1:43:24",
        baselineDate: "2026-03-15",
      },
      asOf,
    );
    expect("error" in g).toBe(false);
    if ("error" in g) return;
    expect(g.targetTimeSec).toBe(5520);
    expect(g.distanceM).toBe(21097.5);
    expect(g.manualBaseline.timeSec).toBe(6204);
  });

  it("rejects unknown distance and past race dates", () => {
    const badDist = parseGoalAnswers(
      {
        distanceKey: "ultra",
        goalTime: "1:32:00",
        raceDate: "2026-11-08",
        intensity: "balanced",
        units: "mi",
        baselineDistanceKey: "half",
        baselineTime: "1:43:24",
        baselineDate: "2026-03-15",
      },
      asOf,
    );
    expect("error" in badDist).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/cli/prompts.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement parser + readline wrapper**

Use `node:readline/promises` only inside `promptGoal`. Questions, in order: distance, goal time, race date, posture, units, baseline distance, baseline time, baseline date.

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/cli/prompts.ts src/cli/prompts.test.ts
git commit -m "feat(cli): parse interactive race goal and baseline answers"
```

---

### Task 8: `forecast` and `plan` commands

**Files:**
- Create: `src/cli/forecast.ts`
- Create: `src/cli/print.ts`
- Test: `src/cli/forecast.test.ts`
- Test: `src/cli/print.test.ts`
- Modify: `src/cli/index.ts`

**Interfaces:**
- Consumes: `ensureFreshCredentials`, `readGoal` / `writeGoal` / `promptGoal`, `stravaSource.listActivities`, `weeklyVolumeFromActivities`, `computeForecast`, `formatDuration`
- Produces:
  - `loadForecast(args: { resetGoal?: boolean; listActivities?: typeof stravaSource.listActivities; asOf?: Date }): Promise<ForecastResult>`
  - `formatForecast(result: ForecastResult): string`
  - `formatPlan(result: ForecastResult): string`
  - `withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T>` — retry only when `Error.message` includes ` 429`

**Fetch window:** `since` = 18 months ago (same as `src/app/api/strava/sync/route.ts`).

**Print rules:**
- Verdict labels: `On track` / `At risk` / `Unlikely` (never a branded “Track”)
- Lines: verdict, `Projected {formatDuration(predicted)} vs goal {formatDuration(target)}`, then `result.why` joined by newlines, then `Estimates only — not coaching or medical advice.`
- If `needsBaseline` or `missing.length`, print those and do not invent a stronger verdict
- `formatPlan`: if `trainingPlan` is null, say so; else print `Week {currentWeekIndex} of {weeks.length} ({phase})` then current week days (`day · title · detail`), then remaining weeks as `Week N · {weekStart} · {phase} · {weeklyMiles} mi` plus each day’s `day · title`

- [ ] **Step 1: Write failing tests**

`forecast.test.ts`: fixture `CliGoal` + two run activities via injected `listActivities`; assert `computeForecast` verdict `on_track` with a comfortable half and 12 weeks of volume (mirror `engine.test.ts` “already faster than goal”). Use `TRUEPACE_HOME` + `writeCredentials` with `expires_at` far in the future so refresh is skipped. Mock `fetchImpl` on refresh unused.

`print.test.ts`: feed a tiny stub `ForecastResult` (cast or build via `computeForecast`) and assert the disclaimer string is present and “On track” appears for `verdict: "on_track"`.

Also test `withRetry`: fail twice with `Error("Strava activities fetch failed: 429")`, succeed third.

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/cli/forecast.test.ts src/cli/print.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement `forecast.ts`, `print.ts`, and index dispatch**

`forecast` / `plan`:
- no credentials → exit 1 “Run npm run truepace -- login”
- `--reset-goal` or missing goal → `promptGoal` then `writeGoal`
- `loadForecast` → print
- catch 429 after retries → exit 1 without wiping credentials
- Strava 5xx → exit 1, keep credentials

- [ ] **Step 4: Re-run those tests + full `npm test`**

Expected: PASS (existing 39+ plus new)

- [ ] **Step 5: Commit**

```bash
git add src/cli/forecast.ts src/cli/forecast.test.ts src/cli/print.ts src/cli/print.test.ts src/cli/index.ts
git commit -m "feat(cli): print local forecast and plan from Strava activities"
```

---

### Task 9: README + usage

**Files:**
- Modify: `README.md` (add a **CLI** section after Scripts)
- Modify: `src/cli/index.ts` usage string if needed

**Copy (use this, do not invent testimonials):**

```markdown
## CLI

Local Strava login and forecast (no Google account). Tokens stay in `~/.truepace`.

```bash
npm run truepace -- login
npm run truepace -- whoami
npm run truepace -- forecast
npm run truepace -- plan
npm run truepace -- logout
```

`login` opens a browser against the TruePace broker. For a local Next server:

```bash
TRUEPACE_API=http://localhost:3000 npm run truepace -- login
```

`forecast` and `plan` prompt for distance, goal time, race date, posture, units, and a baseline race the first time (saved as `~/.truepace/goal.json`). Re-prompt with `--reset-goal`.

Estimates only — not coaching or medical advice.
```

Mention that production Strava callback domain is already the website; no extra Strava “localhost” domain is required.

- [ ] **Step 1: Add the README section**

- [ ] **Step 2: Run `npx tsx src/cli/index.ts` with no args — expect usage on stderr and exit 1**

- [ ] **Step 3: Run `npm test`**

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add README.md src/cli/index.ts
git commit -m "docs: document the TruePace Strava CLI"
```

---

## Manual check (not CI)

With `npm run dev` and Strava + `AUTH_SECRET` in `.env.local`:

```bash
TRUEPACE_API=http://localhost:3000 npm run truepace -- login
npm run truepace -- whoami
npm run truepace -- forecast
npm run truepace -- plan
```

Confirm: browser returns to the CLI, `~/.truepace/credentials.json` is written, forecast prints verdict + disclaimer, plan prints week text, no row added to `users`.

## Spec coverage

| Spec item | Task |
|-----------|------|
| login / logout / whoami | 6 |
| forecast / plan | 8 |
| Interactive goal + baseline + `goal.json` / `--reset-goal` | 7–8 |
| Broker start/callback/redeem/refresh | 4–5 |
| Ticket table, 2 min, once | 3 |
| Loopback 127.0.0.1 only; no secret in CLI | 2, 6 |
| Local `computeForecast`, no Neon user | 8 |
| 429 retry; refresh 4xx clears credentials | 6, 8 |
| Estimates-only | 8–9 |
| README invoke `npm run truepace --` | 9 |
| Out of v1: Google, npm publish, Python replacement | omitted |
