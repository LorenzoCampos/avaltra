# Apply Progress: place-to-place-transfers

## Mode
Strict TDD (backend Go test runner available; strict_tdd enabled in `sdd/bolsillo-claro/testing-capabilities`).

## Delivery / PR Boundary
- Strategy: stacked-to-main.
- PR 1 completed previously: backend transfer foundation — migration, create/list handlers/API routes, active-account place validation, ARS-only v1 currency policy, and focused tests.
- PR 2 completed previously: dashboard `money_by_container` transfer deltas + tests only.
- PR 3 completed in this batch: frontend transfer form/history + GET/POST API hooks + focused tests.
- Explicitly not implemented in PR 3: Activity integration, broad Places redesign, legacy media removal, multi-currency conversion, update/delete transfer API.

## Completed Tasks
- [x] 1.1 RED: Added migration tests for `026_create_place_transfers` checks/indexes and rollback.
- [x] 1.2 GREEN: Created `026_create_place_transfers.up.sql` with dedicated transfer table, positive amount check, distinct source/destination check, ARS currency field, and indexes.
- [x] 1.3 GREEN: Created `026_create_place_transfers.down.sql` dropping indexes/table in rollback-safe order.
- [x] 2.2 GREEN: Added transfer DTOs, scan helpers, create/list handlers, active-account active-place validation, and ARS-only v1 policy.
- [x] 2.4 REFACTOR: Registered `GET/POST /api/place-transfers` under auth + account middleware and aligned stable `{ "error": "..." }` validation payloads.
- [x] 3.1 RED: Added dashboard tests for transfer source/destination deltas and unchanged income/expense/P&L totals.
- [x] 3.2 GREEN: Added transfer source and destination signed legs to dashboard `queryMoneyByContainer` only.
- [x] 3.3 REFACTOR: Kept `buildMoneyByContainerBreakdown` compatible with existing mixed/unassigned bucket behavior and transfer-adjusted rows.
- [x] 4.1 RED: Added frontend tests for transfer hook query keys/API calls/invalidation, form validation/payload, active-place selector rendering, visible history, and page safety mocks.
- [x] 4.2 GREEN: Added `PlaceTransfer` types and React Query hooks/helpers for `GET/POST /api/place-transfers`, scoped by active account and invalidating transfers, payment containers, and dashboard.
- [x] 4.3 GREEN: Added focused `PlaceTransferForm` and `PlaceTransferHistory` components using active places only, ARS-only payloads, and no FX/conversion fields.
- [x] 4.4 REFACTOR: Mounted transfer form/history on `PaymentContainersPage` without redesigning Places or removing legacy media.

