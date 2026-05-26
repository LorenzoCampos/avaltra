# Apply Progress: Transaction History Recurring Activity

## Slice Status

- Slice A is complete for packaging: A1 backend pagination contract tests, A2 frontend hooks/types, and A3/A4 expense/income pagination controls are implemented.
- Coverage is honest and bounded: backend coverage is handler contract-level; frontend coverage is hook/helper-level for params, metadata, query keys, and pagination state. There is no mounted component test for the `ExpenseList`/`IncomeList` pagination controls.
- Slice B is complete: recurring expense/income GET handlers return date fields as `YYYY-MM-DD`, and recurring edit forms defensively normalize timestamp-like date values before hydrating date inputs.
- Slice C is complete: Activity expense/income rows navigate to existing edit routes, while savings/non-transaction rows remain non-navigable.
- Package boundary: include this SDD change only; exclude `branding/` and spreadsheet artifacts.

## 2026-05-26 - A1 Backend Pagination Contracts

- Added contract tests for `GET /expenses` and `GET /incomes` pagination metadata: `total_count`, `page`, `limit`, `total_pages`.
- Covered default page/limit behavior, max limit bounding, offset calculation, and filter/sort/page argument consistency.
- Confirmed list handlers return bounded pagination metadata consistently with filtered totals.

## 2026-05-26 - A2 Frontend List Types and Hook Wiring

- Completed frontend list response type alignment for `GET /expenses` and `GET /incomes` pagination metadata: `total_count`, `page`, `limit`, `total_pages`.
- Added hook params support for `page`, `limit`, `date_from`, `date_to`, `category_id`, `family_member_id`, `sort_by`, `order`, plus backend-specific `expense_type` and `income_type`.
- Fixed `useExpenses` default list query to send `expense_type=one-time` instead of ignored legacy `type=one-time`.
- Added default bounded list params (`page=1`, `limit=20`, `sort_by=date`, `order=desc`) without implementing UI pagination controls yet.
- Added focused Vitest helper coverage for param mapping, query-key page separation, and metadata count behavior.

## Verification

- `npm test -- useTransactionLists.test.ts` passed.
- `npm run typecheck` passed.
- `npx eslint src/types/expense.ts src/types/income.ts src/hooks/useExpenses.ts src/hooks/useIncomes.ts src/hooks/useTransactionLists.test.ts` passed.

## 2026-05-26 - A3/A4 Expense and Income List Pagination UI

- Added bounded page navigation to `ExpenseList` and `IncomeList` using the A2 hook params (`page`, `limit`) and metadata (`total_count`, `page`, `limit`, `total_pages`).
- Replaced unfiltered list counts with server `total_count` so the UI no longer presents the first 20 rows as the complete history.
- Added shared `ListPaginationControls` and `getListPaginationState` helper for consistent expense/income UX.
- Reset list page to 1 when the active account changes.
- Preserved existing `FilterBar` behavior as client-side filtering over the loaded page, and added a visible notice when filters are active across multi-page history so users are not told unloaded pages were searched.
- Added focused helper coverage for pagination range/navigation state.

## Verification

- `npm test -- useTransactionLists.test.ts` passed.
- `npm run typecheck` passed.
- `npx eslint src/features/expenses/ExpenseList.tsx src/features/incomes/IncomeList.tsx src/hooks/useTransactionLists.test.ts src/lib/listPagination.ts src/components/ListPaginationControls.tsx` passed.

## 2026-05-26 - Slice B Recurring Date Hydration

- Added recurring expense and recurring income GET handler tests that assert `start_date` and `end_date` serialize as HTML date-input compatible `YYYY-MM-DD` values.
- Added narrow store interfaces for recurring GET handlers so pgxmock can cover response serialization without changing public route wiring.
- Updated recurring expense/income GET handlers to format scanned `time.Time` date values as `2006-01-02`, while preserving fallback behavior for existing string-like values.
- Added shared frontend `toDateInputValue` normalizer and wired both recurring edit forms to normalize hydrated `start_date`/`end_date` values before `setValue`.

## Verification

- `go test ./internal/handlers/recurring_expenses ./internal/handlers/recurring_incomes` passed.
- `npm test -- dateInput.test.ts` passed.
- `npm run typecheck` passed.
- `npx eslint src/lib/dateInput.ts src/lib/dateInput.test.ts src/features/recurring-expenses/RecurringExpenseForm.tsx src/features/recurring-incomes/RecurringIncomeForm.tsx` completed with existing React Hook Form `watch()`/missing `t` dependency warnings and 0 errors.

## 2026-05-26 - Slice C Activity Navigation Safety

- Added focused Vitest coverage for Activity transaction route resolution and keyboard activation keys.
- Added guarded route mapping for Activity rows: `expense -> /expenses/edit/:id`, `income -> /incomes/edit/:id`.
- Kept savings deposit/withdrawal and id-less activity items non-navigable by omitting click handlers, keyboard handlers, button role, and tab stop when no transaction route exists.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `frontend/src/features/activity/components/ActivityFeed.test.ts` | Unit | N/A — no existing ActivityFeed tests | ✅ Failing tests written first; helpers were undefined | ✅ `npm test -- src/features/activity/components/ActivityFeed.test.ts` passed after implementation | ✅ Expense, income, savings, id-less, Enter/Space, and Escape cases | ✅ Extracted navigation helpers to `frontend/src/features/activity/lib/activityNavigation.ts`; tests still passed |
| 4.2 | `frontend/src/features/activity/components/ActivityFeed.test.ts` | Unit | N/A — covered by 4.1 cycle for same files | ✅ Route/guard expectations written before production code | ✅ Activity rows use the tested helper before navigating | ✅ Unsupported route path stays `null`; keyboard guard only handles activation keys | ✅ Moved non-component exports out of `ActivityFeed.tsx` to satisfy Fast Refresh lint |

### Verification

- `npm test -- src/features/activity/components/ActivityFeed.test.ts` passed.
- `npm run typecheck` passed.
- `npx eslint src/features/activity/components/ActivityFeed.tsx src/features/activity/components/ActivityFeed.test.ts src/features/activity/lib/activityNavigation.ts` passed.

## Remaining

- Full server-side parity for existing search/amount/multi-select filters remains out of scope for A3/A4; current filters are explicitly page-local in the UI.
- No mounted component test exists for the expense/income list pagination controls; current frontend coverage is helper/contract-level.
