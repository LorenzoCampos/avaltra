## Exploration: place-to-place-transfers

### Current State
Places are modeled as `payment_containers` (table + CRUD API) and used as the primary payment context in transactions (`expenses.source_container_id`, `incomes.destination_container_id`). Frontend forms already require an active place for manual expense/income creation and prefill account defaults. Dashboard place balances (`money_by_container`) are derived from `incomes (+)` and `expenses (-)` aggregated by container; there is no transfer domain/table/API today. Activity supports only `income`, `expense`, `savings_deposit`, and `savings_withdrawal` types.

### Affected Areas
- `backend/migrations/023_create_payment_containers.up.sql` — establishes place model and transaction container columns.
- `backend/internal/handlers/payment_containers/*.go` — place management API; potential source/destination validation reuse.
- `backend/internal/handlers/dashboard/summary.go` — current per-place balance calculation; transfer impact on net place balances must be integrated.
- `backend/internal/handlers/activity/list.go` — activity union/type system would need transfer visibility if shown in timeline.
- `backend/internal/server/server.go` — would need transfer routes registration.
- `frontend/src/features/payment-containers/PaymentContainersPage.tsx` — likely entry point for transfer action/navigation.
- `frontend/src/features/expenses/ExpenseForm.tsx` and `frontend/src/features/incomes/IncomeForm.tsx` — existing place selectors/patterns to mirror for transfer form.
- `frontend/src/features/dashboard/Dashboard.tsx` and `frontend/src/types/dashboard.ts` — display logic relies on `money_by_container` from income/expense only.
- `frontend/src/hooks/useActivity.ts` — activity type union currently excludes transfer.

### Approaches
1. **Dual transaction records (expense + income pair)** — represent one transfer as linked expense and income rows.
   - Pros: Reuses existing tables/forms/queries with minimal new API surface.
   - Cons: Semantically wrong (fake expense/income), pollutes reports/category analytics, brittle linking/rollback, conflicts with product goal.
   - Effort: Medium

2. **Dedicated transfer domain (recommended)** — add `place_transfers` table + handler/API; optionally project to activity and dashboard queries.
   - Pros: Correct accounting semantics, no fake P&L impact, clearer audit trail, cleaner future extension (fees/status/reference).
   - Cons: More code surface (migration + handler + frontend form + dashboard/activity integration), requires explicit currency policy.
   - Effort: High

### Recommendation
Use a dedicated `place_transfers` domain. For v1, enforce **same-currency only** (source and destination places must share account currency or identical place currency if added later), store one transfer record with source place, destination place, amount, date, optional note, and account_id. Then update dashboard `money_by_container` computation to include transfers (`-amount` from source, `+amount` to destination) without touching income/expense totals. Add transfer items to activity as a new type only if product wants timeline visibility now; otherwise keep transfer history in its own list first to reduce scope.

### Risks
- Dashboard correctness risk: transfer math must adjust per-place balances without altering available balance/P&L semantics.
- Multi-currency ambiguity: current place model has no per-place currency field, so conversion logic would be underspecified.
- Scope risk vs 400-line review budget: backend migration+handler+tests plus frontend form/routes/types likely exceeds one review slice.
- Reporting/exports risk: if transfers appear in activity/exports, consumers expecting current activity type union may break.

### Ready for Proposal
Yes — with constraints: propose v1 as same-currency, account-scoped transfers only, and split delivery into chained PRs (backend model/API first, then dashboard/activity integration, then UI flow).
