# Apply Progress: Required Default Places

## Status

Work Unit / PR 1 complete: backend account default persistence/API contract plus manual one-time expense/income required-place enforcement.

Work Unit / PR 2 complete: frontend account default management plus manual expense/income required active place selection, active default prefill, inactive default warnings, and no-active-place CTA.

PR2 review-fix pass complete: account default fields now survive `zodResolver(accountSchema)` submit validation/mapping, and account edit payment-container loading is deterministically scoped to the edited account instead of transiently reusing the previously active account's cached containers.

PR2 re-review blocker fixed: account edit no longer mutates the global active account or invalidates broad `payment-containers` queries while merely loading the edit form; default-place loading remains scoped by explicit `accountId`/`X-Account-ID` and query key.

## Mode

Standard mode. The current orchestrator instructions resolved no explicit `strict_tdd: true` for this apply batch; tests-first guidance was used where practical. PR2 added failing schema tests first, then implemented required manual place validation and frontend form behavior.

## Completed Tasks

- [x] 1.1 Added nullable account default place migration (`025_add_account_default_places`).
- [x] 1.2 Extended account create/get/list/update DTOs and SQL mapping with `default_expense_container_id` and `default_income_container_id`.
- [x] 1.3 Added account update validation for non-null defaults against active containers in the same account.
- [x] 2.1 Added/updated backend handler tests for manual one-time expense/income required-place behavior.
- [x] 2.2 Implemented required active `source_container_id` validation for manual one-time expenses on create/update.
- [x] 2.3 Implemented required active `destination_container_id` validation for manual one-time incomes on create/update.
- [x] 3.1 Added frontend account types/update payload support for nullable default expense/income place fields.
- [x] 3.2 Added account edit UI to manage default expense/income places with active-place options and inactive/missing default warnings.
- [x] 3.3 Added frontend schema tests proving manual expense/income place fields reject blank or missing values.
- [x] 3.4 Updated manual expense/income forms and submit mapping to prefill active account defaults, require active place selection, warn on inactive defaults, and show a manage-places CTA when no active place exists.

## Tests Run

- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/accounts` — pass (PR1).
- `go test ./...` from `backend/` — pass (PR1).
- `go test ./internal/handlers/accounts -count=1` from `backend/` — pass (PR1 review-fix baseline and affected package run).
- `go test ./internal/handlers/accounts -run 'TestUpdateAccount' -count=1` from `backend/` — pass (PR1 narrow account update handler review-fix coverage).
- `npm test -- transactionPlace.schema.test.ts` from `frontend/` — failed first as RED evidence before schema implementation.
- `npm test -- transactionPlace.schema.test.ts paymentContext.runtime.test.ts paymentMethod.schema.test.ts paymentMethod.runtime.test.ts` from `frontend/` — pass, 22 tests.
- `npm run typecheck` from `frontend/` — pass.
- `npx eslint src/types/account.ts src/schemas/expense.schema.ts src/schemas/income.schema.ts src/schemas/transactionPlace.schema.test.ts src/schemas/paymentMethod.schema.test.ts src/features/accounts/AccountForm.tsx src/features/expenses/ExpenseForm.tsx src/features/expenses/formSubmissions.ts src/features/incomes/IncomeForm.tsx src/features/incomes/formSubmissions.ts src/features/paymentContext.runtime.test.ts src/features/paymentMethod.runtime.test.ts` from `frontend/` — pass with 2 existing-style warnings in `AccountForm.tsx` for React Hook Form `watch`/existing missing `t` dependency.
- `npm run lint` from `frontend/` — fails on existing repo-wide lint debt including generated `dev-dist/workbox-*.js`, pre-existing `any` usage, React compiler rules, and other files outside this PR2 slice. No new errors appeared in the affected-file ESLint run.
- `npm run build` from `frontend/` — first run timed out after 120s while transforming; retry with 300s passed with existing Vite chunk-size/dynamic-import warnings.
- `npm test -- src/schemas/account.schema.test.ts src/hooks/usePaymentContainers.test.ts` from `frontend/` — failed first as RED evidence for missing account default schema fields/mapping helper and missing scoped payment-container query contract; passed after review fixes, 4 tests.
- `npm test -- src/schemas/account.schema.test.ts src/hooks/usePaymentContainers.test.ts src/schemas/transactionPlace.schema.test.ts src/features/paymentContext.runtime.test.ts src/schemas/paymentMethod.schema.test.ts src/features/paymentMethod.runtime.test.ts` from `frontend/` — pass, 26 tests.
- `npm run typecheck` from `frontend/` — pass after PR2 review fixes.
- `npx eslint src/api/axios.ts src/schemas/account.schema.ts src/schemas/account.schema.test.ts src/hooks/usePaymentContainers.ts src/hooks/usePaymentContainers.test.ts src/features/accounts/AccountForm.tsx src/features/accounts/accountFormMapping.ts` from `frontend/` — pass with 2 existing warnings in `AccountForm.tsx` for React Hook Form `watch` and existing missing `t` dependency.
- `npm test -- src/hooks/usePaymentContainers.test.ts src/schemas/account.schema.test.ts` from `frontend/` — pass after PR2 re-review blocker fix, 4 tests.
- `npm run typecheck` from `frontend/` — pass after PR2 re-review blocker fix.
- `npx eslint src/features/accounts/AccountForm.tsx src/hooks/usePaymentContainers.ts src/hooks/usePaymentContainers.test.ts src/schemas/account.schema.ts src/schemas/account.schema.test.ts src/features/accounts/accountFormMapping.ts` from `frontend/` — pass after PR2 re-review blocker fix with 2 existing warnings in `AccountForm.tsx` for React Hook Form `watch` and existing missing `t` dependency.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/migrations/025_add_account_default_places.up.sql` | Created | Adds nullable account default expense/income container FKs and indexes. |
| `backend/migrations/025_add_account_default_places.down.sql` | Created | Drops indexes and nullable default columns. |
| `backend/internal/handlers/accounts/create.go` | Modified | Includes nullable default fields in account response DTO. |
| `backend/internal/handlers/accounts/get.go` | Modified | Reads nullable account default fields. |
| `backend/internal/handlers/accounts/list.go` | Modified | Lists nullable account default fields. |
| `backend/internal/handlers/accounts/update.go` | Modified | Accepts nullable default fields, validates active same-account containers, and safely formats dynamic placeholders. |
| `backend/internal/handlers/accounts/{create,get,list,delete,add_member,update_member,toggle_member}.go` | Modified | Uses an internal account store interface so account handlers can be exercised with `pgxmock` while preserving `NewHandler(*database.DB)`. |
| `backend/internal/handlers/accounts/update_test.go` | Created/modified | Covers nullable account default update field resolution plus handler-level persistence, explicit-null clearing, and inactive/cross-account rejection. |
| `backend/internal/handlers/expenses/{create,update,payment_context.go}` | Modified | Requires active source container for manual one-time create/update final state. |
| `backend/internal/handlers/expenses/*_test.go` | Modified | Updates existing expectations and adds required-place rejection coverage. |
| `backend/internal/handlers/incomes/{create,update,payment_context.go}` | Modified | Requires active destination container for manual one-time create/update final state. |
| `backend/internal/handlers/incomes/*_test.go` | Modified | Updates existing expectations and adds required-place rejection coverage. |
| `frontend/src/types/account.ts` | Modified | Adds nullable default expense/income place fields to account read/update types. |
| `frontend/src/features/accounts/AccountForm.tsx` | Modified | Adds default place controls on account edit, uses validated submit mapping for nullable defaults, fetches default-place options scoped to the edited account without mutating global active account state, filters selectable defaults to active places, and warns on inactive/missing saved defaults. |
| `frontend/src/features/accounts/accountFormMapping.ts` | Created | Extracts account update payload mapping so selected default UUIDs persist and empty/null selections clear saved defaults. |
| `frontend/src/features/expenses/ExpenseForm.tsx` | Modified | Fetches active+inactive places, preselects an active default expense place, requires active source place selection, warns on inactive default, and shows manage-places CTA when none exist. |
| `frontend/src/features/incomes/IncomeForm.tsx` | Modified | Fetches active+inactive places, preselects an active default income place, requires active destination place selection, warns on inactive default, and shows manage-places CTA when none exist. |
| `frontend/src/features/expenses/formSubmissions.ts` | Modified | Keeps manual submit mapping place-only without converting missing edit context to explicit null. |
| `frontend/src/features/incomes/formSubmissions.ts` | Modified | Keeps manual submit mapping place-only without converting missing edit context to explicit null. |
| `frontend/src/hooks/usePaymentContainers.ts` | Modified | Adds effective account ID to query key and supports explicit account header scoping for deterministic account-edit container loading. |
| `frontend/src/hooks/usePaymentContainers.test.ts` | Created | Verifies query keys include the effective account ID and explicit account scope sends an `X-Account-ID` header. |
| `frontend/src/api/axios.ts` | Modified | Preserves an explicitly provided `X-Account-ID` header instead of overwriting it from `localStorage`; also removes a pre-existing unused catch binding encountered by affected-file lint. |
| `frontend/src/schemas/account.schema.ts` | Modified | Includes nullable/empty account default place fields so Zod validation does not strip selected defaults before submit mapping. |
| `frontend/src/schemas/account.schema.test.ts` | Created | Verifies selected default UUIDs survive validation/update mapping and explicit empty/null selections map to null clearing payloads. |
| `frontend/src/schemas/expense.schema.ts` | Modified | Requires `source_container_id` for manual expense form validation. |
| `frontend/src/schemas/income.schema.ts` | Modified | Requires `destination_container_id` for manual income form validation. |
| `frontend/src/schemas/transactionPlace.schema.test.ts` | Created | Tests that manual expense/income schemas reject missing/blank place and accept valid IDs. |
| `frontend/src/features/paymentContext.runtime.test.ts` | Modified | Updates payment context tests for required manual place behavior and non-clearing manual submit mapping. |
| `frontend/src/features/paymentMethod.runtime.test.ts` | Modified | Adds required place IDs to existing payment-method payload fixtures. |
| `frontend/src/schemas/paymentMethod.schema.test.ts` | Modified | Adds required place IDs to existing payment-method schema fixtures. |
| `frontend/src/i18n/locales/{en,es}/{accounts,expenses,incomes}.json` | Modified | Adds account default-place, required-place, inactive-default warning, and manage-places CTA copy. |
| `openspec/changes/required-default-places/tasks.md` | Modified | Marks Work Unit / PR 2 frontend tasks complete. |

