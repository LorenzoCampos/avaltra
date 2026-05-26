# Proposal: Transaction History, Recurring Date Hydration, and Activity Navigation

## Intent

Fix three user-visible gaps: expense/income history must expose all historical records through bounded pagination, recurring edit forms must show saved start dates, and activity transaction items should open existing transaction routes safely.

## Scope

### In Scope
- Expense and income history list contract: backend pagination plus frontend pagination or load-more controls for all historical records.
- Pagination metadata and controls stay consistent with filters/sort; no silent truncation.
- Recurring expense/income edit hydration: API/form date values compatible with HTML `date` inputs (`YYYY-MM-DD`).
- Activity cards for `expense` and `income` navigate to existing destinations; other types stay safe.

### Out of Scope
- Transfers, savings goal places, credit/debt/card modeling, payment instrument removal, broad redesign.
- New read-only transaction detail pages or broad visual redesign.

## Capabilities

### New Capabilities
- `transaction-history`: Expense/income historical visibility with explicit backend pagination and frontend pagination/load-more UX.

### Modified Capabilities
- `recurring-payment-context`: Recurring template edit forms preserve and display saved start/end date values.
- `payment-containers`: Activity transaction rows may navigate to existing transaction routes.

## Approach

Implement the definitive history fix, not a larger one-page window: keep backend page-size bounds, use explicit `page`, `limit`, `total_count`, and `total_pages`, and expose frontend pagination/load-more for expenses and incomes. Filters/sort reset or retain pagination predictably. Normalize recurring date serialization at the backend, with defensive frontend normalization if needed. Add typed activity navigation only for `expense|income`, routing to existing edit paths.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/hooks/useExpenses.ts` | Modified | Accept page/filter/sort params and expose pagination metadata. |
| `frontend/src/hooks/useIncomes.ts` | Modified | Match expense pagination contract. |
| `frontend/src/features/expenses/ExpenseList.tsx` | Modified | Add pagination/load-more controls consistent with filters. |
| `frontend/src/features/incomes/IncomeList.tsx` | Modified | Add matching pagination/load-more controls. |
| `backend/internal/handlers/expenses/list.go` | Modified/Test | Verify page/limit/metadata/filter/sort contract. |
| `backend/internal/handlers/incomes/list.go` | Modified/Test | Verify symmetric params/defaults. |
| `backend/internal/handlers/recurring_expenses/get.go` | Modified | Emit `YYYY-MM-DD` dates. |
| `backend/internal/handlers/recurring_incomes/get.go` | Modified | Emit `YYYY-MM-DD` dates. |
| `frontend/src/features/activity/components/ActivityFeed.tsx` | Modified | Guarded transaction navigation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pagination UI size | Med | Slice history work separately and keep controls simple. |
| Response shape mismatch | Med | Test `total_count`, `total_pages`, `page`, `limit`, and list params. |
| Broken savings links | Low | Navigate only transaction activity. |

## Rollback Plan

Revert pagination/list UI changes, date serialization, and activity click handlers. No schema migration expected.

## Dependencies

- Existing expense/income edit routes in `frontend/src/App.tsx`.
- Existing backend list metadata (`total_count`, `page`, `limit`, `total_pages`) and page-size cap.

## Success Criteria

- [ ] Expense and income history exposes every matching historical record through pagination/load-more.
- [ ] Filters/sort and pagination remain consistent, with no silent truncation.
- [ ] Recurring expense/income edit forms show saved start dates in date inputs.
- [ ] Activity expense/income items navigate safely; other activity types do not break.
- [ ] Delivery is sliced: A history pagination, B recurring date hydration, C Activity navigation; combine only if task forecast stays under 400 changed lines.
