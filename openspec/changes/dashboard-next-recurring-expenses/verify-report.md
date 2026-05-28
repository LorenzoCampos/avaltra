# Verification Report: Dashboard Next Recurring Expenses

**Change**: dashboard-next-recurring-expenses
**Version**: N/A
**Mode**: Standard verify; no `openspec/config.*` strict TDD config found and orchestrator did not declare strict TDD active.
**Date**: 2026-05-28

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

## Build & Tests Execution

**Working tree check**: ✅ Completed

```text
Command: git status --short
Workdir: /home/devuser/projects/bolsillo-claro
Outcome: expected modified implementation/test/i18n/OpenSpec files plus ignored-for-packaging local untracked `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx`.
```

**Backend dashboard tests**: ✅ Passed

```text
Command: go test -count=1 ./internal/handlers/dashboard
Workdir: backend
Outcome: ok github.com/LorenzoCampos/avaltra/internal/handlers/dashboard 0.054s
```

**Backend recurrence tests**: ✅ Passed

```text
Command: go test -count=1 ./pkg/recurrence
Workdir: backend
Outcome: ok github.com/LorenzoCampos/avaltra/pkg/recurrence 0.027s
```

**Frontend dashboard tests**: ✅ Passed

```text
Command: npm test -- --run src/features/dashboard/Dashboard.test.ts
Workdir: frontend
Outcome: 1 file passed; 17 tests passed. Includes runtime component coverage for the forecast card using API value `next_month_recurring_expense_total`.
```

**Frontend typecheck**: ✅ Passed

```text
Command: npm run typecheck
Workdir: frontend
Outcome: tsc --noEmit -p tsconfig.app.json exited 0
```

**Coverage**: ➖ Not available; focused commands did not emit coverage.

## Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Summary exposes next-month recurring expense projection | Summary includes projected amount | `backend/internal/handlers/dashboard/summary_test.go > TestGetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance`; `TestGetNextMonthRecurringExpenseTotalScopesToActiveAccountAndSumsQualifyingOccurrences` | ✅ COMPLIANT |
| Summary exposes next-month recurring expense projection | No next-month recurring expenses | `backend/internal/handlers/dashboard/summary_test.go > TestGetNextMonthRecurringExpenseTotalReturnsZeroWhenNoTemplates`; `TestProjectedRecurringExpenseAmountUsesRecurringRulesAndNormalizedFallback/excludes templates with no next month occurrence` | ✅ COMPLIANT |
| Projection is active-account scoped | Active account isolation | `backend/internal/handlers/dashboard/summary_test.go > TestGetNextMonthRecurringExpenseTotalScopesToActiveAccountAndSumsQualifyingOccurrences` verifies the active account query argument and sums only returned active-account rows | ✅ COMPLIANT |
| Projection is active-account scoped | Cross-account data excluded | `backend/internal/handlers/dashboard/summary_test.go > TestGetNextMonthRecurringExpenseTotalScopesToActiveAccountAndSumsQualifyingOccurrences` verifies `WHERE account_id = $1` with the requested account ID | ✅ COMPLIANT |
| Projection uses normalized primary-currency amounts | Mixed-currency recurring templates | `backend/internal/handlers/dashboard/summary_test.go > TestGetNextMonthRecurringExpenseTotalScopesToActiveAccountAndSumsQualifyingOccurrences`; `TestProjectedRecurringExpenseAmountUsesRecurringRulesAndNormalizedFallback/uses normalized amount...`; `.../uses query-provided fallback amount...` | ✅ COMPLIANT |
| Projection uses normalized primary-currency amounts | Ineligible recurring templates excluded | `backend/internal/handlers/dashboard/summary_test.go > TestProjectedRecurringExpenseAmountUsesRecurringRulesAndNormalizedFallback/excludes inactive templates from projected amount`; `.../excludes templates with no next month occurrence`; query expectation verifies `AND is_active = true` | ✅ COMPLIANT |
| Frontend renders backend-provided forecast only | Forecast insight is visible | `frontend/src/features/dashboard/Dashboard.test.ts > dashboard next-month recurring forecast > shows the forecast card using the backend-provided amount` | ✅ COMPLIANT |
| Frontend renders backend-provided forecast only | No client-side recurrence math | `frontend/src/features/dashboard/Dashboard.test.ts > dashboard next-month recurring forecast > renders the backend next_month_recurring_expense_total field without client recurrence aggregation`; source inspection of `Dashboard.tsx` | ✅ COMPLIANT |

