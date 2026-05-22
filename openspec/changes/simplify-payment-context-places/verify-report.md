# Verification Report

**Change**: simplify-payment-context-places  
**Issue**: #24  
**Mode**: Strict TDD  
**Date**: 2026-05-21  
**Verdict**: PASS WITH WARNINGS

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 29 |
| Tasks complete | 26 |
| Tasks incomplete | 3 |

Incomplete tasks are non-blocking follow-up/planning items: full manual smoke/cross-stack verification marker 4.5, migration planning 5.2, and future physical-removal planning 5.3. Required automated cross-stack verification was completed in this verify phase.

## Build & Tests Execution

| Command | Result | Evidence |
|---|---|---|
| `go test ./...` from `backend/` | ✅ Passed | All backend packages passed; packages without tests reported `[no test files]`. |
| `pnpm test` from `frontend/` | ✅ Passed | 18 test files passed, 92 tests passed. |
| `pnpm typecheck` from `frontend/` | ✅ Passed | `tsc --noEmit -p tsconfig.app.json` completed successfully. |
| `pnpm build` from `frontend/` | ✅ Passed with known warnings | Initial 120s run timed out during transform; rerun with 300s completed in 1m44s. Vite warned about mixed static/dynamic i18next import chunking and chunk size >500kB; classified as existing build warnings, not correctness failures. |
| `git diff --check` from repo root | ✅ Passed | No whitespace errors. |
| `git status --short` from repo root | ✅ Clean except known untracked forbidden files | Only `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx` are untracked; they were not touched. |

## TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress` contains a TDD Cycle Evidence table. |
| All tasks have tests | ✅ | 11/11 evidence rows reference concrete test files or same-file focused suites. |
| RED confirmed (tests exist) | ✅ | Referenced backend and frontend test files exist and were inspected. |
| GREEN confirmed (tests pass) | ✅ | Full backend and frontend suites pass now. |
| Triangulation adequate | ✅ | Coverage includes create/update, legacy compatibility, importer deterministic/ambiguous paths, activity fallback, recurring expense/income generation, dashboard positive/zero/negative cases, and places active/archived/reactivation cases. |
| Safety Net for modified files | ✅ | Apply-progress records baseline/focused safety-net runs before implementation for each PR slice. |

