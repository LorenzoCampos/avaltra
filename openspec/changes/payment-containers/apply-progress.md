# Apply Progress: payment-containers

## Scope
PR1 foundation remains complete. PR2 backend transaction wiring is complete on the resolved `stacked-to-main` chain, with this update limited to PR2 verification warning fixes before packaging.

No frontend UI, importer, dashboard, branding, spreadsheet, or PR3+ work was implemented.

Prior PR1 hardening and fresh-review fixes remain preserved in the completed task history below. This current update is PR2-only and addresses backend transaction wiring verification warnings before packaging.

## Completed Tasks
- [x] 1.1 Added additive migration `023_create_payment_containers` with `payment_institutions`, `payment_containers`, `payment_instruments`, nullable expense/income FK columns, indexes, and reversible down migration.
- [x] 1.2 Added `internal/transactions/payment_context.go` for container/instrument kind validation, `split-payment-not-supported`, and `backing-container-required` card validation.
- [x] 1.3 Added backend payment container/instrument CRUD/list/deactivate handlers and registered protected account-scoped routes.
- [x] 1.3 verification fix: added missing PR1 handler coverage for `UpdatePaymentContainer`, `UpdatePaymentInstrument`, `DeactivatePaymentContainer`, `DeactivatePaymentInstrument`, and `ListPaymentInstruments`.
- [x] PR1 hardening: added direct `ValidatePaymentContainerKind` coverage; added malformed/backing-container account mismatch handler coverage; made update-to-card-without-backing behavior explicit with a `400 Bad Request` instead of relying on the database constraint.
- [x] PR1 fresh-review fix: explicit `backing_container_id: null` updates against existing `credit_card`/`debit_card` instruments now validate the current kind first and return `400 Bad Request` instead of falling through to the database constraint; deactivate handler tests now use the real `PATCH .../deactivate` route shape.
- [x] 2.1 Expense create/update/get/list now accept, validate, persist, and return nullable `source_container_id` and `source_instrument_id` while preserving legacy-only `payment_method` payload behavior.
- [x] 2.2 Income create/update/get/list now accept, validate, persist, and return nullable `destination_container_id` and `destination_instrument_id` with the same compatibility and explicit-null update semantics.
- [x] 2.3 Activity list now exposes nullable `payment_context` with display precedence `normalized label → payment_method → null` for backend responses only.
- [x] PR2 verification warning fix: expense/income update validation now checks final one-field replacement pairs against existing transaction refs, and activity legacy fallback now returns user-facing backend labels while preserving the raw legacy enum in `legacy_payment_method`.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `backend/internal/transactions/payment_context_test.go` | Unit/filesystem | N/A (new migration) | ✅ Written first; failed on missing migration/code | ✅ Passed in `go test ./internal/transactions -run 'TestPaymentContext|TestPaymentContainersMigrationExists'` | ✅ Migration assertions cover tables, nullable tx refs, card backing, and down drops | ✅ Clean |
| 1.2 | `backend/internal/transactions/payment_context_test.go` | Unit | ✅ `go test ./internal/transactions` passing before changes | ✅ Written first; failed on undefined validation API | ✅ Passed in package test | ✅ Table cases cover valid kinds, invalid kinds, card backing required/accepted, and split arrays rejected | ✅ Clean |
| 1.3 | `backend/internal/handlers/payment_containers/handlers_test.go`, `backend/internal/server/server_test.go` | Handler/unit | ✅ `go test ./internal/server` passing before route changes | ✅ Written first; handler package failed on undefined handlers; server route test failed on missing routes | ✅ Passed in `go test ./internal/handlers/payment_containers` and `go test ./internal/server` | ✅ Cases cover container create success/errors, instrument card backing success/error, active listing, and route registration | ✅ Extracted scan/parse helpers |
| 1.3 verification fix | `backend/internal/handlers/payment_containers/handlers_test.go` | Handler/unit | ✅ `go test ./internal/handlers/payment_containers` passed before changes | ✅ Added missing tests first; failed on update SQL clearing omitted nullable IDs and deactivate/update not-found returning 500 | ✅ Passed in `go test ./internal/handlers/payment_containers` after minimal handler fixes | ✅ Table cases cover list instruments active/include-inactive/error, update success/invalid/not-found, deactivate success/not-found, and omitted nullable ID preservation | ✅ Added JSON field-presence helper and not-found handling only |
| PR1 hardening | `backend/internal/transactions/payment_context_test.go`, `backend/internal/handlers/payment_containers/handlers_test.go` | Unit + handler/unit | ✅ `go test ./internal/transactions ./internal/handlers/payment_containers` passing before changes | ✅ Added handler tests first; `TestUpdatePaymentInstrumentScenarios` failed for unsupported kind and card-kind-without-backing update returning 500 instead of 400 | ✅ Passed focused hardening tests and full backend suite after minimal update validation fix | ✅ Cases cover valid/invalid container kind validation, malformed backing UUID, account-mismatched backing container, unsupported instrument kind update, and card-kind update without backing | ✅ Minimal guard added before update SQL; no API contract expansion |
| PR1 fresh-review card backing fix | `backend/internal/handlers/payment_containers/handlers_test.go` | Handler/unit | ✅ `go test ./internal/handlers/payment_containers` passing before changes | ✅ Added existing-credit/debit-card explicit-null backing cases first; focused test failed with 500 because the handler reached UPDATE instead of validating current kind | ✅ `go test ./internal/handlers/payment_containers -run TestUpdatePaymentInstrumentScenarios` passed after fetching current kind only for explicit-null/no-kind updates | ✅ Two card kinds covered: existing `credit_card` and `debit_card`; existing tests still cover explicit card kind with null backing and omitted backing on card-kind update | ✅ Minimal current-kind lookup helper; deactivate tests aligned from DELETE to PATCH route shape |
| 2.1 | `backend/internal/handlers/expenses/payment_method_test.go` | Handler/unit | ✅ `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` passing before changes | ✅ Tests updated/written first; failed on old expense INSERT/response lacking normalized refs and validation | ✅ Focused handler packages passed after expense context helper and query wiring | ✅ Create valid + inactive/foreign rejection, update replace + explicit null, get/list compatibility, legacy-only create cases | ✅ Kept additive nullable fields; no frontend/importer changes |
| 2.2 | `backend/internal/handlers/incomes/payment_method_test.go`, `backend/internal/handlers/incomes/category_validation_test.go` | Handler/unit | ✅ `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` passing before changes | ✅ Tests updated/written first; failed on old income INSERT/response lacking normalized refs and validation | ✅ Focused handler packages passed after income context helper and query wiring | ✅ Create valid + inactive/foreign rejection, update replace + explicit null, get/list compatibility, legacy-only create cases | ✅ Kept additive nullable fields; no frontend/importer changes |
| 2.3 | `backend/internal/handlers/activity/payment_method_test.go` | Handler/unit | ✅ `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` passing before changes | ✅ Test updated first; failed parsing activity rows because production query lacked `payment_context_label` | ✅ Focused activity package passed after activity query/response wiring | ✅ Cases cover normalized label precedence, legacy fallback, and null for savings/no context | ✅ Minimal response helper `buildPaymentContext` |
| PR2 verification warning fix | `backend/internal/handlers/{expenses,incomes,activity}/payment_method_test.go` | Handler/unit | ✅ `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` passed before new warning fixes | ✅ Added regression tests first; focused run failed with 500/update path for one-field replacements and raw `credit_card` activity display label | ✅ Focused handler packages passed after final-pair validation and label helper changes | ✅ Expense + income cover changed-container and changed-instrument mismatch paths; activity covers labeled fallback plus raw `legacy_payment_method` preservation | ✅ Small shared `PaymentMethodLabel` helper; no frontend/importer/dashboard changes |

