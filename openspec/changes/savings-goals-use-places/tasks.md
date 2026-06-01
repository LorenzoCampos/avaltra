# Tasks: Savings Goals Use Places

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750-1050 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migration + savings-goal API/contracts + handler tests | PR 1 | Autonomous backend slice; includes nullable IDs, validation, and transaction snapshot attribution. |
| 2 | Dashboard money-by-container savings attribution + tests | PR 2 | Depends on PR 1 schema/fields; keep income/expense/P&L queries unchanged. |
| 3 | Frontend savings place-selector UX + schema/types/tests | PR 3 | Depends on PR 1 API; include unassigned compatibility messaging; no Places redesign. |

## Phase 1: Foundation / Migration

- [x] 1.1 Create migration `backend/migrations/0xx_savings_goals_use_places.{up,down}.sql` adding nullable `savings_goals.saved_container_id` and nullable `savings_goal_transactions.container_id` with FKs/indexes.
- [x] 1.2 Ensure migration keeps `savings_goals.saved_in` unchanged and performs no guessed text backfill; document rollback-safe drop order in down migration.
- [x] 1.3 Add/adjust migration verification test fixture in backend migration test harness to assert nullable columns/FKs exist.

## Phase 2: Savings Goals API + Attribution

- [x] 2.1 Update `backend/internal/handlers/savings_goals/{create,update}.go` request contracts to accept optional `saved_container_id` and allow explicit `NULL` unassigned state.
- [x] 2.2 Add active-account + active-place validation (when non-null) in savings goals handlers using existing payment-container ownership pattern; reject missing/inactive/cross-account IDs.
- [x] 2.3 Update `backend/internal/handlers/savings_goals/{list,get}.go` to return `saved_container_id`, `saved_container_name`, legacy `saved_in`, and `storage_status`.
- [x] 2.4 Modify `backend/internal/handlers/savings_goals/{add_funds,withdraw_funds,get_transactions}.go` so operations accept optional `container_id` and persist transaction snapshot attribution (request override → goal place → `NULL`).

## Phase 3: Dashboard Money-by-Container Integration

- [x] 3.1 Extend `backend/internal/handlers/dashboard/summary.go` `queryMoneyByContainer` to include assigned savings transaction legs (deposit negative, withdrawal positive) only when `container_id` is non-null.
- [x] 3.2 Add explicit unassigned historical savings bucket handling for null-linked savings movements without mapping from legacy text.
- [x] 3.3 Verify dashboard totals logic in `summary.go` keeps income, expense, and P&L unchanged by savings attribution movement.

## Phase 4: Frontend Savings UX and Contracts

- [ ] 4.1 Replace free-text location input with optional place selector in `frontend/src/features/savings/SavingsForm.tsx` and `ContributionForm.tsx`; include unassigned option.
- [ ] 4.2 Update `frontend/src/features/savings/SavingsCard.tsx` to show assigned place name or explicit unassigned/legacy messaging.
- [ ] 4.3 Update contracts in `frontend/src/schemas/savings.schema.ts`, `frontend/src/types/savings.ts`, and `frontend/src/hooks/useSavings.ts` for new container fields and transaction `container_id`.
- [ ] 4.4 Update copy in `frontend/src/i18n/locales/*/savings.json` for selector labels, unassigned messaging, and compatibility wording.

## Phase 5: Testing / Verification

- [x] 5.1 Add table-driven handler tests in `backend/internal/handlers/savings_goals/*_test.go` for valid place, invalid place, explicit unassigned goal, and no-guess legacy compatibility.
- [x] 5.2 Extend `backend/internal/handlers/dashboard/summary_test.go` for assigned savings movement, historical null unassigned bucket, and P&L neutrality scenarios.
- [ ] 5.3 Add/extend frontend Vitest/RTL tests around `SavingsForm`, `ContributionForm`, `SavingsCard`, and `useSavings` for selector behavior, payloads, and unassigned UI state.
