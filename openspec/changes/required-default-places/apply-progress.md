# Apply Progress: Required Default Places

## Status

Work Unit / PR 1 complete: backend account default persistence/API contract plus manual one-time expense/income required-place enforcement.

Work Unit / PR 2 complete: frontend account default management plus manual expense/income required active place selection, active default prefill, inactive default warnings, and no-active-place CTA.

PR2 review-fix pass complete: account default fields now survive `zodResolver(accountSchema)` submit validation/mapping, and account edit payment-container loading is deterministically scoped to the edited account instead of transiently reusing the previously active account's cached containers.

PR2 re-review blocker fixed: account edit no longer mutates the global active account or invalidates broad `payment-containers` queries while merely loading the edit form; default-place loading remains scoped by explicit `accountId`/`X-Account-ID` and query key.

Work Unit / PR 3 complete: quick-add expense now requires an active source place, preselects the active account default expense place when available, warns/blocks when no active place exists, and importer commit coverage proves ambiguous payment-context imports keep null place instead of guessing.

PR3 review-fix pass complete: quick-add now revalidates the selected source place against the latest active payment-container options, clears stale selections without overwriting valid user choices, and suppresses the no-active-place warning until payment-container loading has resolved.

## Mode

Standard mode was recorded for the earlier PR3 implementation batch because the orchestrator instructions resolved no explicit current `strict_tdd: true` flag/test command in init memory and asked to use tests-first where practical. For this PR3 review-fix pass, cached testing capabilities still report Strict TDD enabled and a frontend Vitest runner is available, so the review-fix helper behavior used a focused Strict TDD cycle.

## Completed Tasks

- [x] 1.1 Added nullable account default place migration (`025_add_account_default_places`).
- [x] 1.2 Extended account create/get/list/update DTOs and SQL mapping with `default_expense_container_id` and `default_income_container_id`.
- [x] 1.3 Added account update validation for non-null defaults against active containers in the same account.
- [x] 2.1 Added/updated backend handler tests for manual one-time expense/income required-place behavior.
- [x] 2.2 Implemented required active `source_container_id` validation for manual one-time expenses on create/update.
- [x] 2.3 Implemented required active `destination_container_id` validation for manual one-time incomes on create/update.
- [x] 2.4 Added importer commit regression coverage proving ambiguous payment-context rows may persist with null container/instrument references instead of being forced to guess a place.
- [x] 3.1 Added frontend account types/update payload support for nullable default expense/income place fields.
- [x] 3.2 Added account edit UI to manage default expense/income places with active-place options and inactive/missing default warnings.
- [x] 3.3 Added frontend schema tests proving manual expense/income place fields reject blank or missing values.
- [x] 3.4 Updated manual expense/income forms and submit mapping to prefill active account defaults, require active place selection, warn on inactive defaults, and show a manage-places CTA when no active place exists.
- [x] 4.1 Updated quick-add tests and implementation so quick-add requires active `source_container_id`, includes it in payloads, preselects active account default expense place, ignores inactive defaults with warning, and disables submit when there is no active place.
- [x] 4.2 Ran integration verification across backend handler tests, frontend quick-add/schema/runtime tests, affected-file ESLint, frontend typecheck, and production build.
- [x] 4.3 Completed code-level smoke guard: expense/income forms and quick-add share required-place intent, quick-add cannot submit without an active place, and importer commit still accepts unresolved/ambiguous null-place rows.
- [x] 5.1 Confirmed no implementation was added for recurring templates, savings-goal places, transfers, credit/debt, physical instrument removal, or new backend default-place APIs beyond PR1.

## Tests Run

- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/accounts` — pass (PR1).
- `go test ./...` from `backend/` — pass (PR1).
- `go test ./internal/handlers/accounts -count=1` from `backend/` — pass (PR1 review-fix baseline and affected package run).
- `go test ./internal/handlers/accounts -run 'TestUpdateAccount' -count=1` from `backend/` — pass (PR1 narrow account update handler review-fix coverage).
- `npm test -- transactionPlace.schema.test.ts` from `frontend/` — failed first as RED evidence before PR2 schema implementation.
- `npm test -- transactionPlace.schema.test.ts paymentContext.runtime.test.ts paymentMethod.schema.test.ts paymentMethod.runtime.test.ts` from `frontend/` — pass, 22 tests (PR2).
- `npm run typecheck` from `frontend/` — pass (PR2).
- `npx eslint ...affected PR2 files...` from `frontend/` — pass with existing warnings in `AccountForm.tsx` during PR2.
- `npm run lint` from `frontend/` — failed/timed out on existing repo-wide lint/generated-output debt outside the PR2/PR3 affected slice; affected-file ESLint passes.
- `npm run build` from `frontend/` — pass with existing Vite dynamic-import/chunk-size warnings.
- `npm test -- src/schemas/account.schema.test.ts src/hooks/usePaymentContainers.test.ts` from `frontend/` — failed first as RED evidence for PR2 review fixes; passed after fixes.
- `npm test -- src/hooks/usePaymentContainers.test.ts src/schemas/account.schema.test.ts` from `frontend/` — pass after PR2 re-review blocker fix, 4 tests.
- `go test ./internal/handlers/imports -run 'TestCommitExcelTemplateAllowsAmbiguousPaymentContextWithoutGuessingPlace|TestCommitExcelTemplatePersistsApprovedRowsInOneTransaction' -count=1` from `backend/` — pass (PR3 importer compatibility guard).
- `go test ./internal/handlers/imports -count=1` from `backend/` — pass.
- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/accounts ./internal/handlers/imports -count=1` from `backend/` — pass.
- `npm test -- src/components/QuickAddExpenseModal.test.ts src/features/paymentMethod.runtime.test.ts src/schemas/transactionPlace.schema.test.ts src/features/paymentContext.runtime.test.ts` from `frontend/` — pass, 19 tests (PR3 quick-add/schema/runtime guard).
- `npm run typecheck` from `frontend/` — pass.
- `npx eslint src/components/QuickAddExpenseModal.tsx src/components/quickAddExpense.ts src/components/QuickAddExpenseModal.test.ts src/features/paymentMethod.runtime.test.ts` from `frontend/` — pass with no warnings/errors.
- `npm run build` from `frontend/` — pass; existing Vite warnings remain for dynamic import of `i18next` and large chunks.
- `npm run lint` from `frontend/` — timed out after 120s after the production build generated output; repo-wide lint remains unsuitable as a final gate until existing/generated lint debt is excluded or fixed.
- `npm test -- src/components/QuickAddExpenseModal.test.ts` from `frontend/` — pass, 3 tests before review-fix changes (safety net).
- `npm test -- src/components/QuickAddExpenseModal.test.ts` from `frontend/` — failed after adding review-fix tests because `resolveQuickAddSourceContainerSelection` was not implemented yet (RED evidence), then passed with 5 tests after implementation.
- `npm test -- src/components/QuickAddExpenseModal.test.ts src/features/paymentMethod.runtime.test.ts src/schemas/transactionPlace.schema.test.ts src/features/paymentContext.runtime.test.ts` from `frontend/` — pass, 21 tests after PR3 review fixes.
- `npm run typecheck` from `frontend/` — failed first on `getValues('source_container_id')` returning `unknown`; passed after narrowing the value to `string | null | undefined` before helper resolution.
- `npx eslint src/components/QuickAddExpenseModal.tsx src/components/quickAddExpense.ts src/components/QuickAddExpenseModal.test.ts src/features/paymentMethod.runtime.test.ts` from `frontend/` — pass with no warnings/errors after PR3 review fixes.

## TDD Cycle Evidence (PR3 Review-Fix Pass)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| PR3 warning fixes: stale quick-add source-place selection and loading-aware no-active-place warning | `frontend/src/components/QuickAddExpenseModal.test.ts` | Unit / pure helper | ✅ 3/3 existing quick-add tests passed before changes | ✅ Added helper tests before implementation; failed because `resolveQuickAddSourceContainerSelection` was missing | ✅ 5/5 quick-add tests passed after implementing helper logic and wiring component effect | ✅ Covered preserving valid selection, clearing stale selection, filling empty active default, preserving while loading, and warning hidden/shown based on loading/options | ✅ Extracted logic into pure helpers in `quickAddExpense.ts`; affected tests, typecheck, and ESLint pass |

### Test Summary (PR3 Review-Fix Pass)

