# Apply Progress: place-to-place-transfers

## Mode
Strict TDD (backend Go test runner available; strict_tdd enabled in `sdd/bolsillo-claro/testing-capabilities`).

## Delivery / PR Boundary
- Strategy: stacked-to-main.
- PR 1 completed previously: backend transfer foundation — migration, create/list handlers/API routes, active-account place validation, ARS-only v1 currency policy, and focused tests.
- PR 2 completed in this batch: dashboard `money_by_container` transfer deltas + tests only.
- Explicitly not implemented in PR 2: frontend transfer UX, Activity integration, places UI redesign, legacy media removal, multi-currency conversion, update/delete transfer API.

## Completed Tasks
- [x] 1.1 RED: Added migration tests for `026_create_place_transfers` checks/indexes and rollback.
- [x] 1.2 GREEN: Created `026_create_place_transfers.up.sql` with dedicated transfer table, positive amount check, distinct source/destination check, ARS currency field, and indexes.
- [x] 1.3 GREEN: Created `026_create_place_transfers.down.sql` dropping indexes/table in rollback-safe order.
- [x] 2.2 GREEN: Added transfer DTOs, scan helpers, create/list handlers, active-account active-place validation, and ARS-only v1 policy.
- [x] 2.4 REFACTOR: Registered `GET/POST /api/place-transfers` under auth + account middleware and aligned stable `{ "error": "..." }` validation payloads.
- [x] 3.1 RED: Added dashboard tests for transfer source/destination deltas and unchanged income/expense/P&L totals.
- [x] 3.2 GREEN: Added transfer source and destination signed legs to dashboard `queryMoneyByContainer` only.
- [x] 3.3 REFACTOR: Kept `buildMoneyByContainerBreakdown` compatible with existing mixed/unassigned bucket behavior and transfer-adjusted rows.

## Partial / Not Marked Complete
- [ ] 2.1 remains unchecked because the original task includes update/delete tests; PR 1 approved scope implemented create/list tests plus validation errors only.
- [ ] 2.3 remains unchecked because the original task includes update/delete handlers; PR 1 approved scope implemented create/list only.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `backend/migrations/place_transfers_migration_test.go` | Unit/file | N/A (new) | ✅ `go test ./migrations -run TestCreatePlaceTransfers` failed on missing migration files | ✅ `go test ./migrations -run TestCreatePlaceTransfers` passed after SQL files | ✅ Up/down fragments covered table, checks, indexes, rollback | ✅ Consolidated migration assertions; `go test ./migrations` passed |
| 2.1/2.2/2.3 create/list subset | `backend/internal/handlers/place_transfers/handlers_test.go` | Handler unit with pgxmock | N/A (new package) | ✅ `go test ./internal/handlers/place_transfers -run 'Test(Create|List)PlaceTransfers?'` failed on undefined create/list API | ✅ Same command passed after handler implementation | ✅ Valid create/list plus `source-place-required`, `destination-place-required`, `source-destination-must-differ`, `invalid-place-account`, `currency-mismatch-not-supported` | ✅ `gofmt`; package tests passed |
| 2.4 | `backend/internal/server/server_test.go` | Route registration unit | ✅ `go test ./internal/server ./internal/handlers/payment_containers` passed before server modification | ✅ route registration test failed before route import/registration | ✅ `go test ./internal/server -run TestSetupRoutesRegistersPlaceTransferEndpoints` passed after registration | ✅ Both GET and POST routes asserted via existing route map | ✅ Folded route expectations into existing payment context route test; server tests passed |
| 3.1/3.2 | `backend/internal/handlers/dashboard/summary_test.go` | Handler/unit with pgxmock | ✅ `go test ./internal/handlers/dashboard -run 'Test(GetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance\|BuildMoneyByContainerBreakdown)'` passed before modifications | ✅ `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer\|QueryMoneyByContainerIncludesSignedTransferLegs)'` failed because `queryMoneyByContainer` had no `place_transfers` legs | ✅ Same command passed after adding transfer source `-SUM(pt.amount)` and destination `SUM(pt.amount)` legs | ✅ Tests cover source/destination adjusted rows plus transfer-neutral income, expense, available balance, and current available balance totals | ✅ `gofmt`; `go test ./internal/handlers/dashboard` passed |
| 3.3 | `backend/internal/handlers/dashboard/summary_test.go` | Unit | ✅ Existing `TestBuildMoneyByContainerBreakdownIncludesUnassignedBucket` and `TestBuildMoneyByContainerBreakdownMergesMultipleUnassignedRows` covered mixed/unassigned behavior before query changes | ✅ New dashboard tests required transfer-adjusted row compatibility without changing breakdown API | ✅ Existing and new dashboard tests passed with transfer-adjusted rows | ✅ Mixed migrated/unassigned bucket behavior remains covered by existing tests; transfer-balanced rows covered by new summary/query tests | ✅ No production refactor needed beyond query-only SQL change |

## Test Summary
- Total tests written/updated in PR 2: 2 focused dashboard tests plus dashboard query expectation helper update.
- Layers used: Go unit/handler tests with pgxmock.
- Approval tests: existing dashboard package tests used as safety net before modifying `summary.go`/`summary_test.go`.
- Pure functions created: 0.

## Tests Run
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance|BuildMoneyByContainerBreakdown)'` → PASS before modifications.
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs)'` → RED failed before production SQL change.
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs)'` → PASS after production SQL change.
- `go test ./internal/handlers/dashboard` → PASS.
- `go test -count=1 ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs|BuildMoneyByContainer)'` → PASS.
- `go test -count=1 ./internal/handlers/dashboard ./internal/handlers/place_transfers` → PASS.
- `git diff --check` → PASS/no output.

## Files Changed
- `backend/internal/handlers/dashboard/summary.go` — added transfer source/destination signed `UNION ALL` legs to `queryMoneyByContainer` only.
- `backend/internal/handlers/dashboard/summary_test.go` — added transfer-delta dashboard tests and updated summary query helper to expect transfer-aware SQL.
- `openspec/changes/place-to-place-transfers/tasks.md` — marked PR 2 dashboard tasks complete and recorded PR 2 apply note.
- `openspec/changes/place-to-place-transfers/apply-progress.md` — created cumulative hybrid apply progress artifact.

## Deviations
- None — implementation matches the PR 2 design: dashboard transfer deltas only, no totals/P&L query changes.

## Issues Found
- Existing untracked `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx` remain present and were not touched.

## Risks
- Dashboard display still follows existing `buildMoneyByContainerBreakdown` behavior of omitting non-positive container totals. A transfer that makes a source place zero/negative will not display that source as a positive money bucket; this is pre-existing dashboard semantics, not changed in this slice.