## Test Summary
- **Total tests written**: 12 handler/domain/route test functions with table-driven subtests across the PR1 slice, plus new hardening subtests in existing handler tables.
- **Fresh-review test additions**: 2 table-driven handler subtests for explicit-null backing updates on existing card instruments, plus PATCH route alignment for deactivate handler tests.
- **Total tests passing**: full backend suite passing.
- **PR2 additions**: Expense/income handler tests now cover normalized refs for create/update/read paths and activity covers `payment_context` precedence.
- **Layers used**: Unit/filesystem and handler-level tests with `pgxmock`.
- **Approval tests**: None — no refactoring-only tasks.
- **Pure functions created**: `IsValidPaymentContainerKind`, `IsValidPaymentInstrumentKind`, `ValidatePaymentContainerKind`, `ValidatePaymentInstrumentBackingContainer`, `RejectSplitPaymentPayload`.

## Tests Run
- `go test ./internal/handlers/payment_containers` (baseline safety net before changes)
- `go test ./internal/handlers/payment_containers` (RED after adding tests; failed as expected on omitted nullable ID preservation and not-found status)
- `gofmt -w internal/handlers/payment_containers/handlers_test.go internal/handlers/payment_containers/types.go internal/handlers/payment_containers/update.go internal/handlers/payment_containers/deactivate.go && go test ./internal/handlers/payment_containers`
- `go test ./internal/transactions ./internal/handlers/payment_containers ./internal/server -coverprofile=/tmp/payment-containers-pr1-cover.out`
- `go tool cover -func=/tmp/payment-containers-pr1-cover.out`
- `go test ./...` from `backend/`
- `go test ./internal/transactions ./internal/handlers/payment_containers` (hardening baseline safety net)
- `go test ./internal/handlers/payment_containers -run TestUpdatePaymentInstrumentScenarios` (RED; failed on unsupported kind and card-kind-without-backing update returning 500)
- `gofmt -w internal/transactions/payment_context_test.go internal/handlers/payment_containers/handlers_test.go internal/handlers/payment_containers/update.go && go test ./internal/transactions -run TestValidatePaymentContainerKind && go test ./internal/handlers/payment_containers -run 'Test(CreatePaymentInstrumentRequiresBackingForCards|UpdatePaymentInstrumentScenarios)'`
- `go test ./internal/transactions ./internal/handlers/payment_containers`
- `go test ./...` from `backend/`
- `go test ./internal/transactions ./internal/handlers/payment_containers ./internal/server -coverprofile=/tmp/payment-containers-pr1-hardening-cover.out && go tool cover -func=/tmp/payment-containers-pr1-hardening-cover.out`
- `go test ./internal/handlers/payment_containers` (fresh-review baseline safety net before changes)
- `go test ./internal/handlers/payment_containers -run TestUpdatePaymentInstrumentScenarios` (RED; explicit-null backing on existing `credit_card`/`debit_card` with omitted `kind` returned 500 by reaching UPDATE instead of validation)
- `gofmt -w internal/handlers/payment_containers/handlers_test.go internal/handlers/payment_containers/update.go && go test ./internal/handlers/payment_containers -run TestUpdatePaymentInstrumentScenarios`
- `go test ./internal/handlers/payment_containers -run 'Test(DeactivatePaymentContainerScenarios|DeactivatePaymentInstrumentScenarios)' && go test ./...` from `backend/`
- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 baseline safety net)
- `gofmt -w internal/handlers/expenses/payment_method_test.go internal/handlers/incomes/payment_method_test.go internal/handlers/activity/payment_method_test.go && go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 RED; failed on old transaction/activity wiring)
- `gofmt -w internal/handlers/expenses internal/handlers/incomes internal/handlers/activity && go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 GREEN after implementation)
- `gofmt -w internal/handlers/expenses/payment_method_test.go internal/handlers/incomes/payment_method_test.go && go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 triangulation: update replace/clear cases)
- `go test ./...` from `backend/`
- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 warning-fix safety net)
- `gofmt -w internal/handlers/activity/payment_method_test.go internal/handlers/expenses/payment_method_test.go internal/handlers/incomes/payment_method_test.go && go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 warning-fix RED; failed on one-field update final-pair validation and raw activity fallback label)
- `gofmt -w internal/transactions/payment_method.go internal/handlers/activity/list.go internal/handlers/activity/payment_method_test.go internal/handlers/expenses/payment_context.go internal/handlers/expenses/update.go internal/handlers/expenses/payment_method_test.go internal/handlers/incomes/payment_context.go internal/handlers/incomes/update.go internal/handlers/incomes/payment_method_test.go && go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/activity` (PR2 warning-fix GREEN)
- `go test ./...` from `backend/`

