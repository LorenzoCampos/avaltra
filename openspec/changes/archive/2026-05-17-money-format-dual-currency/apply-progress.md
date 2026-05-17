# Apply Progress: Money Format Dual Currency

## Status
success — 14/14 original assigned tasks complete; corrective lint scope complete.

## Mode
Strict TDD.

## Completed Tasks
- [x] 1.1 Locale-explicit `formatCurrency(amount, currency, { language })` with `es-AR`/`en-US` and fixed two decimals.
- [x] 1.2 `useMoneyFormatter` hook reads i18next language and returns `formatMoney`.
- [x] 1.3 `MoneyAmountDisplay` renders account-currency primary plus optional original-currency secondary only on mismatch.
- [x] 2.1 Activity feed summaries/cards use active account currency and shared dual display.
- [x] 2.2 Expenses list uses shared formatter/display in desktop and mobile rows.
- [x] 2.3 Incomes list uses shared formatter/display in desktop and mobile rows.
- [x] 2.4 Dashboard totals/category amounts use `formatMoney`; top expenses and recent transactions use shared dual display.
- [x] 2.5 Removed duplicated hardcoded `es-AR` formatter from `useActivity`.
- [x] 3.1 Activity and dashboard implicit summaries use active account currency fallback.
- [x] 3.2 No wallets/payment-instrument, savings goal edit, backend, or domain files changed.
- [x] 4.1 Added `utils.test.ts` coverage for Spanish, English, and fallback language formatting.
- [x] 4.2 Added `MoneyAmountDisplay.test.ts` coverage for same-currency and mismatch rendering.
- [x] 4.3 Added dashboard currency fallback assertions in existing dashboard test harness; no activity/expense/income harnesses exist in current suite.
- [x] 4.4 Ran focused tests, full frontend tests, typecheck, and build.

## Corrective Work Completed
- [x] Moved exported `resolveMoneyAmountDisplay` from component file `frontend/src/components/MoneyAmountDisplay.tsx` into non-component module `frontend/src/lib/moneyAmountDisplay.ts`.
- [x] Moved exported `getDashboardCurrency` from component file `frontend/src/features/dashboard/Dashboard.tsx` into non-component module `frontend/src/features/dashboard/dashboardCurrency.ts`.
- [x] Updated tests to import pure helpers from the new non-component modules while keeping component behavior unchanged.
- [x] Confirmed corrective changed files no longer trigger `react-refresh/only-export-components`.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Corrective helper extraction | `frontend/src/components/MoneyAmountDisplay.test.ts`, `frontend/src/features/dashboard/Dashboard.test.ts` | Unit/static lint | ✅ Baseline focused run: 15 files, 69 tests passed | ✅ Updated tests to import helpers from new modules before modules existed; run failed on missing `@/lib/moneyAmountDisplay` and `./dashboardCurrency` | ✅ Focused run passed: 15 files, 69 tests passed | ✅ Existing helper tests cover same/mismatch display and explicit/fallback dashboard currency | ✅ Moved pure helpers out of component modules; lint on corrective files passed |

## Test Summary
- Focused baseline: `pnpm test -- src/components/MoneyAmountDisplay.test.ts src/features/dashboard/Dashboard.test.ts` → 15 files, 69 tests passed.
- RED: same focused command failed because new helper modules did not exist yet.
- GREEN: same focused command → 15 files, 69 tests passed.
- Full frontend tests: `pnpm test` → 15 files, 69 tests passed.
- Typecheck: `pnpm typecheck` → passed.
- Build: `pnpm build` → passed with existing Vite warnings for mixed i18next import and >500 kB chunk.
- Corrective lint: `pnpm exec eslint src/components/MoneyAmountDisplay.tsx src/lib/moneyAmountDisplay.ts src/features/dashboard/Dashboard.tsx src/features/dashboard/dashboardCurrency.ts src/components/MoneyAmountDisplay.test.ts src/features/dashboard/Dashboard.test.ts` → passed.
- Broader change-related lint: still fails with 13 errors in `ActivityFeed.tsx`, `ExpenseList.tsx`, and `IncomeList.tsx` from existing/manual-memoization and `any` debt outside this corrective scope.

## Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/src/lib/moneyAmountDisplay.ts` | Created | Holds pure money display resolver and input contract outside the component module. |
| `frontend/src/components/MoneyAmountDisplay.tsx` | Modified | Imports resolver/types from non-component module and exports only the component plus component props. |
| `frontend/src/components/MoneyAmountDisplay.test.ts` | Modified | Imports `resolveMoneyAmountDisplay` from `@/lib/moneyAmountDisplay`. |
| `frontend/src/features/dashboard/dashboardCurrency.ts` | Created | Holds pure dashboard currency fallback helper outside the component module. |
| `frontend/src/features/dashboard/Dashboard.tsx` | Modified | Imports `getDashboardCurrency` from helper module instead of exporting it from the component file. |
| `frontend/src/features/dashboard/Dashboard.test.ts` | Modified | Imports `getDashboardCurrency` from `./dashboardCurrency`. |
| `openspec/changes/money-format-dual-currency/apply-progress.md` | Created | Records merged original apply progress plus corrective apply evidence. |

## Deviations from Design
None for behavior. Pure test helpers were moved to non-component modules to satisfy React Fast Refresh lint while preserving the original formatter/display contracts.

## Issues Found
- Vitest still runs the full configured suite even when given focused file arguments in this project.
- Broader changed-file lint still reports unrelated existing debt in activity/expense/income files; this corrective apply only removed introduced `react-refresh/only-export-components` findings.

## Remaining Tasks
None in corrective scope.

## Workload / PR Boundary
- Mode: single PR corrective follow-up.
- Current work unit: lint correction for helper exports introduced by `money-format-dual-currency`.
- Boundary: helper extraction only; no backend/domain, wallets/payment instruments, savings goal edit UX, or broad lint debt changes.
- Estimated review budget impact: small.
