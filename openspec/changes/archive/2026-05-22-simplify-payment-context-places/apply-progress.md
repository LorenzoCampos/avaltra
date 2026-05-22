# Apply Progress: simplify-payment-context-places

## Status
Partial — both CRITICAL final-verify follow-up failures have been addressed in this apply pass, but final PASS is intentionally not claimed until `sdd-verify` reruns. Frontend changed-file lint helper fixes from PR #29 remain preserved.

## Scope of This Follow-up Apply
- [x] Reconstructed and persisted a Strict TDD Cycle Evidence table for the cumulative #25-#29 PR chain and this follow-up.
- [x] Added direct recurring generated-row regression coverage for the template place edit scenario for both expenses and incomes.
- [x] Updated the filesystem verify report only to note these fixes were added and that fresh `sdd-verify` is still required.

## Completed Work Across PR Slices
- [x] PR #25 / Phase 1: Backend place-first contract, legacy instrument compatibility, and clear-on-save behavior.
- [x] PR #26 / Phase 2: Frontend place-only forms/selectors, recurring forms, i18n/copy, and PR #23 reconciliation.
- [x] PR #27 / Phase 3: Importer deterministic place mapping, activity/read-model label precedence, and recurring generated occurrence place inheritance.
- [x] PR #28 / Phase 6: Dashboard current-place-balance and places-management polish.
- [x] PR #29: Frontend changed-file lint helper fixes and honest verify-report wording about the prior recurring persisted-row gap.
- [x] Follow-up final-verify fix: Added the missing direct recurring generated-row edit-history regression and republished this evidence table.

## Strict TDD Cycle Evidence

| Task / Slice | Test File(s) | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1-1.4 Backend place-first contract + legacy compatibility | `backend/internal/transactions/payment_context_test.go`; `backend/internal/handlers/expenses/payment_method_test.go`; `backend/internal/handlers/incomes/payment_method_test.go` | Unit + handler/pgxmock | Historical slice evidence: backend focused/full tests passed in verify; exact pre-change safety-net counts were not preserved in current artifact. | ⚠️ Not artifact-proven from current records; tests existed by PR #25 and passed in final verify. | ✅ `go test ./...` passed in final verify and again in this follow-up. | ✅ Expense/income create/update, place-only, explicit legacy instrument, and clear-on-save scenarios are covered. | ✅ Production kept existing schema/API fields; no destructive migration. |
| 2.1-2.5 Frontend place-only forms/selectors + i18n + PR #23 reconciliation | `frontend/src/features/paymentContext.runtime.test.ts`; `frontend/src/features/paymentMethod.runtime.test.ts`; `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Frontend runtime/static + server-render | Historical slice evidence: frontend tests/typecheck passed in final verify; PR #29 changed-file ESLint passed and was rerun in this follow-up. | ⚠️ Not artifact-proven from current records; runtime/source tests existed by PR #26 and passed in final verify. | ✅ `pnpm test`, `pnpm typecheck`, and targeted PR #29 ESLint passed in final verify; targeted ESLint passed again in this follow-up. | ✅ Payload stripping, recurring payloads, no primary instrument selectors/hooks, label fallback, and duplicate/edit legacy stripping are covered. | ✅ PR #29 replaced unused destructuring with lint-clean omit/delete helpers without changing payload behavior. |
| 3.1-3.4 Importer/activity/recurring read models | `backend/internal/handlers/imports/preview_test.go`; `backend/internal/handlers/imports/commit_test.go`; `backend/internal/handlers/activity/payment_method_test.go`; `backend/pkg/scheduler/recurring_payment_context_test.go` | Handler/pgxmock + scheduler unit/generated-row | Historical slice evidence: backend tests passed in final verify; scheduler package safety net passed before this follow-up change. | ⚠️ Historical RED for PR #27 not artifact-proven; new recurring edit-history test had a real RED in this follow-up because it could not compile against concrete `*pgxpool.Pool`. | ✅ `go test ./pkg/scheduler -run 'TestRecurring(Expense\|Income)GeneratedRowsKeepOriginalPlaceAfterTemplateEdit'`, `go test ./pkg/scheduler`, and `go test ./...` passed after minimal DB-boundary implementation. | ✅ Importer covers deterministic place mapping; activity covers container→instrument fallback; scheduler covers helper inheritance plus generated-row expense/income template edit history. | ✅ Minimal `recurringGeneratorDB` `QueryRow` boundary introduced only for insert generation helpers; daily scheduler still receives `*pgxpool.Pool`. |
| 4.1-4.4 Test and verification coverage | Backend tests above; frontend tests above; verify report | Cross-stack automated verification | Final verify recorded green backend/frontend tests/typecheck/build/whitespace before failing on evidence/test-gap gates. | ⚠️ Historical task-by-task RED not fully preserved; this artifact documents that honestly rather than claiming unknowable history. | ✅ Final verify product suites were green; this follow-up reran focused scheduler, package scheduler, full backend, targeted ESLint, and `git diff --check`. | ✅ Coverage spans backend validation/handlers, importer/activity, scheduler expense+income generation, frontend payload/source guards, dashboard/places polish. | ✅ Verify report wording now avoids final PASS and points to fresh `sdd-verify`. |
| 6.1-6.5 Dashboard current balance + places management polish | `frontend/src/features/dashboard/Dashboard.test.ts`; `frontend/src/features/payment-containers/paymentContainerManagement.test.ts`; backend dashboard/payment-container tests | Frontend runtime/static + backend unit/handler | Historical PR #28 evidence: focused frontend/backend tests and review passed; exact RED sequence not preserved in current artifact. | ⚠️ Not artifact-proven from current records; tests existed by PR #28 and passed in final verify. | ✅ `pnpm test` and `go test ./...` passed in final verify; backend full suite passed again in this follow-up. | ✅ Positive-only place balances, copy semantics, active/archived places, and reactivation paths are covered. | ✅ Scope stayed out of transfers/default places/savings/backfill/schema removal/credit. |
| Final follow-up direct recurring edit-history fix | `backend/pkg/scheduler/recurring_payment_context_test.go` | Scheduler unit with mockable generated-row DB boundary | ✅ `go test ./pkg/scheduler` passed before editing. | ✅ Test written first; `go test ./pkg/scheduler -run 'TestRecurring(Expense\|Income)GeneratedRowsKeepOriginalPlaceAfterTemplateEdit'` failed to compile because `generateExpenseFromTemplate` / `generateActualIncomeFromTemplate` required concrete `*pgxpool.Pool`. | ✅ After introducing `recurringGeneratorDB`, focused tests passed; `go test ./pkg/scheduler` and `go test ./...` passed. | ✅ Two behaviors covered: generated expense rows and generated income rows each persist A with place 1, then B with place 2 after template edit, while instruments are nil. | ✅ Boundary kept narrow to `QueryRow`; no broader scheduler refactor or schema/product scope added. |

