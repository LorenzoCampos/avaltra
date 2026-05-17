# Tasks: Money Format Dual Currency

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 260–360 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR on `feat/money-format-dual-currency` |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Shared formatter + dual display rollout + tests | PR 1 | Keep scope to dashboard/home, activity, expenses, incomes |

## Phase 1: Foundation

- [x] 1.1 Update `frontend/src/lib/utils.ts` to make `formatCurrency(amount, currency, { language })` locale-explicit (`es-AR`/`en-US`) with fixed 2 decimals.
- [x] 1.2 Create `frontend/src/hooks/useMoneyFormatter.ts` to read i18next language and return a reusable `formatMoney` wrapper.
- [x] 1.3 Create `frontend/src/components/MoneyAmountDisplay.tsx` that renders primary account-currency amount and optional secondary original-currency amount only on mismatch.

## Phase 2: Core Implementation

- [x] 2.1 Refactor `frontend/src/features/activity/components/ActivityFeed.tsx` to use `useMoneyFormatter` + `MoneyAmountDisplay` for rows/cards, preserving existing sign/color rules.
- [x] 2.2 Refactor `frontend/src/features/expenses/ExpenseList.tsx` to replace local `toLocaleString`/inline money rendering with centralized formatter and mismatch-aware dual display.
- [x] 2.3 Refactor `frontend/src/features/incomes/IncomeList.tsx` with the same centralized formatter and dual-display behavior as expenses.
- [x] 2.4 Refactor `frontend/src/features/dashboard/Dashboard.tsx` to format totals/categories consistently and show dual-currency in recent/top transaction sections.
- [x] 2.5 Clean `frontend/src/hooks/useActivity.ts` by removing duplicated hardcoded `es-AR` formatter logic no longer needed after shared formatter adoption.

## Phase 3: Integration Rules & Scope Guard

- [x] 3.1 Ensure activity/dashboard summaries without explicit currency use active account currency (`activeAccount.currency` and dashboard fallback `primary_currency || activeAccount.currency`).
- [x] 3.2 Confirm no changes are made in wallets/payment-instrument or savings-goal edit paths (no edits under unrelated feature folders).

## Phase 4: Testing & Verification

- [x] 4.1 Add/extend `frontend/src/lib/utils.test.ts` for Spanish (`500.000,40`) and English (`500,000.40`) formatting, asserting two-decimal behavior.
- [x] 4.2 Create `frontend/src/components/MoneyAmountDisplay.test.tsx` to cover same-currency single-line render and mismatch dual-line render.
- [x] 4.3 Add focused view-level assertions (or existing test updates) in `frontend/src/features/activity/components/ActivityFeed.test.tsx`, `frontend/src/features/expenses/ExpenseList.test.tsx`, `frontend/src/features/incomes/IncomeList.test.tsx`, `frontend/src/features/dashboard/Dashboard.test.tsx` where harness exists.
- [x] 4.4 Run verification commands from `frontend/`: `npm run test` (or project equivalent) and `npm run build`; record that no backend/domain files changed.
