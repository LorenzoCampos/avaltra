# Apply Progress: Required Default Places

## Status

Work Unit / PR 1 complete: backend account default persistence/API contract plus manual one-time expense/income required-place enforcement.

## Mode

Standard mode. Strict TDD was not enabled in available SDD init/config context; tests-first guidance was followed for backend handler behavior where practical.

## Completed Tasks

- [x] 1.1 Added nullable account default place migration (`025_add_account_default_places`).
- [x] 1.2 Extended account create/get/list/update DTOs and SQL mapping with `default_expense_container_id` and `default_income_container_id`.
- [x] 1.3 Added account update validation for non-null defaults against active containers in the same account.
- [x] 2.1 Added/updated backend handler tests for manual one-time expense/income required-place behavior.
- [x] 2.2 Implemented required active `source_container_id` validation for manual one-time expenses on create/update.
- [x] 2.3 Implemented required active `destination_container_id` validation for manual one-time incomes on create/update.

## Tests Run

- `go test ./internal/handlers/expenses ./internal/handlers/incomes ./internal/handlers/accounts` — pass.
- `go test ./...` from `backend/` — pass.
- `go test ./internal/handlers/accounts -count=1` from `backend/` — pass (review-fix baseline and affected package run).
- `go test ./internal/handlers/accounts -run 'TestUpdateAccount' -count=1` from `backend/` — pass (narrow account update handler review-fix coverage).

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
| `openspec/changes/required-default-places/tasks.md` | Modified | Marks Work Unit / PR 1 backend tasks complete. |

## Deviations

None — implementation matches the Work Unit / PR 1 backend scope. Importer compatibility work remains in a later slice per the task plan.

## Review Fix Notes

- Added narrow handler-level tests for `PUT /accounts/:id` default place behavior after PR1 review warned that coverage only exercised `resolveAccountDefaultContainerUpdate`.
- Introduced an internal `accountStore` interface behind `Handler` to allow sqlmock-style handler tests without changing the public `NewHandler(*database.DB)` constructor.

## Remaining Work Units

- Work Unit / PR 2: frontend account defaults management plus expense/income required selector, prefill, and warnings.
- Work Unit / PR 3: quick-add required-place alignment, importer compatibility guard, final integration/smoke verification, and scope guardrail confirmation.

## PR Boundary

- Delivery strategy: force-chained / stacked-to-main.
- Current slice: PR 1 only.
- Boundary: backend persistence/API/default validation and manual expense/income API enforcement; no frontend form or quick-add work included.
- Review note: backend test updates make this slice substantial, but it stays within the planned PR 1 boundary.
