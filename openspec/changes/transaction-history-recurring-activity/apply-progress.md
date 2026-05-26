# Apply Progress: Transaction History Recurring Activity

## Slice Status

- Slice A is complete for packaging: A1 backend pagination contract tests, A2 frontend hooks/types, and A3/A4 expense/income pagination controls are implemented.
- Coverage is honest and bounded: backend coverage is handler contract-level; frontend coverage is hook/helper-level for params, metadata, query keys, and pagination state. There is no mounted component test for the `ExpenseList`/`IncomeList` pagination controls.
- Slice B recurring date hydration remains pending.
- Slice C Activity navigation safety remains pending.
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

## Remaining

- Full server-side parity for existing search/amount/multi-select filters remains out of scope for A3/A4; current filters are explicitly page-local in the UI.
- Slice B: recurring expense/income date hydration is still pending.
- Slice C: Activity detail navigation safety is still pending.
- No mounted component test exists for the expense/income list pagination controls; current frontend coverage is helper/contract-level.
