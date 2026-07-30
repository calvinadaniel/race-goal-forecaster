# Task 5 Report: Training posture preview and apply

Status: **DONE_WITH_CONCERNS**

## Implemented

- Added Conservative, Balanced, and Aggressive posture controls to Training when a plan is available.
- Fetches unsaved posture previews from `GET /api/training-plan?intensity=`.
- Renders preview plan metadata, weeks, annotated `PlanDayCard` entries, notes, and CSV export from `displayPlan`.
- Added unsaved-preview banner with Apply and Reset actions.
- Apply sends the full goal body, manual baseline, and units to `PUT /api/goal`, then reloads forecast data.
- Switcher remains hidden for missing plans and `needsBaseline`; Forecast scenario cards were not changed.

## Commits

- `1645e18` — Training posture switcher, preview, Apply, Reset, and `displayPlan` rendering (concurrently committed under the existing Training-page commit).
- `1aa1505` — Fix async Apply type narrowing while preserving the full goal payload.

## Verification

- `npm test`: 6 files passed, 24 tests passed.
- `npx tsc --noEmit`: passed.
- `npx eslint "src/app/app/training/page.tsx"`: passed.
- IDE diagnostics: no errors.
- `git diff --check -- src/app/app/training/page.tsx`: passed.
- Statically verified `PlanDayCard` remains the week-day renderer, so term annotations remain active in preview mode.
- Statically verified preview requests use the read-only training-plan endpoint and Apply is the only operation that persists intensity.

## Concerns

- Manual browser QA was blocked because browser control could not initialize in this session.
- `npm run build` was blocked by `EPERM` opening `.next/trace`; an existing Next.js dev server is using the same workspace. Type-check, lint, and tests passed independently.
- Unrelated pre-existing design and untracked files were left untouched and uncommitted.

## Important review fixes

- Clear `previewPlan` before fetching a different posture so the saved plan remains visible until the new preview arrives.
- Catch Apply failures and show an inline, accessible error near the unsaved-preview banner; retrying, resetting, or changing posture clears the feedback.

## Review-fix verification

- `npm test`: 6 files passed, 24 tests passed.
- `npx tsc --noEmit`: passed.
- `npx eslint "src/app/app/training/page.tsx"`: passed.
- IDE diagnostics: no errors.
- `git diff --check -- src/app/app/training/page.tsx`: passed.
