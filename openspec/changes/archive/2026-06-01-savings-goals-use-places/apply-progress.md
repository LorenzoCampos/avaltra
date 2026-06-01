# Apply Progress: savings-goals-use-places

## Mode
Strict TDD resolved for this coverage-fix pass from Engram `sdd/bolsillo-claro/testing-capabilities` (backend Go test runner available). Previous PR1 apply recorded Standard mode because no current `openspec/config.yaml` existed; this artifact preserves prior progress and adds TDD evidence for the focused coverage fixes.

## Delivery / PR Boundary
- Strategy: stacked-to-main.
- Current work unit: PR 1 / Work Unit 1 — migration + savings-goal API/contracts + backend tests.
- Scope guard: only focused backend test coverage fixes were added for PR1 verify gaps. Dashboard aggregation changes and frontend UX remain out of scope.

## Completed Tasks
- [x] 1.1 Created `backend/migrations/027_savings_goals_use_places.{up,down}.sql` adding nullable `savings_goals.saved_container_id` and nullable `savings_goal_transactions.container_id` with FKs/indexes.
- [x] 1.2 Migration preserves `savings_goals.saved_in` and does not backfill/guess legacy text; down migration drops indexes before columns.
- [x] 1.3 Extended migration fixture tests for nullable columns/FKs/indexes/no-backfill comment.
- [x] 2.1 Updated create/update contracts for optional `saved_container_id`; update supports explicit JSON `null` via presence-aware decoding.
- [x] 2.2 Added active-account + active-place validation for non-null savings goal places and transaction request places.
- [x] 2.3 Updated list/get contracts to return `saved_container_id`, `saved_container_name`, legacy `saved_in`, and `storage_status`.
- [x] 2.4 Updated add/withdraw/get transactions to accept/return `container_id` and snapshot request override → goal place → NULL attribution.
- [x] 5.1 Added and extended backend handler tests for valid place, invalid place, explicit unassigned create/update, legacy readability, get/get-transactions contracts, and transaction snapshot attribution.

## Coverage Fixes Added After PR1 Verify Failure
- Added update tests for valid place assignment, explicit `null` clearing/unassigned behavior, and invalid/missing/inactive/cross-account place rejection.
- Added get-detail response contract test covering `saved_container_id`, `saved_container_name`, `saved_in`, `storage_status`, and transaction `container_id`.
- Added get-transactions response contract test covering transaction `container_id`.
- Added add/withdraw default-to-goal attribution tests when request omits `container_id`.
- Added withdraw request-override attribution test.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| PR1 coverage gaps — update place behavior | `backend/internal/handlers/savings_goals/places_test.go` | Handler integration with `httptest` + `pgxmock` | ✅ Existing savings goal place tests passed before edits | ✅ Tests written first for update valid/null/invalid scenarios | ✅ New focused tests passed | ✅ 3 cases: valid, explicit null, invalid/cross/inactive represented by validation miss | ✅ Shared helpers reused; no production refactor needed |
| PR1 coverage gaps — get/get-transactions contracts | `backend/internal/handlers/savings_goals/places_test.go` | Handler integration with `httptest` + `pgxmock` | ✅ Existing savings goal place tests passed before edits | ✅ Tests written first for get detail and get-transactions container contracts | ✅ New focused tests passed | ✅ 2 endpoint cases cover goal contract and transaction-only contract | ✅ No production refactor needed |
| PR1 coverage gaps — movement attribution | `backend/internal/handlers/savings_goals/places_test.go` | Handler integration with `httptest` + `pgxmock` | ✅ Existing savings goal place tests passed before edits | ✅ Tests written first for add/withdraw default attribution and withdraw override | ✅ New focused tests passed | ✅ 3 cases: add default, withdraw default, withdraw request override | ✅ No production refactor needed |

## Test Summary
- **Total focused test cases added**: 8
- **Total focused test cases passing**: 8
- **Layers used**: Handler integration/unit-style HTTP tests with `httptest` + `pgxmock`
- **Approval tests**: None — no production refactoring was performed.
- **Pure functions created**: 0

## Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `backend/migrations/027_savings_goals_use_places.up.sql` | Created previously | Add nullable goal and transaction place reference columns, FK indexes, comments, no backfill. |
| `backend/migrations/027_savings_goals_use_places.down.sql` | Created previously | Rollback-safe index drops before nullable column drops. |
| `backend/migrations/place_transfers_migration_test.go` | Modified previously | Added migration fragment assertions for savings-goals-use-places migration. |
| `backend/internal/handlers/savings_goals/db.go` | Created previously | Added package DB interfaces, optional JSON string decoder, active place validation helper, storage status helper. |
| `backend/internal/handlers/savings_goals/create.go` | Modified previously | Accept/persist `saved_container_id`; validate active account place; respond with place contract fields. |
| `backend/internal/handlers/savings_goals/update.go` | Modified previously | Allow omitted vs explicit-null `saved_container_id`, validate non-null places, return compatibility contract. |
| `backend/internal/handlers/savings_goals/list.go` | Modified previously | Left join containers and return saved place fields plus `storage_status`. |
| `backend/internal/handlers/savings_goals/get.go` | Modified previously | Return saved place fields and transaction `container_id` in detail responses. |
| `backend/internal/handlers/savings_goals/add_funds.go` | Modified previously | Accept optional `container_id`, validate request place, snapshot request override or goal place. |
| `backend/internal/handlers/savings_goals/withdraw_funds.go` | Modified previously | Same snapshot attribution behavior for withdrawals. |
| `backend/internal/handlers/savings_goals/get_transactions.go` | Modified previously | Return transaction `container_id`. |
| `backend/internal/handlers/savings_goals/places_test.go` | Extended | Added focused runtime coverage for PR1 verify gaps. |
| `openspec/changes/savings-goals-use-places/tasks.md` | Previously modified | PR1 backend/API/test tasks remain complete; PR2/PR3 tasks remain unchecked. |
| `openspec/changes/savings-goals-use-places/apply-progress.md` | Created | Persisted merged PR1 apply progress plus coverage-fix evidence. |

## Verification
- `go test -count=1 ./internal/handlers/savings_goals -run 'Test(CreateSavingsGoalPlaceScenarios|ListSavingsGoalsReturnsPlaceContractAndLegacyCompatibility|AddFundsSnapshotsRequestContainerAttribution)'` — PASS safety net.
- `gofmt -w internal/handlers/savings_goals/places_test.go && go test -count=1 ./internal/handlers/savings_goals -run 'Test(UpdateSavingsGoalPlaceScenarios|GetSavingsGoalReturnsPlaceContractAndTransactionContainers|GetTransactionsReturnsContainerID|SavingsGoalOperationsDefaultToGoalAttribution|WithdrawFundsSnapshotsRequestContainerAttribution)'` — PASS after expectation correction.
- `go test -count=1 ./internal/handlers/savings_goals ./migrations` — PASS.
- `go test -count=1 ./internal/handlers/...` — PASS.

## Deviations from Design
None — this pass added tests only and stayed within PR1 backend/API contracts.

## Issues / Notes
- No production bug was exposed by the new tests; only pgxmock argument expectations needed adjustment while writing the coverage tests.
- `openspec/config.yaml` is still absent; Strict TDD for this pass was resolved from the existing Engram testing-capabilities cache.

## Remaining Tasks
- [ ] 3.1 Extend dashboard money-by-container with assigned savings transaction legs.
- [ ] 3.2 Add explicit unassigned historical savings bucket handling.
- [ ] 3.3 Verify dashboard totals remain P&L-neutral.
- [ ] 4.1-4.4 Frontend savings place selector UX/contracts/copy.
- [ ] 5.2 Dashboard tests.
- [ ] 5.3 Frontend tests.

## Status
8/17 planned SDD tasks are complete according to PR slicing: PR1 backend/API tasks are complete with added runtime coverage; PR2/PR3 tasks remain intentionally pending. PR1 is ready for re-verify.
