# Verification Report: savings-goals-use-places — PR 1 Backend/API Slice

**Mode**: Hybrid persistence; standard verification. No `openspec/config.yaml` exists and no explicit current `strict_tdd` config was found in the required artifacts.
**Scope**: PR 1 / Work Unit 1 only — migrations, savings goal backend API/contracts, transaction attribution, and backend tests. Dashboard and frontend remain intentionally out of scope.
**Final Verdict**: **PASS**

## Completeness

| Area | Status | Evidence |
|---|---|---|
| PR1 task scope | Complete | Tasks 1.1-1.3, 2.1-2.4, and 5.1 are checked in `openspec/changes/savings-goals-use-places/tasks.md`; `apply-progress.md` records focused coverage fixes for prior blockers. |
| Dashboard scope | Out of scope | Tasks 3.1-3.3 and 5.2 remain unchecked by design for PR2. |
| Frontend scope | Out of scope | Tasks 4.1-4.4 and 5.3 remain unchecked by design for PR3. |

## Build / Test / Coverage Evidence

| Command | Result | Notes |
|---|---:|---|
| `go test -count=1 ./internal/handlers/savings_goals ./migrations` | PASS | Required focused backend/API + migration verification. |
| `go test -count=1 ./internal/handlers/...` | PASS | Broader handler regression suite; matches apply-progress expectation. |
| `go test -count=1 -cover ./internal/handlers/savings_goals ./migrations` | PASS | `savings_goals` coverage improved to 58.2%; migrations have no statements. |

## Spec Compliance Matrix

| Requirement / Scenario | Status | Runtime Test Evidence | Source Evidence |
|---|---|---|---|
| Add nullable goal place reference and transaction attribution columns | COMPLIANT | `TestSavingsGoalsUsePlacesMigration`; focused migration tests passed. | `backend/migrations/027_savings_goals_use_places.up.sql`. |
| Rollback-safe down migration | COMPLIANT | `TestSavingsGoalsUsePlacesMigration`; focused migration tests passed. | `backend/migrations/027_savings_goals_use_places.down.sql` drops indexes before columns. |
| Preserve legacy `saved_in`; no guessed text-to-place mapping | COMPLIANT | `TestCreateSavingsGoalPlaceScenarios`; `TestListSavingsGoalsReturnsPlaceContractAndLegacyCompatibility`; update/get tests preserve `saved_in`; migration tests passed. | Migration has no backfill; handlers keep `saved_in` in responses and compatibility paths. |
| Create/update with valid active-account active place persists reference | COMPLIANT | `TestCreateSavingsGoalPlaceScenarios`; `TestUpdateSavingsGoalPlaceScenarios`; focused tests passed. | `CreateSavingsGoal`, `UpdateSavingsGoal`, `validateOptionalContainer`. |
| Invalid/missing/inactive/cross-account place is rejected | COMPLIANT | Create invalid-place and update invalid-place test cases passed; validation miss represents missing, inactive, or cross-account because the query scopes by `id`, `account_id`, and `is_active = true`. | `validateOptionalContainer` returns `invalid-savings-place` for invalid UUID/blank or `pgx.ErrNoRows`. |
| Update explicit `null` clears goal place and keeps legacy compatibility | COMPLIANT | `TestUpdateSavingsGoalPlaceScenarios/explicit null clears goal storage without changing legacy saved_in`; focused tests passed. | `optionalString` tracks field presence; update uses `CASE WHEN $5::boolean THEN $6::uuid ELSE saved_container_id END`. |
| Get/list/read response contract includes place fields and legacy compatibility | COMPLIANT | `TestListSavingsGoalsReturnsPlaceContractAndLegacyCompatibility`; `TestGetSavingsGoalReturnsPlaceContractAndTransactionContainers`; focused tests passed. | `SavingsGoalResponse`/`SavingsGoalDetailResponse` include `saved_container_id`, `saved_container_name`, `saved_in`, and `storage_status`. |
| `get-transactions` response includes `container_id` | COMPLIANT | `TestGetTransactionsReturnsContainerID`; focused tests passed. | `GetTransactions` selects/scans `container_id` into `SavingsGoalTransaction`. |
| Add funds request override snapshots requested place | COMPLIANT | `TestAddFundsSnapshotsRequestContainerAttribution`; focused tests passed. | `AddFunds` validates request `container_id` and inserts it into `savings_goal_transactions.container_id`. |
| Withdraw request override snapshots requested place | COMPLIANT | `TestWithdrawFundsSnapshotsRequestContainerAttribution`; focused tests passed. | `WithdrawFunds` validates request `container_id` and inserts it into `savings_goal_transactions.container_id`. |
| Add/withdraw default to goal attribution when request omits place | COMPLIANT | `TestSavingsGoalOperationsDefaultToGoalAttribution`; focused tests passed for add and withdraw. | Add/withdraw fall back from request `container_id` to goal `saved_container_id`. |

## Correctness Table

| Check | Status | Evidence |
|---|---|---|
| Additive migrations only | PASS | New nullable columns and indexes only. |
| Legacy compatibility retained | PASS | `saved_in` remains in schema contract and handler responses. |
| No historical guessing/backfill | PASS | Migration and handler code do not map `saved_in` to containers. |
| Active account/place validation | PASS | Shared helper validates `payment_containers.id`, `account_id`, and `is_active = true`; invalid-path runtime tests now cover create and update. |
| Transaction snapshot attribution | PASS | Add/withdraw request override and default-to-goal cases have passing runtime tests. |
| PR slice boundary | PASS | Dashboard/frontend work remains unmodified/out of scope for this PR1 verification. |

## Design Coherence

| Design Decision | Status | Notes |
|---|---|---|
| Add nullable `saved_container_id` and transaction `container_id` | Aligned | Implemented by migration 027. |
| Keep `saved_in` compatibility | Aligned | API still returns `saved_in`; tests assert legacy readability. |
| Allow explicit unassigned goal state | Aligned | Create and update explicit-null paths are tested. |
| Validate non-null places by active account/place | Aligned | Shared helper and create/update tests cover the behavior. |
| Snapshot movement attribution | Aligned | Add/withdraw override and default attribution tests now cover previous gaps. |
| Dashboard savings legs deferred | Aligned | PR1 correctly avoids dashboard aggregation work. |

## Issues

### CRITICAL

None.

### WARNING

None for the PR1 backend/API slice.

### SUGGESTION

1. Keep dashboard and frontend verification separate in PR2/PR3 so the review slice stays focused and under the chained-PR strategy.

## Verdict

**PASS** — the previously missing PR1 runtime coverage is now present and passing. Source inspection, migration checks, focused handler tests, broader handler regression tests, and coverage evidence all support the PR1 backend/API slice as compliant. Dashboard and frontend requirements remain intentionally pending for later work units.