## Coverage Notes
- `internal/handlers/payment_containers` focused coverage improved from 34.0% to 69.6%.
- Previously untested functions now have passing coverage: `UpdatePaymentContainer` 70.4%, `UpdatePaymentInstrument` 62.8%, `DeactivatePaymentContainer` 69.2%, `DeactivatePaymentInstrument` 69.2%, `ListPaymentInstruments` 72.7%.
- Hardening coverage improved `internal/transactions` to 97.4% and `ValidatePaymentContainerKind` to 100%; `internal/handlers/payment_containers` improved to 74.9%, with `UpdatePaymentInstrument` at 78.7%.

## Deviations
- None from the assigned PR2 backend transaction wiring scope. No frontend, importer, dashboard, or management UI work was implemented.

## Issues Fixed
- Omitted `institution_id` / `backing_container_id` fields in update JSON no longer clear stored nullable IDs; update SQL now preserves existing values unless the JSON field is explicitly present.
- Update/deactivate handlers now return `404 Not Found` when the target row is absent or belongs to another account, instead of surfacing `pgx.ErrNoRows` as a 500.
- `UpdatePaymentInstrument` now rejects unsupported instrument kinds and updates to card kinds without an explicit backing container before executing SQL, returning `400 Bad Request` instead of relying on the database constraint to fail as a 500.
- `UpdatePaymentInstrument` now also rejects explicit `backing_container_id: null` when `kind` is omitted but the existing instrument is a `credit_card` or `debit_card`, returning `400 Bad Request` before the update statement.
- Create/update instrument handler tests now explicitly cover malformed `backing_container_id` and backing containers that do not belong to the current account.
- Deactivate handler tests now exercise the real `PATCH /payment-*/:id/deactivate` route shape instead of DELETE-only test routes.
- PR2 normalized transaction refs now validate active/account-owned containers and instruments before write; if both are present and the instrument has a backing container, it must match the provided container.
- Update endpoints preserve omitted normalized refs and clear them only on explicit JSON `null`, matching existing `payment_method` nullable semantics.
- Expense/income one-field normalized ref updates now validate the final persisted pair against the existing counterpart before running UPDATE.
- Activity fallback display labels now use a backend legacy payment-method label helper (`Credit card`, `Bank transfer`, etc.) while keeping `legacy_payment_method` as the raw enum for clients that need it.

## Remaining Tasks
- [x] 2.1 Expense normalized refs + compatibility.
- [x] 2.2 Income normalized refs + compatibility.
- [x] 2.3 Activity payment context labels.
- [ ] Phase 3 frontend management/forms.
- [ ] Phase 4 importer/dashboard/final verification.