- **Total tests written**: 2 focused helper tests covering 6 behavior assertions.
- **Total tests passing**: 21 in the final narrow quick-add/schema/runtime command.
- **Layers used**: Unit / pure helper tests.
- **Approval tests**: 3 existing quick-add tests used as safety net.
- **Pure functions created**: 2 (`resolveQuickAddSourceContainerSelection`, `shouldShowQuickAddNoActivePlacesWarning`).

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/migrations/025_add_account_default_places.up.sql` | Created | Adds nullable account default expense/income container FKs and indexes. |
| `backend/migrations/025_add_account_default_places.down.sql` | Created | Drops indexes and nullable default columns. |
| `backend/internal/handlers/accounts/*` | Modified | Includes nullable account default fields and validates active same-account defaults. |
| `backend/internal/handlers/expenses/*` | Modified | Requires active source container for manual one-time create/update final state. |
| `backend/internal/handlers/incomes/*` | Modified | Requires active destination container for manual one-time create/update final state. |
| `backend/internal/handlers/imports/commit_test.go` | Modified | Adds ambiguous payment-context commit regression proving importer persists approved rows with null place instead of guessing. |
| `frontend/src/types/account.ts` | Modified | Adds nullable default expense/income place fields to account read/update types. |
| `frontend/src/features/accounts/*` | Modified/Created | Adds account default-place edit controls and mapping tests/helpers from PR2. |
| `frontend/src/features/expenses/*` | Modified | Manual expense form requires active source place with active default prefill, inactive warning, and no-place CTA. |
| `frontend/src/features/incomes/*` | Modified | Manual income form requires active destination place with active default prefill, inactive warning, and no-place CTA. |
| `frontend/src/hooks/usePaymentContainers.ts` | Modified | Adds account-aware query key and explicit account header scoping from PR2 review fixes. |
| `frontend/src/components/QuickAddExpenseModal.tsx` | Modified | Adds required active source-place selector, active default expense prefill, inactive-default/no-active-place warnings, blocks submit without active place, clears stale source-place selections after options load, preserves valid user choices, and suppresses the no-active-place warning while containers are loading. |
| `frontend/src/components/quickAddExpense.ts` | Created | Extracts quick-add schema, payload mapping, default-place resolution, stale-selection resolution, and loading-aware warning helpers for testability without Fast Refresh lint violations. |
| `frontend/src/components/QuickAddExpenseModal.test.ts` | Created | Covers quick-add required place validation, payload inclusion, active-only default preselection, stale-selection clearing/preservation, and loading-aware no-active-place warning behavior. |
| `frontend/src/features/paymentMethod.runtime.test.ts` | Modified | Updates quick-add payload fixtures to include required source place. |
| `frontend/src/schemas/*`, `frontend/src/features/payment*.test.ts`, `frontend/src/i18n/locales/{en,es}/*` | Modified/Created | PR2 required-place/account-default schema/runtime/copy support. |
| `openspec/changes/required-default-places/tasks.md` | Modified | Marks final PR3 tasks complete and records resolved force-chained/stacked-to-main strategy. |
| `openspec/changes/required-default-places/apply-progress.md` | Modified | Merges prior PR1/PR2 progress with final PR3 completion evidence. |

## Deviations

- None from the PR3 design boundary. Importer code remained unchanged by design; only regression coverage was added.
- Browser-driven manual smoke was approximated with focused unit/runtime tests, affected-file lint, typecheck, and production build in this apply environment; no broad UI redesign was attempted.

## Discoveries / Notes

- Quick-add previously built payloads without `source_container_id`, so it could bypass the manual required-place intent even after backend/frontend form enforcement.
- Exporting test helpers from a React component triggered `react-refresh/only-export-components`; helpers were moved to `frontend/src/components/quickAddExpense.ts` so affected-file ESLint passes cleanly.
- Import commit already allowed ambiguous payment-context mappings to resolve to null; PR3 added regression coverage to lock that compatibility behavior.
- Review found quick-add could keep a selected source place that no longer existed in the active options after container data changed; the selector now resolves against active options after loading, preserving valid user choices and clearing stale IDs.
- Review found the no-active-place warning could flash while payment containers were still loading; warning display now waits for loading to settle.
- Repo-wide frontend lint remains blocked by existing/generated debt; affected PR3 files lint cleanly.

## Remaining Work Units

- None. Work Units / PR 1, PR 2, and PR 3 are complete.

## Scope Guardrail Result

- Confirmed in scope: quick-add required-place alignment, importer null-place compatibility regression guard, final verification, SDD progress/tasks updates.
- Confirmed out of scope and untouched: recurring templates, savings-goal places, transfers, credit/debt, physical instrument removal, broad payment-container/importer redesign, and new backend default-place APIs beyond PR1.

## PR Boundary

- Delivery strategy: force-chained / stacked-to-main.
- Current slice: PR 3 final slice, on top of merged PR1 and PR2.
- Boundary: quick-add required active source place + active default prefill/warnings, stale-selection revalidation/clearing, loading-aware no-active-place warning, importer ambiguous null-place compatibility regression, final smoke/verification artifacts. No backend API expansion or out-of-scope domain work.
- Review note: PR3 review-fix warnings are addressed; PR3 is ready for packaging after checking the diff excludes untracked `branding/` and `Planilla de gastos diarios - En blanco 2026.xlsx`.
