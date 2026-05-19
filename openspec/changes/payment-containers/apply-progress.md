# Apply Progress: payment-containers

## Scope
PR1 foundation, PR2 backend transaction wiring, PR3 frontend management, PR4 transaction forms/activity labels, post-PR4 hardening, and PR5 importer/dashboard final functional slice are complete on the resolved `stacked-to-main` chain.

No recurring transaction payment-context work, transfers between wallets/banks, branding, or spreadsheet work was implemented in this slice. Packaging/PR work is handled separately by the orchestrator after verification.

## Completed Tasks
- [x] 1.1 Added additive migration `023_create_payment_containers` with `payment_institutions`, `payment_containers`, `payment_instruments`, nullable expense/income FK columns, indexes, and reversible down migration.
- [x] 1.2 Added `internal/transactions/payment_context.go` for container/instrument kind validation, `split-payment-not-supported`, and `backing-container-required` card validation.
- [x] 1.3 Added backend payment container/instrument CRUD/list/deactivate handlers and registered protected account-scoped routes.
- [x] PR1 hardening/fresh-review fixes for update/deactivate not-found handling, explicit card backing validation, and route-shape coverage.
- [x] 2.1 Expense create/update/get/list accept, validate, persist, and return nullable `source_container_id` and `source_instrument_id` while preserving legacy-only `payment_method` payloads.
- [x] 2.2 Income create/update/get/list accept, validate, persist, and return nullable `destination_container_id` and `destination_instrument_id` with the same compatibility semantics.
- [x] 2.3 Activity list exposes nullable `payment_context` with display precedence `normalized label → payment_method → null`.
- [x] PR2 verification warning fix for one-field normalized ref replacement validation and backend legacy fallback labels.
- [x] 3.1 Added frontend payment container/instrument API types and optional normalized payment-context fields to expense/income types.
- [x] 3.2 Added TanStack Query hooks for `/payment-containers` and `/payment-instruments`.
- [x] 3.3 Added payment places/methods management page/forms plus route/navigation entry.
- [x] PR3 verification and lint fixes for behavioral management coverage and component-only Fast Refresh exports.
- [x] 3.4 Expense/income optional normalized selectors and payload helpers.
- [x] 3.5 Expense/income lists and activity feed fallback-safe payment-context labels without changing money formatting.
- [x] PR4 verification warning fix for transaction form helper extraction and focused ESLint.
- [x] Post-PR4 hardening: inactive management entity edits no longer send implicit `is_active: true`; editing a card-like instrument keeps its inactive backing container selectable; management page/forms/navigation are localized with clearer Spanish wording; activity legacy fallbacks resolve through expense/income namespaces; expense/income table headers say place/method.
- [x] 4.1 Importer compatibility keeps legacy medium alias behavior and attaches normalized refs only when the raw medium exactly and uniquely matches one active container/instrument; ambiguous or unknown matches remain legacy-only/unassigned.
- [x] 4.2 Dashboard summary returns `money_by_container` with explicit `Unassigned` bucket; frontend types, dashboard card, insights, and i18n render the breakdown.
- [x] 4.3 Backend importer/dashboard tests cover deterministic import refs, ambiguous fallback, SQL persistence, and unassigned money-by-container breakdown logic.
- [x] 4.4 Frontend dashboard tests cover money-by-container mapping and optional missing backend field fallback; existing payment-method runtime tests remain green.
- [x] 4.5 Final verification prep completed with backend and frontend checks.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Prior PR1-PR4 + hardening | See previous revisions of `sdd/payment-containers/apply-progress` | Backend/frontend unit+handler | ✅ Historical evidence preserved in previous apply-progress revisions and filesystem artifact | ✅ Historical slices documented RED where preserved; post-PR4 hardening recorded a RED-order deviation | ✅ Historical tests/builds passed | ✅ Historical cases covered spec scenarios | ✅ Helper extraction/refactors documented |
| 4.1 Importer compatibility | `backend/internal/handlers/imports/{preview_test.go,commit_test.go}` | Handler/unit | ✅ Existing importer tests read before changes; focused package run after RED failed on missing normalized fields/SQL | ✅ Tests written first; compile/expectation failures proved missing `SourceContainerID` and new INSERT columns | ✅ `go test ./internal/handlers/imports` passed | ✅ Preview covers deterministic container match; unit helper covers backed instrument, ambiguous duplicate, and unknown medium fallback | ✅ Added small payment-context catalog helpers; legacy alias/fingerprint path preserved |
| 4.2 Dashboard money-by-container | `backend/internal/handlers/dashboard/summary_test.go`, `frontend/src/features/dashboard/Dashboard.test.ts` | Backend unit + frontend unit | ✅ Existing dashboard tests read before changes; focused runs after RED failed on missing helper/module/types | ✅ Backend tests referenced missing `containerMoneyRow`/`buildMoneyByContainerBreakdown`; frontend test referenced missing `dashboardMoneyByContainer` module | ✅ Focused backend and frontend tests passed | ✅ Backend covers container ordering, percentage, unassigned bucket, and merged unassigned rows; frontend covers rendered item mapping and missing optional field | ✅ Extracted frontend mapping helper and backend breakdown helper |
| 4.3 Backend tests | Same as 4.1/4.2 | Handler/unit | ✅ `go test ./internal/handlers/imports ./internal/handlers/dashboard` baseline/red/green cycle recorded | ✅ New tests failed before implementation | ✅ Focused backend packages and full `go test ./...` passed | ✅ Import + dashboard edge cases covered | ✅ gofmt applied |
| 4.4 Frontend tests | `frontend/src/features/dashboard/Dashboard.test.ts`, `frontend/src/features/paymentMethod.runtime.test.ts` | Frontend unit | ✅ Existing runtime tests remained green after focused run | ✅ Dashboard helper test failed before module existed | ✅ Focused dashboard/payment-method tests and full `npm test` passed | ✅ Optional missing field and unassigned display mapping covered | ✅ Pure mapper keeps UI component simple |
| 4.5 Verification prep | Backend/frontend suites | Verification | ✅ N/A final checks | ✅ N/A | ✅ `go test ./...`, full `npm test`, `npm run typecheck`, and `npm run build` passed | ✅ Full suite exercises prior spec scenarios plus PR5 additions | ✅ None |

