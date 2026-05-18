# Apply Progress: payment-containers

## Scope
PR1 foundation, PR2 backend transaction wiring, and PR3 frontend management remain complete. PR4 transaction forms and fallback-safe transaction/activity labels are now implemented on the resolved `stacked-to-main` chain.

No importer compatibility, dashboard money-by-container breakdown, backend handler changes, branding, spreadsheet, commit, or PR work was implemented in this slice.

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
- [x] 3.1 Added frontend payment container/instrument API types and optional normalized payment-context fields to expense/income types without touching dashboard contracts.
- [x] 3.2 Added TanStack Query hooks for `/payment-containers` and `/payment-instruments`, including list/create/update/deactivate mutations wired to the existing axios client.
- [x] 3.3 Added the payment context management page, container/instrument forms, card backing-container UI validation, active/inactive list badges, route entry, and desktop/mobile navigation links.
- [x] PR3 verification fix: replaced source-string-primary frontend management tests with behavioral Vitest coverage for `PaymentContainersPage` loading/error/empty/list rendering, container form submit payload validation, and instrument card-backing submit enforcement.
- [x] PR3 lint fix: moved `getContainerFormSubmission` and `getInstrumentFormSubmission` to `frontend/src/features/payment-containers/formSubmissions.ts` and updated tests/imports so component files export components only.
- [x] 3.4 Expense and income schemas/forms now accept optional normalized UUID selectors, load active containers/instruments from PR3 hooks, auto-align card-backed instruments to their backing container, and preserve legacy `payment_method` behavior.
- [x] 3.5 Expense/income lists and activity feed now render normalized `payment_context` labels when present and fallback to legacy payment-method labels without changing `MoneyAmountDisplay` usage.
- [x] PR4 verification warning fix: moved `buildExpenseSubmitPayload`, `getExpenseFormPaymentMethodValue`, `buildIncomeSubmitPayload`, and `getIncomeFormPaymentMethodValue` out of component files into non-component `formSubmissions.ts` modules; removed PR4-owned focused ESLint errors by typing touched list handlers and shared API-error formatting.

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
| 3.1/3.2/3.3 | `frontend/src/features/payment-containers/paymentContainerManagement.test.ts`, `frontend/src/components/Layout.test.ts` | Frontend source/type contract | ✅ Frontend has Vitest; `npm run typecheck` passed before verification after implementation | ✅ New test failed first because payment instrument types/hooks/page did not exist | ✅ Focused tests and full `npm test` passed after adding types, hooks, forms, page, route, and navigation | ✅ Tests cover card backing helper, endpoint wiring, route/navigation wiring, and PR3 non-scope guard | ✅ Removed local lint issues in new files; no transaction/importer/dashboard work |
| PR3 verification fix | `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Frontend behavior/unit | ✅ PR3 verify showed typecheck, full tests, and build passed but frontend evidence was mostly source-string inspection | ✅ Verification failed because tests did not render/exercise loading/error/empty/list behavior or form-submit card backing enforcement | ✅ Focused test, typecheck, full `npm test`, and build pass after adding server-render page tests and submit-validation helpers used by the forms | ✅ Cases cover loading, error, empty, active/inactive lists, backing labels, container required/trim/update payloads, and instrument card/non-card submit payloads | ✅ Minimal extraction of form submit helpers; no backend, PR4, importer, dashboard, branding, or spreadsheet changes |
| PR3 lint fix | `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Frontend unit/refactor | ✅ 7 focused payment-container tests passed before refactor | ✅ Approval tests already covered helper behavior before moving it; lint failed on component files exporting non-components | ✅ Focused test, typecheck, and focused eslint passed after helper-module extraction | ✅ Existing cases cover blank/trimmed/reactivation container payloads and card/non-card instrument payloads | ✅ Moved helpers only; no behavior changes |
| 3.4/3.5 | `frontend/src/features/paymentContext.runtime.test.ts` | Frontend behavior/unit | ✅ Vitest runner available; schemas/forms/lists had legacy-only payment-method behavior before changes | ✅ New behavior tests first failed because submit helpers did not resolve backing containers and display fallback returned raw i18n keys in the test stub | ✅ Focused payment-context tests, full frontend tests, typecheck, and build pass after schema/form/list/activity implementation | ✅ Cases cover optional blank selectors, instrument-backed container resolution, edit clearing, normalized-label precedence, and legacy fallback | ✅ Extracted shared payment-context helpers and localized new form labels |
| PR4 verification warning fix | `frontend/src/features/paymentContext.runtime.test.ts`, `frontend/src/features/paymentMethod.runtime.test.ts` | Frontend unit/refactor | ✅ 11 focused tests passed before refactor | ✅ Tests were repointed first to new `formSubmissions.ts` modules and failed because the modules did not exist | ✅ 11 focused tests, typecheck, focused ESLint, full frontend tests, and build pass after extraction/typing cleanup | ✅ Existing cases cover create/update payment-method semantics, optional selectors, backed instrument resolution, edit clearing, and label fallback | ✅ Component files now export components only; helper behavior preserved in non-component modules |

