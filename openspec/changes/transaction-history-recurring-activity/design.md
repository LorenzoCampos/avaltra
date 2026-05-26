# Design: Transaction History, Recurring Date Hydration, and Activity Navigation

## Technical Approach

Use the existing endpoint, hook, and route structure, but make history visibility definitive: backend lists remain bounded by page size and expose `page`, `limit`, `total_count`, `total_pages`; frontend expense/income screens add pagination or load-more controls instead of treating a larger first page as final. Filters/sort travel with page requests and reset safely when changed. Recurring detail endpoints should format date columns as `YYYY-MM-DD`; forms may add a small defensive normalizer before `setValue`. Activity navigation should be frontend-only and guarded to `expense`/`income`, using existing edit routes.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| History visibility | Implement real page/load-more UX over backend pagination | Use `limit=100` as final fix; remove backend limit | Pagination is the only complete fix: no silent truncation and no unbounded payloads. |
| Count contract | Treat backend `total_count`, `page`, `limit`, `total_pages` as source of truth; update frontend response types and optimistic metadata | Add `count` alias or keep stale types | Backend contract is already explicit and symmetric across expenses/incomes/activity. Frontend should match it. |
| Filter/page state | Keep page state with list filters/sort; reset to page 1 when result-set criteria change | Filter only already-loaded rows forever | Client-only filtering over a partial page hides historical matches. |
| Recurring dates | Format backend recurring GET dates with date-aware helper; keep defensive frontend `toDateInputValue` | Frontend-only string split | Backend owns API shape. Frontend guard prevents regressions from timestamp-like legacy values. |
| Activity target | Use `activity.type` + `activity.id` to navigate to `/expenses/edit/:id` or `/incomes/edit/:id` only | New detail pages; savings routing | Existing routes are available; savings/other activity must stay non-clickable to avoid broken navigation. |
| Delivery | Slice A history pagination; Slice B recurring date hydration; Slice C Activity navigation | Single broad PR | The definitive history fix is larger than the bounded workaround; slices protect the 400-line review budget. |

## Data Flow

```text
ExpenseList/IncomeList filters/page state
  -> useExpenses/useIncomes
  -> GET /expenses|/incomes?page=N&limit=pageSize&sort/filter params
  <- items + total_count + page + limit + total_pages
  -> pagination/load-more controls decide next page

RecurringForm -> useRecurringExpense/useRecurringIncome -> GET recurring detail
                                <- start_date/end_date as YYYY-MM-DD -> form date inputs

ActivityFeed -> ActivityCard click -> guarded route mapping -> existing edit form
```

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/src/hooks/useExpenses.ts` | Modify/Test | Accept list params, send `expense_type=one-time`, page/limit/filter/sort, expose pagination metadata. |
| `frontend/src/hooks/useIncomes.ts` | Modify/Test | Mirror expense params with `income_type=one-time` and pagination metadata. |
| `frontend/src/types/expense.ts` | Modify | Replace `count/summary` assumption with backend pagination fields and list params. |
| `frontend/src/types/income.ts` | Modify | Add backend query params and pagination response fields. |
| `frontend/src/features/expenses/ExpenseList.tsx` | Modify/Test | Add page/load-more state and controls; preserve filters/sort and reset page on result-set changes. |
| `frontend/src/features/incomes/IncomeList.tsx` | Modify/Test | Same pagination/load-more behavior for incomes. |
| `backend/internal/handlers/expenses/list.go` | Test/Modify if needed | Verify limit default/max, total metadata, filters, sort, offset. |
| `backend/internal/handlers/incomes/list.go` | Test/Modify if needed | Mirror expenses list contract tests. |
| `backend/internal/handlers/recurring_expenses/get.go` | Modify/Test | Format `start_date`/`end_date` as `2006-01-02`; leave timestamps as RFC3339 or current compatible string. |
| `backend/internal/handlers/recurring_incomes/get.go` | Modify/Test | Same date formatting for recurring incomes. |
| `frontend/src/features/recurring-expenses/RecurringExpenseForm.tsx` | Modify/Test | Normalize hydrated `start_date`/`end_date` before `setValue`. |
| `frontend/src/features/recurring-incomes/RecurringIncomeForm.tsx` | Modify/Test | Same hydration guard for incomes. |
| `frontend/src/features/activity/components/ActivityFeed.tsx` | Modify/Test | Add click/keyboard affordance only when route target exists. |

## Interfaces / Contracts

- `GET /expenses` and `GET /incomes` remain bounded: `limit` defaults 20, max 100, response includes `total_count`, `page`, `limit`, `total_pages`.
- Frontend list hooks accept `page`, `limit`, `date_from`, `date_to`, `category_id`, `family_member_id`, `sort_by`, `order`, and set `expense_type|income_type: 'one-time'` by default.
- Expense/income screens expose pagination or load-more when `page < total_pages`; filter/sort changes reset to a valid page and preserve criteria on later page requests.
- Recurring detail `start_date` and `end_date` MUST be `YYYY-MM-DD` when present.
- Activity route mapping: `expense -> /expenses/edit/{id}`, `income -> /incomes/edit/{id}`, otherwise no navigation role/click handler.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend | List cap/metadata/filter/sort and date formatting | Go handler tests with pgxmock rows containing `time.Time`; assert pagination metadata and JSON dates. |
| Frontend hooks/types | Params and metadata expectations | Vitest with mocked `api.get` or focused helper tests if existing hook test setup is too heavy. |
| Frontend lists | Load-more/pagination behavior | Component/helper tests for next page, filter reset, and no stale mixed result sets. |
| Frontend forms | Timestamp-like recurring dates hydrate as date inputs | Extract/test `toDateInputValue`, then use in both forms. |
| Frontend activity | Expense/income click navigates; savings does not | Component test with mocked router navigation and activity payloads. |

## Migration / Rollout

No migration required. Roll out in review-safe slices: Slice A transaction history pagination/load-more for expenses/incomes; Slice B recurring edit date hydration; Slice C Activity detail navigation. Combine slices only if `sdd-tasks` forecast proves safe under the 400-line review budget.

## Open Questions

- [ ] None blocking; tasks should forecast line count before deciding whether slices can be combined.
