# Final whole-branch review fixes

## 2026-09-17 — Strava CLI critical and important fixes

Implemented missing OAuth configuration handling, refresh status preservation,
credential retention on server errors, browser-launch error handling and manual
URL output, exponential 429 retry backoff, best-effort per-IP refresh throttling,
nonce round-trip validation, loopback fetch-metadata validation, private file
modes, README prerequisites, and the low-cost callback/goal hardening items.

Commands and results:

- `npx vitest run src/lib/cli-strava/oauth.test.ts src/app/api/cli/strava/broker.test.ts src/cli/auth.test.ts src/cli/forecast.test.ts src/cli/store.test.ts`
  - Initial run: 4 files passed; 1 auth test failed because its test callback
    ran before the browser URL was captured. The test scheduling was corrected.
- `npx vitest run src/lib/cli-strava/oauth.test.ts src/app/api/cli/strava/broker.test.ts src/cli/auth.test.ts src/cli/forecast.test.ts src/cli/store.test.ts`
  - 5 files passed; 43 tests passed; 1 POSIX-only mode test skipped on Windows.
- `npm test`
  - 20 files passed; 94 tests passed; 1 POSIX-only test skipped (95 total).
- `npx tsc --noEmit`
  - Passed with no output.
- `git diff --check`
  - Passed with no output.

Not run:

- `npm run db:push` — `.env.local` is absent in this worktree, so no database
  operation was permitted.
- npm publication — explicitly out of scope.