## Tests Run
- `go test ./internal/handlers/imports ./internal/handlers/dashboard` from `backend/` (RED; failed on missing importer/dashboard normalized helpers/fields)
- `npm test -- --run src/features/dashboard/Dashboard.test.ts` from `frontend/` (RED; failed on missing `dashboardMoneyByContainer` module)
- `gofmt -w ... && go test ./internal/handlers/imports ./internal/handlers/dashboard` from `backend/` (passed)
- `npm test -- --run src/features/dashboard/Dashboard.test.ts` from `frontend/` (13 tests passed)
- `go test ./internal/handlers/imports ./internal/handlers/dashboard` from `backend/` (triangulation passed)
- `go test ./...` from `backend/` (passed)
- `npm test -- --run src/features/dashboard/Dashboard.test.ts src/features/paymentMethod.runtime.test.ts` from `frontend/` (20 tests passed)
- `npm test` from `frontend/` (18 files / 87 tests passed)
- `npm run typecheck` from `frontend/` (passed)
- `npm run build` from `frontend/` (passed with existing Vite dynamic-import and chunk-size warnings)

## Deviations / Scope Decisions
- The importer only attaches normalized refs for exact unique active container/instrument name matches. This intentionally avoids inferred alias-to-normalized backfill when multiple matches or no deterministic match exist.
- Dashboard `money_by_container` uses historical normalized income minus expense movements and includes only positive buckets for the compact v1 display; unmigrated normalized-null movements are grouped into `Unassigned`.
- No transfers between wallets/banks and no recurring transaction payment-context implementation were added.
- `frontend/src/hooks/useDashboard.ts` did not need logic changes beyond the typed response contract; the hook already returns the API summary generically.

## Issues Fixed / Discoveries
- Import preview/commit now loads active payment containers/instruments into a deterministic catalog without altering legacy `payment_method` alias validation or duplicate fingerprint semantics.
- Dashboard breakdown required a pure backend aggregation helper and frontend mapping helper to keep behavior testable without adding DOM/RTL dependencies.
- Existing untracked `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx` remain untouched.

## Remaining Tasks
- [x] All functional tasks for `payment-containers` are complete.
- [ ] Final SDD verify/archive can run next if desired.