## Test Summary
- **New tests written in this follow-up**: 2 (`TestRecurringExpenseGeneratedRowsKeepOriginalPlaceAfterTemplateEdit`, `TestRecurringIncomeGeneratedRowsKeepOriginalPlaceAfterTemplateEdit`).
- **New tests passing**: 2/2.
- **Layers used**: Scheduler unit/generated-row fake DB boundary; existing cumulative evidence spans backend unit/handler/pgxmock and frontend runtime/static/server-render.
- **Approval tests**: Existing scheduler helper tests preserved; no golden files.
- **Pure functions created**: 0.

## Tests Run In This Follow-up
- `go test ./pkg/scheduler` before editing — passed safety net.
- `go test ./pkg/scheduler -run 'TestRecurring(Expense|Income)GeneratedRowsKeepOriginalPlaceAfterTemplateEdit'` after writing tests only — failed to compile against concrete `*pgxpool.Pool` (RED).
- `go test ./pkg/scheduler -run 'TestRecurring(Expense|Income)GeneratedRowsKeepOriginalPlaceAfterTemplateEdit'` after implementation — passed.
- `go test ./pkg/scheduler` — passed.
- `go test ./...` from `backend/` — passed.
- `pnpm exec eslint src/lib/paymentContext.ts src/features/expenses/formSubmissions.ts src/features/incomes/formSubmissions.ts` from `frontend/` — passed; PR #29 frontend lint helper fixes preserved.
- `git diff --check` — passed.

## Files Changed In This Follow-up
- `backend/pkg/scheduler/recurring_expenses.go` — added narrow `recurringGeneratorDB` `QueryRow` interface and changed expense generation helper to accept it.
- `backend/pkg/scheduler/recurring_incomes.go` — changed income generation helper to accept the same narrow interface.
- `backend/pkg/scheduler/recurring_payment_context_test.go` — added direct generated-row expense/income regressions and a small fake DB that captures inserted row context.
- `openspec/changes/simplify-payment-context-places/verify-report.md` — updated to state fixes were added, without claiming final PASS.

## Remaining Gaps / Next Steps
- [ ] Rerun `sdd-verify` to reassess the Strict TDD gate and final verdict.
- [ ] Task 4.5 remains incomplete for manual smoke marker; task 5.2 and 5.3 remain future migration/physical-removal planning.
- [ ] Historical RED evidence for earlier PR slices was not fully recoverable from current artifacts; this table marks those rows honestly instead of overclaiming.

## Workload / PR Boundary
- Mode: stacked PR chain follow-up after PR #29 merge.
- Current work unit: final verify gate fixes only.
- Boundary: SDD evidence artifact + scheduler direct recurring edit-history regression; no transfers/default places/savings/backfill/schema removal/credit.
- Estimated review budget impact: small, focused backend test/boundary diff plus verify artifact update.
