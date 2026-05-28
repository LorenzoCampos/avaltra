# Apply Progress: Transaction History Hardening Tests

## Change
`transaction-history-hardening-tests`

## Mode
Strict TDD for frontend test-hardening work. The cached Engram testing-capabilities record says Strict TDD is enabled; the stale frontend runner note was corrected by reading `frontend/package.json`, which now has Vitest.

## Workload / PR Boundary
- Mode: single PR, no size exception.
- Current work unit: Unit 1 — DOM test support + mounted Activity and pagination hardening tests.
- Boundary: test-only frontend hardening plus OpenSpec task/progress updates; no backend or runtime app behavior changes.
- Estimated review budget impact: ~368 source changed lines (`git diff --shortstat` tracked 64 additions/29 deletions; untracked new frontend test/setup files total 275 lines). OpenSpec artifact files are outside the source review estimate.

## Completed Tasks
- [x] 1.1 Include `src/**/*.test.tsx` in Vitest discovery and add mounted-test setup.
- [x] 1.2 Add `happy-dom` as the minimal Vitest DOM runtime dependency.
- [x] 1.3 Update `pnpm-lock.yaml` for `happy-dom` only; avoided unrelated `lightningcss` lockfile churn after validation.
- [x] 2.1 Add mounted Activity routable row click and Enter/Space navigation tests.
- [x] 2.2 Add mounted Activity non-routable click/Enter/Space no-navigation test.
- [x] 2.3 Add mounted pagination boundary tests for first/last page disabled states.
- [x] 2.4 Add mounted pagination callback and local-filter notice visibility tests.
- [x] 3.1 Wire stable ActivityFeed mocks and assert observable route behavior only.
- [x] 3.2 Make ListPaginationControls mounted tests pass with fixture pagination state.
- [x] 3.3 Add ExpenseList mounted pagination wiring test preserving page-local filter semantics.
- [x] 3.4 Add IncomeList mounted pagination wiring test preserving page-local filter semantics.
- [x] 4.1 Keep helpers local and compact; no runtime component changes.
- [x] 4.2 Verify all spec scenarios.
- [x] 4.3 Run focused tests, full frontend tests, typecheck, focused ESLint, lockfile validation, and `git diff --check`.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `frontend/vite.config.ts`, `frontend/src/test/setup.ts` | Config | ✅ Existing Activity helper tests 3/3 before changes | ➖ Structural config; no product code | ✅ Focused TSX tests discovered and passed | ➖ Single config path | ✅ File-level happy-dom avoids breaking node/static tests |
| 1.2 | `frontend/package.json` | Config | N/A dependency-only | ➖ Structural dependency | ✅ Vitest resolved `happy-dom` after install | ➖ Single dependency | ✅ Minimal devDependency only |
| 1.3 | `frontend/pnpm-lock.yaml` | Config | N/A lock-only | ➖ Structural lock update | ✅ `pnpm install --frozen-lockfile --lockfile-only` passed | ➖ Single dependency | ✅ Reverted unrelated lock churn |
| 2.1/3.1 | `frontend/src/features/activity/components/ActivityFeed.test.tsx` | Mounted component | ✅ Existing Activity helper tests 3/3 before rename | ✅ Click/Enter/Space mounted route assertions written | ✅ Focused suite passed 5/5 | ✅ Expense click + income Enter/Space | ✅ Compact local render helper; no runtime changes |
| 2.2/3.1 | `frontend/src/features/activity/components/ActivityFeed.test.tsx` | Mounted component | ✅ Existing Activity helper tests 3/3 before rename | ✅ Non-routable no-navigation test written | ✅ Focused suite passed 5/5 | ✅ Click + Enter + Space ignored | ✅ Reused mounted fixture |
| 2.3/3.2 | `frontend/src/components/ListPaginationControls.test.tsx` | Mounted component | N/A new file | ✅ First/last boundary tests written | ✅ Focused suite passed 3/3 | ✅ Previous and next disabled boundaries | ✅ Table-driven boundary cases |
| 2.4/3.2 | `frontend/src/components/ListPaginationControls.test.tsx` | Mounted component | N/A new file | ✅ Callback and local notice tests written | ✅ Focused suite passed 3/3 | ✅ Notice hidden and visible cases | ✅ Shared render helper |
| 3.3 | `frontend/src/features/expenses/ExpenseList.pagination.test.tsx` | Mounted component | N/A new file | ✅ Expense list local notice + next/previous wiring test written | ✅ Focused suite passed 1/1 | ✅ Next and previous page transitions | ✅ Compact mocks; runtime unchanged |
| 3.4 | `frontend/src/features/incomes/IncomeList.pagination.test.tsx` | Mounted component | N/A new file | ✅ Income list local notice + next/previous wiring test written | ✅ Focused suite passed 1/1 | ✅ Next and previous page transitions | ✅ Mirrored expense coverage |
| 4.1-4.3 | All touched frontend files | Verification | ✅ Focused + full frontend suites | ✅ Spec scenarios covered by tests above | ✅ Full suite 29/29 files, 128/128 tests | ✅ Activity/pagination/list-page scenarios covered | ✅ Typecheck, ESLint, diff check passed |

