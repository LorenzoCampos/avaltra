# Tasks: Transaction History, Recurring Date Hydration, and Activity Navigation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 360-520 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Slice A -> PR2 Slice B -> PR3 Slice C |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Package boundary: include the transaction-history recurring/activity change only; exclude `branding/` and spreadsheet artifacts from this PR package.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Slice A: expense/income pagination/load-more | PR 1 | Base: main; biggest risk; include list + hook tests |
| 2 | Slice B: recurring edit date hydration | PR 2 | Independent rollback boundary; backend+form parity |
| 3 | Slice C: activity detail navigation | PR 3 | Small isolated UI behavior; non-transaction guard |

## Phase 1: Foundation Contracts

- [x] 1.1 RED: Added Go handler pagination contract tests for `GET /expenses` and `GET /incomes` metadata, default limit, max limit bounds, offset, and filter/sort/page argument consistency in `backend/internal/handlers/expenses/list_pagination_test.go` and `backend/internal/handlers/incomes/list_pagination_test.go`.
- [x] 1.2 GREEN: Aligned list handlers to return bounded `page`, `limit`, `total_count`, `total_pages` with filter/sort/page consistency.
- [x] 1.3 Update frontend list contracts in `frontend/src/types/expense.ts` and `frontend/src/types/income.ts` for page/limit/filter/sort request params and metadata fields.

## Phase 2: Slice A - History Pagination/Load-More

- [x] 2.1 RED: Added focused hook/helper coverage for `useExpenses`, `useIncomes`, query-key page separation, param/filter/sort carryover, metadata counts, and shared pagination state in `frontend/src/hooks/useTransactionLists.test.ts`; no mounted component test exists for `ExpenseList`/`IncomeList` controls.
- [x] 2.2 GREEN: Implement hook query wiring in `frontend/src/hooks/useExpenses.ts` and `frontend/src/hooks/useIncomes.ts` with one-time transaction filtering and metadata exposure.
- [x] 2.3 GREEN: Add pagination or load-more controls in `frontend/src/features/expenses/ExpenseList.tsx` and `frontend/src/features/incomes/IncomeList.tsx`; avoid silent truncation and stale mixed rows.
- [x] 2.4 REFACTOR: Extract shared list-pagination helper/state logic if duplication appears between expense and income screens.

## Phase 3: Slice B - Recurring Date Hydration

Slice B remains pending.

- [ ] 3.1 RED: Add backend tests for recurring expense/income get handlers asserting `start_date`/`end_date` serialization as `YYYY-MM-DD`.
- [ ] 3.2 GREEN: Implement date formatting in `backend/internal/handlers/recurring_expenses/get.go` and `backend/internal/handlers/recurring_incomes/get.go`.
- [ ] 3.3 RED/GREEN: Add and use a defensive date-input normalizer in `frontend/src/features/recurring-expenses/RecurringExpenseForm.tsx` and `frontend/src/features/recurring-incomes/RecurringIncomeForm.tsx`.

## Phase 4: Slice C - Activity Navigation Safety

Slice C remains pending.

- [ ] 4.1 RED: Add activity feed tests for click/keyboard navigation behavior by activity type in `frontend/src/features/activity/components/ActivityFeed.tsx`.
- [ ] 4.2 GREEN: Implement guarded route mapping: `expense -> /expenses/edit/:id`, `income -> /incomes/edit/:id`; no navigation for non-transaction items.

## Phase 5: Verification and Rollback Boundaries

- [ ] 5.1 Run verification: `cd backend && go test ./...`; `cd frontend && npm test`; `cd frontend && npm run build`.
- [ ] 5.2 Rollback boundary A: revert only pagination hooks/lists/types/backend list adjustments if Slice A regresses.
- [ ] 5.3 Rollback boundary B/C: revert recurring date hydration changes or activity navigation changes independently without affecting Slice A.
