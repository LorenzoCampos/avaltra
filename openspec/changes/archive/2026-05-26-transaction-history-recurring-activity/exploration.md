## Exploration: transaction-history-recurring-activity

### Current State
- Expenses and incomes list endpoints (`GET /expenses`, `GET /incomes`) do **not** enforce a default month filter in backend; they only filter by dates when `date_from/date_to` are provided.
- Both list handlers default to `limit=20` and paginate. Frontend list hooks (`useExpenses`, `useIncomes`) call list endpoints without `page/limit` controls, so users only see the newest 20 records.
- `useExpenses` sends `params: { type: 'one-time' }`, but backend expects `expense_type`; this param is currently ignored.
- Recurring edit forms hydrate `start_date`/`end_date` directly from API response (`setValue('start_date', expenseData.start_date)` and equivalent for incomes).
- Recurring GET handlers stringify date fields with `fmt.Sprint(interface{})`, which can produce full timestamp strings not compatible with `<input type="date">` (`YYYY-MM-DD` required).
- Activity items currently expose only `id` + `type` + descriptive metadata; cards are not navigable today.
- Routes available in frontend for transaction-level navigation are edit routes (`/expenses/edit/:expenseId`, `/incomes/edit/:incomeId`); no dedicated read-only detail routes exist.

### Affected Areas
- `frontend/src/hooks/useExpenses.ts` — list query params and no pagination controls.
- `frontend/src/hooks/useIncomes.ts` — list query params and no pagination controls.
- `backend/internal/handlers/expenses/list.go` — pagination defaults (`limit=20`) and supported query contract.
- `backend/internal/handlers/incomes/list.go` — pagination defaults (`limit=20`) and supported query contract.
- `frontend/src/features/recurring-expenses/RecurringExpenseForm.tsx` — edit hydration for `start_date/end_date`.
- `frontend/src/features/recurring-incomes/RecurringIncomeForm.tsx` — edit hydration for `start_date/end_date`.
- `backend/internal/handlers/recurring_expenses/get.go` — recurring expense API date serialization.
- `backend/internal/handlers/recurring_incomes/get.go` — recurring income API date serialization.
- `frontend/src/hooks/useActivity.ts` — activity payload type (currently no entity-specific route metadata).
- `frontend/src/features/activity/components/ActivityFeed.tsx` — card UX, currently non-clickable.
- `frontend/src/App.tsx` — confirms available destination routes for expense/income records.

### Approaches
1. **Minimal bugfix + clickable card routing (recommended)**
   - Scope:
     - Fix list visibility by requesting larger list window from frontend and/or wiring basic pagination params.
     - Normalize recurring API date output to strict `YYYY-MM-DD` (backend) or defensively normalize in frontend hydration.
     - Make Activity cards navigable for `income|expense` types only.
   - Pros:
     - Directly resolves user pain with smallest architectural impact.
     - Likely fits mini-SDD and review budget if done with narrow changes and targeted tests.
     - Keeps existing routes and data model.
   - Cons:
     - If historical volume is large, “bigger limit” is a short-term mitigation; true pagination UX may still be needed.
     - Activity still lacks dedicated detail pages; likely links to edit forms.
   - Effort: Medium.

2. **Full pagination/filters + new transaction detail pages**
   - Scope:
     - Implement explicit paginated list UI for expenses/incomes.
     - Add read-only detail pages for transaction entities and link Activity there.
     - Extend activity contract with route-safe metadata for broader entity coverage.
   - Pros:
     - Most scalable and semantically clean long-term result.
   - Cons:
     - High blast radius and very likely above 400 changed-line budget.
     - Introduces new UX and routing behavior not required for this request.
   - Effort: High.

### Recommendation
Use **Approach 1** in the next phase.

Root-cause hypotheses to carry forward:
1. **“Current month only” is mostly a pagination illusion**: backend default `limit=20` + no frontend pagination controls causes only latest records to render (often all in current month).
2. **Recurring start date not shown**: recurring detail endpoints serialize DB date via `fmt.Sprint`, which can return timestamp-like strings not accepted by HTML date inputs.
3. **Activity cannot navigate to related transaction**: cards lack click handler and activity payload only provides generic `id/type`; however this is enough for `income|expense` routes.

### Risks
- **Contract mismatch risk**: list response types in frontend use `count`, backend returns `total_count`; touching pagination may surface latent type/UX inconsistencies.
- **Data volume risk**: increasing fetch limit can impact payload size; true pagination may still be needed if accounts are large.
- **Navigation safety risk**: Activity includes savings rows too; routing must guard by `type` to avoid broken links.
- **Scope creep risk**: adding dedicated detail pages would exceed mini-scope and threaten 400-line budget.

### Ready for Proposal
Yes — ready for `sdd-propose`.

Suggested slice strategy for 400-line budget:
- Slice A (bugs): historical list visibility + recurring date hydration contract.
- Slice B (enhancement): activity-to-expense/income navigation only.

Decision guard forecast (for tasks phase):
- Decision needed before apply: **Yes** (confirm whether temporary higher limit is acceptable vs immediate pagination UI).
- Chained PRs recommended: **Maybe/Yes if both slices plus tests exceed 400 lines**.
- 400-line budget risk: **Medium**.
