# Tasks: Transaction History Hardening Tests

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 260–360 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DOM test support + mounted Activity and pagination hardening tests | PR 1 | Single bounded slice; include verification in same PR |

## Phase 1: Foundation (Test Runtime + Fixtures)

- [x] 1.1 Update `frontend/vite.config.ts` to include `src/**/*.test.tsx` and set Vitest DOM environment needed for mounted TSX tests.
- [x] 1.2 Update `frontend/package.json` to add the minimal DOM runtime test dependency used by Vitest for mounted tests.
- [x] 1.3 Regenerate `frontend/pnpm-lock.yaml` only for the added test dependency and verify no unrelated lockfile churn.

## Phase 2: RED (Failing Mounted Coverage)

- [x] 2.1 In `frontend/src/features/activity/components/ActivityFeed.test.tsx`, add failing mounted tests for routable row click and Enter/Space navigation callback route assertions.
- [x] 2.2 In `frontend/src/features/activity/components/ActivityFeed.test.tsx`, add failing mounted test proving non-routable rows ignore click/Enter/Space and never call navigate.
- [x] 2.3 Create `frontend/src/components/ListPaginationControls.test.tsx` with failing tests for disabled previous/next boundaries at first/last page.
- [x] 2.4 In `frontend/src/components/ListPaginationControls.test.tsx`, add failing tests for valid previous/next callbacks and local-filter notice visibility.

## Phase 3: GREEN (Minimal Passing Implementation in Tests)

- [x] 3.1 Make `ActivityFeed.test.tsx` pass by wiring stable mocks for `useNavigate`, `useActivity`, and required translators/formatters while asserting only observable behavior.
- [x] 3.2 Make `ListPaginationControls.test.tsx` pass for boundary disablement and callback payload expectations using fixture pagination state.
- [x] 3.3 Create `frontend/src/features/expenses/ExpenseList.pagination.test.tsx` with targeted assertions that expense list wiring preserves page-local filter notice semantics.
- [x] 3.4 Create `frontend/src/features/incomes/IncomeList.pagination.test.tsx` mirroring expense wiring assertions for income pagination/local-filter behavior.

## Phase 4: REFACTOR + Verification

- [x] 4.1 Refactor duplicated mounted-test helpers/fixtures across new TSX tests into local test utilities without changing runtime components.
- [x] 4.2 Verify spec scenarios: click/keyboard routing, non-routable guard, pagination boundaries, callback page targets, and page-local filter preservation.
- [x] 4.3 Run frontend test command(s) covering `ActivityFeed.test.tsx`, `ListPaginationControls.test.tsx`, `ExpenseList.pagination.test.tsx`, and `IncomeList.pagination.test.tsx`; record final diff stays within budget.