**Compliance summary**: 8/8 scenarios compliant; 0/8 partial; 0/8 failing.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| API field always exposed | ✅ Implemented | `DashboardSummaryResponse.NextMonthRecurringExpenseTotal` has JSON key `next_month_recurring_expense_total` and is populated in the response. |
| Next calendar month, not next 30 days | ✅ Implemented | `nextCalendarMonthWindow(today)` computes first day of next UTC calendar month and exclusive first day of following month; tests cover Jan→Feb and Dec→Jan, while projection tests cover day-31 clamp into February. |
| Active account scope | ✅ Implemented | `getNextMonthRecurringExpenseTotal` queries `recurring_expenses WHERE account_id = $1 AND is_active = true` using the active account ID from dashboard context. |
| Primary-currency normalized amount | ✅ Implemented | Query selects `COALESCE(amount_in_primary_currency, amount) AS amount_in_primary_currency` and sums that value per occurrence. |
| Recurrence parity | ✅ Implemented | Projection delegates occurrence matching to `recurrence.ShouldOccurOnDate`. |
| Inactive templates excluded | ✅ Implemented | SQL filters `is_active = true`; projection helper also returns zero when a scanned template is inactive. |
| Non-occurring templates excluded | ✅ Implemented | `projectedRecurringExpenseAmount` only sums when `ShouldOccurOnDate` returns true for dates in `[start, endExclusive)`. |
| Frontend uses backend field | ✅ Implemented | `Dashboard.tsx` destructures `next_month_recurring_expense_total` from `dashboard` and renders it via `formatMoney(..., primaryCurrency)`. |
| Frontend avoids recurrence math | ✅ Implemented | Dashboard source does not reference recurrence frequency, interval, or recurrence rule helpers and does not aggregate recurring templates. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Keep forecast in dashboard summary helper | ✅ Yes | Implemented in `backend/internal/handlers/dashboard/summary.go`. |
| Use `recurrence.ShouldOccurOnDate` | ✅ Yes | Projection loops UTC dates in next calendar month and delegates matching. |
| Sum `COALESCE(amount_in_primary_currency, amount)` | ✅ Yes | SQL query matches design fallback. |
| Scope by active account and active templates | ✅ Yes | SQL filters `account_id = $1 AND is_active = true`. |
| Frontend only types/renders field | ✅ Yes | Type added; UI renders returned value and localized copy from API data. |

## Prior Warning Resolution

| Prior warning | Status | Evidence |
|---------------|--------|----------|
| Zero case lacked direct runtime coverage | ✅ Resolved | `TestGetNextMonthRecurringExpenseTotalReturnsZeroWhenNoTemplates` covers empty result rows returning `0`; helper test also covers no next-month occurrence. |
| Inactive exclusion lacked direct runtime coverage | ✅ Resolved | `TestProjectedRecurringExpenseAmountUsesRecurringRulesAndNormalizedFallback/excludes inactive templates from projected amount` covers inactive templates returning `0`; SQL expectation also enforces `AND is_active = true`. |
| Frontend visibility lacked direct component/runtime coverage | ✅ Resolved | `Dashboard.test.ts > shows the forecast card using the backend-provided amount` renders `Dashboard` with mocked API data and asserts visible title, amount, and subtitle. |

## Issues Found

**CRITICAL**: None.

**WARNING**:
- Packaging tree still contains expected local untracked paths: `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx`; keep them out of staging.
- Focused verification commands did not emit coverage metrics.

**SUGGESTION**: None.

## Verdict

PASS WITH WARNINGS

All spec scenarios now have passing runtime test coverage, and the implementation matches the design. Remaining warnings are packaging/metrics-only, not implementation correctness blockers.