## Partial / Not Marked Complete
- [ ] 2.1 remains unchecked because the original task includes update/delete tests; PR 1 approved scope implemented create/list tests plus validation errors only.
- [ ] 2.3 remains unchecked because the original task includes update/delete handlers; PR 1 approved scope implemented create/list only.
- [ ] 5.1-5.3 remain unchecked for dedicated verify/scope guardrail phase work; this apply batch ran focused frontend checks only.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `backend/migrations/place_transfers_migration_test.go` | Unit/file | N/A (new) | ✅ `go test ./migrations -run TestCreatePlaceTransfers` failed on missing migration files | ✅ `go test ./migrations -run TestCreatePlaceTransfers` passed after SQL files | ✅ Up/down fragments covered table, checks, indexes, rollback | ✅ Consolidated migration assertions; `go test ./migrations` passed |
| 2.1/2.2/2.3 create/list subset | `backend/internal/handlers/place_transfers/handlers_test.go` | Handler unit with pgxmock | N/A (new package) | ✅ `go test ./internal/handlers/place_transfers -run 'Test(Create|List)PlaceTransfers?'` failed on undefined create/list API | ✅ Same command passed after handler implementation | ✅ Valid create/list plus `source-place-required`, `destination-place-required`, `source-destination-must-differ`, `invalid-place-account`, `currency-mismatch-not-supported` | ✅ `gofmt`; package tests passed |
| 2.4 | `backend/internal/server/server_test.go` | Route registration unit | ✅ `go test ./internal/server ./internal/handlers/payment_containers` passed before server modification | ✅ route registration test failed before route import/registration | ✅ `go test ./internal/server -run TestSetupRoutesRegistersPlaceTransferEndpoints` passed after registration | ✅ Both GET and POST routes asserted via existing route map | ✅ Folded route expectations into existing payment context route test; server tests passed |
| 3.1/3.2 | `backend/internal/handlers/dashboard/summary_test.go` | Handler/unit with pgxmock | ✅ `go test ./internal/handlers/dashboard -run 'Test(GetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance\|BuildMoneyByContainerBreakdown)'` passed before modifications | ✅ `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer\|QueryMoneyByContainerIncludesSignedTransferLegs)'` failed because `queryMoneyByContainer` had no `place_transfers` legs | ✅ Same command passed after adding transfer source `-SUM(pt.amount)` and destination `SUM(pt.amount)` legs | ✅ Tests cover source/destination adjusted rows plus transfer-neutral income, expense, available balance, and current available balance totals | ✅ `gofmt`; `go test ./internal/handlers/dashboard` passed |
| 3.3 | `backend/internal/handlers/dashboard/summary_test.go` | Unit | ✅ Existing `TestBuildMoneyByContainerBreakdownIncludesUnassignedBucket` and `TestBuildMoneyByContainerBreakdownMergesMultipleUnassignedRows` covered mixed/unassigned behavior before query changes | ✅ New dashboard tests required transfer-adjusted row compatibility without changing breakdown API | ✅ Existing and new dashboard tests passed with transfer-adjusted rows | ✅ Mixed migrated/unassigned bucket behavior remains covered by existing tests; transfer-balanced rows covered by new summary/query tests | ✅ No production refactor needed beyond query-only SQL change |
| 4.1/4.2 | `frontend/src/hooks/usePlaceTransfers.test.ts` | Frontend unit with mocked API | N/A (new hook) | ✅ `npm test -- src/hooks/usePlaceTransfers.test.ts ...` failed on missing `usePlaceTransfers` module/types | ✅ Focused Vitest suite passed after adding GET/POST helpers and hooks | ✅ Covered active-account query keys, list GET, create POST with no FX field, and invalidation keys | ✅ Changed-file ESLint passed |
| 4.1/4.3 | `frontend/src/features/payment-containers/PlaceTransferForm.test.tsx` and `PlaceTransferHistory.test.tsx` | Frontend unit/static render | N/A (new components) | ✅ Focused tests failed on missing form/history modules | ✅ Focused Vitest suite passed after adding form validation, ARS payload, active-place rendering, and visible history | ✅ Covered same-place rejection, non-positive amount rejection, valid ARS payload, inactive place exclusion, and rendered transfer history | ✅ Typecheck and changed-file ESLint passed |
| 4.4 | `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Frontend unit/static render | ✅ Existing page test initially exposed missing transfer hook mocks after page integration | ✅ Page safety test failed with `No QueryClient set` until transfer hooks were mocked | ✅ `paymentContainerManagement.test.ts` passed after mounting transfer UI with existing page test seams | ✅ Existing management behavior still covered; no broad Places redesign or legacy media removal | ✅ Focused page tests passed |

## Test Summary
- Total focused tests run in PR 3: 17 (3 hook tests, 3 form tests, 1 history test, 10 payment-container page safety tests); prior PR 1/PR 2 tests retained.
- Layers used: frontend Vitest unit/static render tests with mocked API; prior Go unit/handler tests with pgxmock.
- Approval tests: existing `paymentContainerManagement.test.ts` used as the safety net for `PaymentContainersPage.tsx` integration.
- Pure functions created in PR 3: `getPlaceTransferFormSubmission`, `getPlaceTransfersQueryKey`, `getPlaceTransferInvalidationKeys`, `listPlaceTransfers`, `createPlaceTransfer`.

## Tests Run
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance|BuildMoneyByContainerBreakdown)'` → PASS before modifications.
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs)'` → RED failed before production SQL change.
- `go test ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs)'` → PASS after production SQL change.
- `go test ./internal/handlers/dashboard` → PASS.
- `go test -count=1 ./internal/handlers/dashboard -run 'Test(GetSummaryAppliesTransferDeltasOnlyToMoneyByContainer|QueryMoneyByContainerIncludesSignedTransferLegs|BuildMoneyByContainer)'` → PASS.
- `go test -count=1 ./internal/handlers/dashboard ./internal/handlers/place_transfers` → PASS.
- `npm test -- src/hooks/usePlaceTransfers.test.ts src/features/payment-containers/PlaceTransferForm.test.tsx src/features/payment-containers/PlaceTransferHistory.test.tsx src/features/payment-containers/paymentContainerManagement.test.ts` → PASS (17 tests).
- `npm run typecheck` → PASS.
- `npx eslint <changed frontend files>` → PASS/no output.
- `npm run lint` → FAIL due pre-existing unrelated lint errors in `frontend/dev-dist/workbox-1fb923f4.js` and existing app files; changed-file ESLint passed.
- `git diff --check` → PASS/no output.