**TDD Compliance**: 6/6 checks passed.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit/runtime/static | 34+ focused assertions | `frontend/src/features/paymentContext.runtime.test.ts`, `frontend/src/features/dashboard/Dashboard.test.ts`, `backend/internal/transactions/payment_context_test.go`, `backend/pkg/scheduler/recurring_payment_context_test.go` | Vitest, Go test |
| Handler/integration-style | 20+ focused scenarios | expense/income payment context tests, importer preview/commit tests, activity test, dashboard/payment-container backend tests | Go test, pgxmock/gin httptest |
| Server-render/static UI | 10 tests | `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Vitest + React server render |
| E2E | 0 | None | Not installed/detected |

## Changed File Coverage

Coverage analysis skipped — no cached coverage capability or project threshold was provided for this verify run. This is informational only under Strict TDD verify.

## Assertion Quality

| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `frontend/src/features/dashboard/Dashboard.test.ts` | 130 | `expect(getDashboardMoneyByContainerItems(undefined, 'Unassigned')).toEqual([])` | Empty-array assertion is acceptable here because companion tests assert non-empty and filtered output for the same helper. | None |

**Assertion quality**: ✅ No blocking trivial assertions found. Static/source guards are paired with production helper calls and behavior assertions.

## Quality Metrics

**Linter**: ⚠️ Original `pnpm lint` failed with existing broad repo lint debt plus changed-file warnings/errors in `frontend/src/lib/paymentContext.ts` and expense/income `formSubmissions.ts` for unused destructured `_...` fields. Follow-up apply fixed the changed-file warnings; targeted `pnpm exec eslint src/lib/paymentContext.ts src/features/expenses/formSubmissions.ts src/features/incomes/formSubmissions.ts` now passes. Full repo lint was not rerun and may still include pre-existing debt.  
**Type Checker**: ✅ No errors.  
**Build**: ✅ Passed with Vite/i18next/chunk warnings.

## Spec Compliance Matrix

| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| Container and Instrument Domain Model | Primary flow stores place-only context | Backend expense/income payment context handler tests; frontend `paymentContext.runtime.test.ts`; full suites passed. | ✅ COMPLIANT |
| Container and Instrument Domain Model | Legacy instrument-backed rows remain readable | Activity payment context fallback test; frontend label fallback test; backend full tests passed. | ✅ COMPLIANT |
| Transaction Form Selection Behavior | Place-only selection in primary forms | Frontend runtime/source tests verify no instrument hooks/selectors and no instrument IDs in duplicate drafts; full frontend tests passed. | ✅ COMPLIANT |
| Activity and Transaction Detail Display | Fallback precedence avoids broken labels | Backend activity SQL expectation uses `COALESCE(pc.name, pi.name)` and frontend label tests prefer container then instrument then legacy method. | ✅ COMPLIANT |
| Importer Backward Compatibility | Deterministic place mapping is preferred | Import preview/commit tests verify deterministic container attachment and nil instrument args for new rows; ambiguous/instrument-name cases stay nil. | ✅ COMPLIANT |
| Explicit V1 Non-Goals | Future-scope request handling | Scope artifacts and implementation inspection show no transfers, required/default/savings-goal places, credit/debt/cards/cuotas/resumen, destructive backfill, physical instrument schema removal, or transfer contracts added. | ✅ COMPLIANT |
| Optional Template Payment Context | Save template with place-only context | Frontend recurring payload tests plus backend validation parity via shared payment context; full suites passed. | ✅ COMPLIANT |
| Optional Template Payment Context | Legacy payload with instrument remains compatible | Backend payment context validation keeps explicit instrument compatibility; create handler tests include normalized refs accepted. | ✅ COMPLIANT |
| Future Occurrence Inheritance by Snapshot | Generated occurrence inherits place snapshot | `backend/pkg/scheduler/recurring_payment_context_test.go` verifies recurring expense/income generation keeps container and clears legacy instrument; full backend tests passed. | ✅ COMPLIANT |
| Template Edit Scope Is Future-Only | Existing generated rows stay unchanged after place edit | A direct row-level regression was not added in this follow-up because scheduler generation currently depends on concrete `*pgxpool.Pool`, making pgxmock-style persisted-row coverage non-trivial without broader scheduler refactoring. Existing scheduler tests still cover future occurrence inheritance and nil legacy instruments, but not persisted historical-row immutability after template edit. | ⚠️ PARTIAL |
| Validation Parity with One-Time Transactions | Place-first validation parity | Shared backend payment-context validation tests plus handler tests for place-only create/update acceptance; full backend tests passed. | ✅ COMPLIANT |

**Compliance summary**: 10/11 scenarios compliant, 1/11 partial by direct test specificity. Follow-up apply fixed changed-file lint warnings, but did not add direct persisted-row coverage for recurring edit-history immutability.

## Correctness (Static Evidence)

| Area | Status | Notes |
|------|--------|-------|
| Backend/API one-time flows | ✅ Implemented | Place-only container IDs accepted/stored; explicit legacy instruments tolerated only when provided; clear-on-save covered. |
| Frontend primary flows | ✅ Implemented | Forms/source guards remove instrument selectors/hooks from primary expense/income/recurring flows and payload helpers strip instrument refs. |
| Importer | ✅ Implemented | Deterministic active container matching preferred; instrument-derived primary mapping avoided; legacy `payment_method` preserved. |
| Activity/read labels | ✅ Implemented | Backend and frontend prefer container labels, then instrument, then legacy method. |
| Dashboard | ✅ Implemented | Current available balance copy and positive-only place rows covered by focused tests. |
| Places management | ✅ Implemented | Active places primary, archived/reactivation path present, destructive deactivate de-emphasized, instruments collapsed as legacy. |
| Excluded scopes | ✅ Preserved | No implementation of transfers, required/default places, savings-goal places, credit/debt/cards/cuotas/resumen, backfill, or schema removal found. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Soft-deprecate instruments, keep schema/data | ✅ Yes | No destructive migration/schema removal was introduced. |
| Keep current API field names | ✅ Yes | `source_container_id` and `destination_container_id` remain primary. |
| Accept instrument payloads only as legacy compatibility | ✅ Yes | Tests verify explicit compatibility but primary frontend/import/scheduler paths do not create instrument refs. |
| Prefer labels container → instrument → legacy method | ✅ Yes | Covered in backend activity and frontend label tests. |
| Avoid PR #23 instrument-primary UX | ✅ Yes | Places management keeps instruments collapsed/de-emphasized. |

## Issues Found

### CRITICAL

None.

### WARNING

- `pnpm lint` fails. Most failures are repo-wide existing lint debt/generated `dev-dist`; changed-file lint issues found during verification were fixed after this report and targeted changed-file ESLint now passes. Typecheck/build/tests are green.
- Recurring “existing generated rows stay unchanged after place edit” is supported by unchanged future-only architecture and scheduler tests for future occurrence inheritance, but does not have direct persisted-row regression coverage in this verification evidence.
- Build completed only on the longer 300s retry; the first 120s attempt timed out during Vite transform. This is performance/noise, not a correctness failure.

### FOLLOW-UP FIXES APPLIED AFTER THIS REPORT

- Changed-file lint warnings were fixed by replacing destructuring-to-strip patterns with lint-clean omit/delete helpers; targeted changed-file ESLint now passes.
- Removed the weak helper-pointer edit-history tests from the follow-up because they did not prove persisted generated-row immutability. Direct persisted-row coverage remains a future test gap unless scheduler generation is refactored behind a mockable DB boundary or covered by an integration DB test.

### SUGGESTION

- Full verify should be rerun to replace this PASS WITH WARNINGS report with fresh evidence if desired.
- Full repo lint may still need a separate cleanup for generated `dev-dist/` and pre-existing lint debt.

## Final Verdict

PASS WITH WARNINGS — Required backend tests, frontend tests, typecheck, build, whitespace check, artifact review, status inspection, Strict TDD evidence validation, and implementation inspection all support the places-only payment context change. Follow-up apply fixed the changed-file lint warnings, but direct persisted-row regression coverage for recurring edit-history immutability remains a documented gap until a broader mockable DB boundary or integration DB test is added.
