## Exploration: dashboard-next-recurring-expenses

### Current State
- Dashboard data is fetched from a single endpoint, `GET /api/dashboard/summary`, via `useDashboard()` (`frontend/src/hooks/useDashboard.ts`) using the active account in `X-Account-ID`.
- Backend summary calculation is account-scoped and query-driven in `backend/internal/handlers/dashboard/summary.go`:
  - monthly totals (`total_income`, `total_expenses`) use `TO_CHAR(date, 'YYYY-MM') = $month`
  - current accumulated balance uses historical sums (`current_available_balance`)
  - multi-currency totals are normalized through `amount_in_primary_currency`.
- Recurring expenses are template-based (`recurring_expenses` table) and real expense rows are generated daily by scheduler (`backend/pkg/scheduler/recurring_expenses.go`) into `expenses` with `expense_type='recurring'`.
- Dashboard already exposes `upcoming_recurring`, but it is a **7-day window list** (not next-month total), and each item returns original `amount` + `currency` only.

### Affected Areas
- `backend/internal/handlers/dashboard/summary.go` — add/compute a new “next recurring expenses” aggregate in summary response.
- `backend/internal/handlers/dashboard/summary_test.go` — extend API contract and expectations for new field(s).
- `frontend/src/types/dashboard.ts` — add typed field(s) for new insight/card payload.
- `frontend/src/features/dashboard/Dashboard.tsx` — render a new dashboard card/insight using existing account-scoped summary pattern.
- `frontend/src/features/dashboard/Dashboard.test.ts` — update semantics/copy assertions for new card behavior.
- `frontend/src/i18n/locales/*/dashboard.json` (likely) — add translations for title/subtitle/tooltip.

### Approaches
1. **Server-computed next-calendar-month total** — backend computes a normalized total for occurrences in next calendar month and returns one dedicated summary field.
   - Pros: Follows existing dashboard pattern (single summary payload, account-scoped, normalized money); deterministic product meaning; no client-side recurrence math duplication.
   - Cons: Requires recurrence-window logic wider than current 7-day helper; needs careful handling of month boundaries and recurrence rules.
   - Effort: Medium

2. **Client-computed estimate from recurring templates list** — frontend derives monthly estimate from recurring templates (similar to `RecurringExpensesList` heuristic).
   - Pros: Smaller backend change; faster UI iteration.
   - Cons: Inconsistent with dashboard as source-of-truth; heuristic (30/4/etc.) can diverge from real scheduled occurrences; duplicate logic already noted as approximate elsewhere.
   - Effort: Low/Medium

### Recommendation
Use **Approach 1** (server-computed). The dashboard already centralizes financial truth in backend summary and normalizes to account currency using `amount_in_primary_currency`. This also resolves multi-currency and scope decisions consistently.

For product semantics, prefer **next calendar month** over next 30 days:
- aligns with existing `YYYY-MM` dashboard period model,
- easier user mental model for bills/planning,
- stable values during the month (vs rolling daily drift).

### Risks
- **Recurrence accuracy risk**: extending from current 7-day lookup to full next-month aggregation must correctly account for interval/day-of-week/day-of-month rules and occurrence caps.
- **Currency consistency risk**: templates may have null `amount_in_primary_currency`; backend must define fallback (existing pattern: derive from `amount`/`exchange_rate` similarly to scheduler/list logic).
- **UI contract drift**: adding fields to summary can require coordinated updates across TS types, tests, and i18n copy.
- **Scope misunderstanding risk**: dashboard is account-scoped via `X-Account-ID`; attempting family/global totals would break existing patterns.

### Ready for Proposal
Yes — with explicit proposal decisions:
1) semantic window = next calendar month, 2) scope = active account only, 3) amount returned in account primary currency (plus optional count/details if UX needs them).
