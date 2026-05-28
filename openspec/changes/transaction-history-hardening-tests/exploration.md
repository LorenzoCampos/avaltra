## Exploration: transaction-history-hardening-tests

### Current State
- `transaction-history-recurring-activity` verified as PASS WITH WARNINGS; remaining warnings are exactly around mounted interaction coverage and filter scope.
- `ExpenseList.tsx` and `IncomeList.tsx` already have pagination state + controls wired (`setPage`, bounded prev/next, local-filter notice when `activeFiltersCount > 0 && pagination.total_pages > 1`).
- `ActivityFeed.tsx` wires navigation behavior at component level (`onClick`, `onKeyDown`, conditional `role="button"`, `tabIndex=0`) but tests currently only cover helper logic in `activityNavigation.ts`.
- Frontend tests currently run only `src/**/*.test.ts` (`frontend/vite.config.ts`), and repo currently has no `*.test.tsx` files.
- Existing tests are mostly logic/static-markup level (`renderToStaticMarkup`), so mounted event wiring regressions can pass unnoticed.

### Affected Areas
- `frontend/src/features/expenses/ExpenseList.tsx` — source of pagination callbacks and local filter notice condition.
- `frontend/src/features/incomes/IncomeList.tsx` — same pagination behavior; should stay symmetric with expenses.
- `frontend/src/components/ListPaginationControls.tsx` — actual button enabled/disabled behavior and callback dispatch point.
- `frontend/src/features/activity/components/ActivityFeed.tsx` — ActivityCard interaction and accessibility wiring.
- `frontend/src/features/activity/components/ActivityFeed.test.ts` — current helper-only tests; primary candidate to upgrade to mounted interaction checks.
- `frontend/vite.config.ts` — test include currently excludes `*.test.tsx`.

### Approaches
1. **Helper-only reinforcement** — add more pure-function tests without mounted DOM.
   - Pros: Very small diff, low setup risk.
   - Cons: Does not close the explicit mounted-interaction warnings.
   - Effort: Low.

2. **Minimal mounted hardening slice (recommended)** — add tiny DOM test harness + targeted mounted tests for pagination controls and Activity interactions.
   - Pros: Directly validates user-observable behavior (click + keyboard + disabled states); highest warning reduction per line changed.
   - Cons: Requires test setup changes (`*.test.tsx` discovery and jsdom/RTL support).
   - Effort: Medium.

### Recommendation
Use **Approach 2** as a tests-heavy hardening change under ~250–350 changed lines:
- Add `ExpenseList.pagination.test.tsx` and `IncomeList.pagination.test.tsx` with focused assertions for Prev/Next callbacks, disabled boundaries, and local-filter notice rendering condition.
- Convert or extend `ActivityFeed.test.ts` into mounted checks for click + Enter/Space navigation on transaction items, and non-navigation for unsupported/id-less items.
- Make only the minimal test-runner updates needed to run `*.test.tsx`.

Keep page-local filters **documented and unchanged** in this mini hardening round. If full-history server-side filtering is desired, open a separate change so it is reviewed as product behavior, not as test hardening.

### Risks
- Adding mounted tests may require introducing/standardizing DOM test tooling and light mocks for router/hooks.
- If assertions target implementation details instead of behavior, tests can become brittle.
- If scope expands into server-side filters, the change can exceed the 400-line review budget.

### Ready for Proposal
Yes — propose `transaction-history-hardening-tests` as a narrow, tests-first hardening change; explicitly defer server-side full-history filters to a later dedicated proposal.