## Test Summary
- Total tests written/updated in focused mounted slice: 10 passing tests.
- Layers used: mounted component tests with `react-dom/client`, `act`, and `happy-dom`.
- Approval tests: 3 existing Activity helper tests preserved inside the TSX test file.
- Review correction: restored the deleted `savings_withdrawal` null-route helper assertion and exercised the mounted non-routable Activity row with `savings_withdrawal`.
- Pure functions created: 0.

## Verification
- `npm test -- src/features/activity/components/ActivityFeed.test.tsx src/components/ListPaginationControls.test.tsx src/features/expenses/ExpenseList.pagination.test.tsx src/features/incomes/IncomeList.pagination.test.tsx` → PASS, 4 files / 10 tests.
- `npm test -- src/features/activity/components/ActivityFeed.test.tsx` → PASS, 1 file / 5 tests after restoring `savings_withdrawal` non-routable coverage.
- `npm run typecheck` → PASS.
- `npx eslint vite.config.ts src/test/setup.ts src/features/activity/components/ActivityFeed.test.tsx src/components/ListPaginationControls.test.tsx src/features/expenses/ExpenseList.pagination.test.tsx src/features/incomes/IncomeList.pagination.test.tsx` → PASS.
- `npm test` → PASS, 29 files / 128 tests.
- `pnpm install --frozen-lockfile --lockfile-only` → PASS.
- `git diff --check` → PASS.
- Follow-up verification/fix for `ERR_PNPM_IGNORED_BUILDS`: added `frontend/pnpm-workspace.yaml` with explicit `allowBuilds` approvals for existing install-script packages `core-js` and `esbuild`.
- `pnpm config get allowBuilds` → PASS, returns `{ "core-js": true, "esbuild": true }`.
- `pnpm install --frozen-lockfile --config.strictDepBuilds=true` → PASS; postinstall scripts for `core-js@3.48.0` and `esbuild@0.27.2` completed instead of failing with `ERR_PNPM_IGNORED_BUILDS`.
- `pnpm exec vitest run src/features/activity/components/ActivityFeed.test.tsx` → PASS, 1 file / 5 tests.
- `git diff --check` → PASS from repository root.

## Deviations / Issues
- No runtime app behavior changes.
- Design suggested global Vitest DOM environment; implementation used file-level `// @vitest-environment happy-dom` for mounted TSX tests so existing node/static source tests keep their node environment.
- `pnpm add -D happy-dom` initially failed due pnpm store version mismatch; `pnpm add --lockfile-only` and later manual lockfile cleanup/validation avoided unrelated lockfile churn.
- The re-review failure was caused by pnpm v11 build-script approval state, not Vitest or the ActivityFeed tests. pnpm v11 no longer reads settings from the `pnpm` field in `package.json`; build approvals belong in `pnpm-workspace.yaml`.

## Status
14/14 tasks complete. Ready for fresh review / verify.
