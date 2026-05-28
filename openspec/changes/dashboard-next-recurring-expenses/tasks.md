# Tasks: Dashboard Next Recurring Expenses

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 240-340 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend forecast field + tests | PR 1 | Base main; includes RED/GREEN/REFACTOR backend cycle. |
| 2 | Frontend render + i18n + tests | PR 1 | Same PR; no client recurrence math. |

## Phase 1: Foundation / Contracts

- [x] 1.1 Update `frontend/src/types/dashboard.ts` to include `next_month_recurring_expense_total: number` in `DashboardSummary`.
- [x] 1.2 In `backend/internal/handlers/dashboard/summary.go`, extend response struct with `next_month_recurring_expense_total` always present.
- [x] 1.3 Add UTC next-calendar-month boundary helper in `backend/internal/handlers/dashboard/summary.go` (`start`, `endExclusive`).

## Phase 2: Backend TDD (RED → GREEN → REFACTOR)

- [x] 2.1 RED: Add failing tests in `backend/internal/handlers/dashboard/summary_test.go` for summary includes field and `0` when no qualifying occurrences (Spec scenarios: Summary includes projected amount, No next-month recurring expenses).
- [x] 2.2 RED: Add failing tests for active-account isolation via `X-Account-ID` and cross-account exclusion (Spec scenarios: Active account isolation, Cross-account data excluded).
- [x] 2.3 RED: Add failing tests for mixed-currency normalization using `COALESCE(amount_in_primary_currency, amount)` and inactive/no-occurrence exclusion.
- [x] 2.4 RED: Add failing month-boundary tests (Jan→Feb, Dec→Jan, day-31 clamp) asserting parity with `pkg/recurrence.ShouldOccurOnDate`.
- [x] 2.5 GREEN: Implement forecast query/loop in `backend/internal/handlers/dashboard/summary.go` scoped to `recurring_expenses.account_id = activeAccountID AND is_active = true`, iterating next-month UTC dates.
- [x] 2.6 GREEN: Sum one projected amount per occurrence date using normalized fallback (`amount_in_primary_currency` else `amount`) and set response field.
- [x] 2.7 REFACTOR: Extract small private helpers in `backend/internal/handlers/dashboard/summary.go` for date window and per-template projection to keep handler readable.

## Phase 3: Frontend TDD (RED → GREEN)

- [x] 3.1 RED: Add failing assertions in `frontend/src/features/dashboard/Dashboard.test.ts` that labeled next-month recurring forecast is visible when API returns the field.
- [x] 3.2 RED: Add failing assertion that dashboard rendering uses backend `next_month_recurring_expense_total` only, with no client recurrence aggregation utilities.
- [x] 3.3 GREEN: Render forecast insight/card in `frontend/src/features/dashboard/Dashboard.tsx` using `formatMoney(next_month_recurring_expense_total, primaryCurrency)`.
- [x] 3.4 GREEN: Add copy keys in `frontend/src/i18n/locales/en/dashboard.json` and `frontend/src/i18n/locales/es/dashboard.json` for label/tooltip text.

## Phase 4: Verification / Regression

- [x] 4.1 Run backend tests covering new summary scenarios in `backend/internal/handlers/dashboard/summary_test.go` and ensure all RED cases now pass.
- [x] 4.2 Run frontend tests in `frontend/src/features/dashboard/Dashboard.test.ts` to confirm visibility and no client-side recurrence math.
- [x] 4.3 Verify response contract manually/fixture: `next_month_recurring_expense_total` always present and numeric for active account summary.
