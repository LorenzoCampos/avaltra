# Design: Dashboard Next Recurring Expenses

## Technical Approach

Extend `GET /api/dashboard/summary` with a backend-only forecast field, `next_month_recurring_expense_total`, computed for the active `X-Account-ID` account. The handler will reuse the existing `pkg/recurrence` occurrence rules to scan active recurring-expense templates for the next calendar month, sum one projected amount per occurrence date, and return the total in account primary currency. The frontend only types and renders the field; it must not aggregate recurrence rules.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Forecast location | Add helper(s) in `backend/internal/handlers/dashboard/summary.go` | New scheduler service or recurring handler endpoint | Keeps the change local to dashboard summary and avoids scheduler redesign. |
| Recurrence parity | Use `recurrence.ShouldOccurOnDate` over every UTC date in next calendar month | Reimplement frequency math in SQL or frontend | Matches scheduler logic and tests month-end clamp behavior in one package. |
| Currency total | Sum `COALESCE(amount_in_primary_currency, amount)` | Convert on the fly or expose source-currency totals | Existing scheduler falls back the same way when generating expenses; dashboard totals are primary-currency normalized. |
| Account scope | Query `recurring_expenses WHERE account_id = $1 AND is_active = true` from existing context | Family/global projection | Preserves dashboard account middleware contract and avoids cross-account leakage. |
| UI placement | Add a compact dashboard card/insight near existing summary/insights | Client-side forecast calculation | Makes the forecast visible while keeping backend as source of truth. |

## Data Flow

    Dashboard.tsx ──useDashboard──> GET /dashboard/summary + X-Account-ID
          ↑                              │
          │                              ├─ query active recurring_expenses
          │                              ├─ recurrence.ShouldOccurOnDate(date)
          │                              └─ sum normalized amount
          └──────── render returned next_month_recurring_expense_total

`next month` is calendar-based: compute `start := first day of current UTC month + 1 month`, `endExclusive := start + 1 month`. Iterate `[start, endExclusive)`. This avoids “next 30 days” drift. Since recurrence dates are stored as SQL `DATE` and existing recurrence normalization uses UTC midnight, keep all forecast boundary dates at UTC midnight. Month-boundary tests must cover Jan→Feb, Dec→Jan, and day 31 clamping.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/handlers/dashboard/summary.go` | Modify | Add response field, recurring forecast loader variable/helper, UTC next-month window helper, normalized sum query/loop. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modify | Add tests for account scope, no matches returns zero, mixed normalized values, month boundary/clamp behavior. |
| `frontend/src/types/dashboard.ts` | Modify | Add `next_month_recurring_expense_total: number` to `DashboardSummary`. |
| `frontend/src/features/dashboard/Dashboard.tsx` | Modify | Render backend value with `formatMoney(..., primaryCurrency)` and localized label/tooltip. |
| `frontend/src/features/dashboard/Dashboard.test.ts` | Modify | Assert copy exists and rendering helpers/types do not perform recurrence aggregation. |
| `frontend/src/i18n/locales/en/dashboard.json` | Modify | Add English forecast label/copy. |
| `frontend/src/i18n/locales/es/dashboard.json` | Modify | Add Spanish forecast label/copy. |

## Interfaces / Contracts

```json
{
  "next_month_recurring_expense_total": 125000
}
```

The field is always present. It is `0` when no active recurring expense has a projected occurrence inside the next calendar month.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Next-month window and recurrence matching | Go tests around helper using fixed `today` values. |
| Handler | Account isolation and normalized sum | `pgxmock` expectations for `account_id`, mixed `amount_in_primary_currency`, inactive/end-date exclusions. |
| Frontend | Backend-provided rendering | Vitest for dashboard copy/types; no recurrence-rule aggregation helpers. |

## Migration / Rollout

No migration required. Additive JSON field is backward-compatible; rollback removes field, helper, UI card, and tests.

## Open Questions

- [ ] None blocking.