## Test Summary
- **Total tests written**: 12 handler/domain/route test functions with table-driven subtests across the PR1 slice, plus new hardening subtests in existing handler tables.
- **Fresh-review test additions**: 2 table-driven handler subtests for explicit-null backing updates on existing card instruments, plus PATCH route alignment for deactivate handler tests.
- **Total tests passing**: full backend suite passing.
- **PR2 additions**: Expense/income handler tests now cover normalized refs for create/update/read paths and activity covers `payment_context` precedence.
- **PR3 additions**: Frontend source-contract tests cover management endpoint wiring, card backing selection rule, route/navigation wiring, and scope guard against transaction forms.
- **PR3 verification fix additions**: Behavioral frontend tests now render `PaymentContainersPage` through mocked hooks and exercise form submit payload/validation helpers used by `ContainerForm` and `InstrumentForm`.
- **PR3 lint fix**: Refactor-only approval coverage preserved 7 focused tests while moving helper exports out of component files.
- **PR4 additions**: `paymentContext.runtime.test.ts` adds 4 behavior tests for optional selectors, backing-container payload resolution, edit clearing, and display-label fallback.
- **PR4 warning fix**: Refactor-only coverage preserved 11 focused tests while moving transaction form submit/payment-method helpers out of component files; no DOM/RTL dependency exists, so selector coverage remains helper-level plus static component wiring inspection.
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
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts` (PR3 RED; failed because frontend payment instrument types/hooks/page did not exist)
- `npm run typecheck`
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts` (PR3 GREEN)
- `npm run build` (first run timed out during Vite transform at 120s; retried with 300s and passed)
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts src/components/Layout.test.ts`
- `npm test` from `frontend/`
- `npm run lint` from `frontend/` (failed on pre-existing lint debt outside this PR3 slice; no remaining reported errors in new payment-containers files)
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts` (PR3 verification fix focused behavioral suite; 7 tests passed)
- `npm run typecheck` from `frontend/`
- `npm test` from `frontend/` (17 files / 79 tests passed)
- `npm run build` from `frontend/` (passed; existing dynamic-import and chunk-size warnings remain)
- `npm test -- --run src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts` (PR4 warning-fix baseline; 11 focused tests passed before refactor)
- `npm test -- --run src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts` (PR4 warning-fix RED; failed because new expense/income `formSubmissions.ts` modules did not exist yet)
- `npm test -- --run src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts` (PR4 warning-fix GREEN; 11 focused tests passed after helper extraction)
- `npx eslint src/features/expenses/ExpenseForm.tsx src/features/expenses/formSubmissions.ts src/features/incomes/IncomeForm.tsx src/features/incomes/formSubmissions.ts src/lib/paymentContext.ts src/lib/apiError.ts src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts src/schemas/expense.schema.ts src/schemas/income.schema.ts src/features/expenses/ExpenseList.tsx src/features/incomes/IncomeList.tsx src/features/activity/components/ActivityFeed.tsx src/hooks/useActivity.ts` from `frontend/` (passed)
- `npm test -- --run src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts && npm run typecheck` from `frontend/` (passed)
- `npm test` from `frontend/` (18 files / 83 tests passed)
- `npm run build` from `frontend/` (passed with existing Vite dynamic-import and chunk-size warnings)
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts` (PR3 lint-fix baseline; 7 tests passed)
- `npm test -- --run src/features/payment-containers/paymentContainerManagement.test.ts` (PR3 lint-fix post-refactor; 7 tests passed)
- `npm run typecheck` from `frontend/` (passed)
- `npx eslint src/features/payment-containers/ContainerForm.tsx src/features/payment-containers/InstrumentForm.tsx src/features/payment-containers/formSubmissions.ts src/features/payment-containers/paymentContainerManagement.test.ts` from `frontend/` (passed; confirms the two new PR3 react-refresh lint errors are gone)
- `npm run lint` from `frontend/` (failed on pre-existing lint debt outside this PR3 lint-fix scope, including `dev-dist/workbox-1fb923f4.js`, `src/api/axios.ts`, `src/components/FeatureTour.tsx`, `src/components/PageTransition.tsx`, existing expense/income form react-refresh exports, and broader `any`/React Compiler issues)
- `npm test -- --run src/features/paymentContext.runtime.test.ts` (PR4 RED; failed before implementation because form submit helpers did not resolve backing-container IDs and fallback-label test stub returned raw i18n keys)
- `npm test -- --run src/features/paymentContext.runtime.test.ts` (PR4 GREEN; 3 tests passed after optional UUID schema fields and shared context helpers)
- `npm test -- --run src/features/paymentContext.runtime.test.ts && npm run typecheck` (PR4 regression; 4 focused tests passed, combined command timed out during typecheck after tests)
- `npm run typecheck` from `frontend/` (passed)
- `npm test` from `frontend/` (18 files / 83 tests passed)
- `npm run build` from `frontend/` (passed; existing dynamic-import and chunk-size warnings remain)
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
- None from the assigned PR4 transaction forms/display scope. Importer compatibility and dashboard money-by-container breakdown remain intentionally skipped for PR5.

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
- The frontend now has Vitest configured, so PR3 followed test-first behavior instead of using the earlier no-frontend-runner limitation from SDD init.
- PR3 frontend management tests can render React components with `react-dom/server` under the existing Vitest runner; no extra DOM test dependency was required.
- The global `npm run lint` command currently fails on pre-existing frontend lint debt and generated `dev-dist` artifacts outside this PR3 slice; focused tests, full Vitest suite, typecheck, and build pass.
- `react-refresh/only-export-components` is satisfied for the PR3 management forms by keeping `ContainerForm.tsx` and `InstrumentForm.tsx` component-only and placing reusable submit helpers in `formSubmissions.ts`.
- PR4 forms use the PR3 hooks for active containers/instruments. Selecting a backed instrument auto-selects/sends its backing container so the frontend does not create invalid pair payloads.
- Clearing normalized selectors while editing now sends `null` when an existing normalized ID was present, instead of silently preserving the old backend value through omission.
- Transaction/activity label rendering uses `payment_context.display_label`/normalized names first, then legacy `payment_method`; money display components and formatting props were left unchanged.
- Expense/income component files now export only React components; transaction submit helpers live in `frontend/src/features/{expenses,incomes}/formSubmissions.ts` for Fast Refresh compatibility.
- No DOM/RTL dependency is available in the frontend package; no dependency was added. Selector behavior remains covered through schema/payload helpers and the existing component wiring, with this limitation documented for verification.

## Remaining Tasks
- [x] 2.1 Expense normalized refs + compatibility.
- [x] 2.2 Income normalized refs + compatibility.
- [x] 2.3 Activity payment context labels.
- [x] 3.1 Frontend payment container/instrument types and required transaction type extensions.
- [x] 3.2 Frontend payment container/instrument hooks.
- [x] 3.3 Frontend management page/forms and route/navigation entry.
- [x] PR3 verification test-quality fix.
- [x] PR3 lint fix for payment-container form helper exports.
- [x] 3.4 Transaction form optional selectors (PR4).
- [x] 3.5 Transaction/activity label rendering (PR4).
- [x] PR4 verification warning fix for component-file exports and focused touched-file ESLint.
- [ ] Phase 4 importer/dashboard/final verification.