## Files Changed
- `backend/internal/handlers/dashboard/summary.go` — added transfer source/destination signed `UNION ALL` legs to `queryMoneyByContainer` only.
- `backend/internal/handlers/dashboard/summary_test.go` — added transfer-delta dashboard tests and updated summary query helper to expect transfer-aware SQL.
- `frontend/src/types/placeTransfer.ts` — added transfer request/response/list types for the GET/POST backend contract.
- `frontend/src/hooks/usePlaceTransfers.ts` — added list/create helpers and React Query hooks with transfer, places, and dashboard invalidation.
- `frontend/src/features/payment-containers/placeTransferFormSubmission.ts` — added pure form validation/payload construction for ARS-only transfers.
- `frontend/src/features/payment-containers/PlaceTransferForm.tsx` — added active-place-only transfer form.
- `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` — added visible transfer history list.
- `frontend/src/features/payment-containers/PaymentContainersPage.tsx` — mounted transfer form/history in the existing management page without redesigning Places.
- `frontend/src/**/*PlaceTransfer*.test.tsx`, `frontend/src/hooks/usePlaceTransfers.test.ts`, `paymentContainerManagement.test.ts` — added focused PR 3 frontend tests and page test mocks.
- `openspec/changes/place-to-place-transfers/tasks.md` — marked PR 2 dashboard tasks complete and recorded PR 2 apply note.
- `openspec/changes/place-to-place-transfers/apply-progress.md` — created cumulative hybrid apply progress artifact.

## Deviations
- PR 3 implements only frontend `GET/POST /api/place-transfers` hooks because PR 1 exposed only GET/POST and the user explicitly scoped this slice to GET/POST. Update/delete frontend hooks from the broader design/task wording remain deferred with backend update/delete.

## Issues Found
- Existing untracked `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx` remain present and were not touched.
- Whole-repo `npm run lint` is currently blocked by unrelated pre-existing lint failures; changed-file ESLint passed.

## Risks
- Dashboard display still follows existing `buildMoneyByContainerBreakdown` behavior of omitting non-positive container totals. A transfer that makes a source place zero/negative will not display that source as a positive money bucket; this is pre-existing dashboard semantics, not changed in this slice.
- PR 3 total changed-line estimate is 399 lines for tracked additions plus new frontend files, staying just within the 400-line review budget. Further additions should be deferred to verify/follow-up rather than expanded in this slice.