## Deviations

- Quick-add remains out of PR2 per orchestrator instructions and task slicing, even though the higher-level spec includes quick-add in the full change.
- `frontend/src/hooks/useAccounts.ts` did not require code changes because `UpdateAccountRequest` comes from `types/account.ts`; the existing optimistic update and API payload flow already carries the new nullable fields.

## Discoveries / Notes

- Account edit default-place loading now relies on `usePaymentContainers({ accountId })`, which scopes the request by explicit `X-Account-ID` and account-aware query key, instead of activating the edited account globally or broad-invalidating `payment-containers` during form load.
- Review found the prior account schema omitted `default_expense_container_id`/`default_income_container_id`; Zod stripped them, causing selected defaults to submit as `null`.
- Review also found account-edit default-place loading could reuse `payment-containers` cache from the previously active account because the query key did not include account ID and the API scope came from `localStorage`.
- `usePaymentContainers` now keys by effective account ID and can send an explicit account header; the axios interceptor preserves that explicit header instead of overwriting it from `localStorage`.
- The old Engram testing-capabilities cache is stale for frontend test runner detection; `frontend/package.json` has Vitest and the affected schema/runtime tests run successfully.
- Repo-wide frontend lint remains blocked by pre-existing unrelated debt; affected-file ESLint has no errors.

## Remaining Work Units

- Work Unit / PR 3: quick-add required-place alignment, importer compatibility guard/regression, final integration/smoke verification, and scope guardrail confirmation.
- Remaining explicit tasks: 2.4, 4.1, 4.2, 4.3, and 5.1.

## PR Boundary

- Delivery strategy: force-chained / stacked-to-main.
- Current slice: PR 2 only, on top of merged PR1 (`4abb26c`).
- Boundary: frontend account default place management plus manual expense/income form required selector, active default prefill, inactive-default warnings, and relevant schema/runtime tests. No quick-add, importer, recurring templates, savings-goal places, transfers, credit/debt, or physical-instrument-removal work included.
- Review note: current PR2 diff is focused on frontend forms/account defaults and remains the intended second chained slice; ready for a fresh PR2 review after reviewer opens the diff against main/PR1 baseline.
