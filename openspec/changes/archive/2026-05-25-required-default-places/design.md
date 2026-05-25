# Design: Required Default Places

## Technical Approach

Add nullable account defaults for expense/income places, expose them through existing account read/update contracts, and make active place selection mandatory only on manual one-time expense/income create/update entrypoints. Frontend forms and quick-add prefill active defaults, but treat inactive defaults as warnings, not hidden auto-selection. Import commit remains tolerant of unresolved places.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Default ownership | Store `default_expense_container_id` and `default_income_container_id` on `accounts`. | User-level or household-level defaults. | Payment containers are account-scoped; account defaults avoid cross-account invalid refs and fit family accounts. |
| Inactive defaults | Keep stored value, ignore for prefill when inactive, warn in account/default settings. | Auto-null on deactivate or auto-select another active place. | Avoids surprising data mutation and never chooses a money place for the user. |
| Required validation | Backend is source of truth; frontend mirrors it for UX. | Frontend-only validation. | API clients and quick-add can bypass UI schemas; handlers must reject invalid manual saves. |
| Scope boundaries | Do not require places for importer, recurring templates, transfers, savings goals, credit/debt. | Expand all transaction-like flows now. | Prevents dead ends and keeps legacy/import compatibility while leaving nullable schema extensible. |

## Data Flow

```text
Account edit ──PUT /accounts/:id──> validate active account container ──> accounts defaults
Manual form/quick-add ──load active containers + account defaults──> prefill active default
Submit ──expense/income handler──> require active container ──> insert/update transaction
Importer commit ────────────────────────────────────────────────> may insert NULL container
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/migrations/025_add_account_default_places.{up,down}.sql` | Create | Add nullable FK columns on `accounts` referencing `payment_containers(id) ON DELETE SET NULL`; add indexes. |
| `backend/internal/handlers/accounts/{create,get,list,update}.go` | Modify | Include defaults in responses; update accepts nullable default IDs and validates active containers for same account when set. Use safe placeholder formatting when extending dynamic update. |
| `backend/internal/handlers/expenses/{create,update,payment_context.go}` | Modify | Require `source_container_id` for one-time manual creates and final update state; keep active/account validation. |
| `backend/internal/handlers/incomes/{create,update,payment_context.go}` | Modify | Require `destination_container_id` for one-time manual creates and final update state; keep active/account validation. |
| `backend/internal/handlers/imports/commit.go` | Preserve | No required-place check here; add/adjust regression test only. |
| `frontend/src/types/account.ts`, `frontend/src/hooks/useAccounts.ts` | Modify | Add default place fields and nullable update payload support. |
| `frontend/src/features/accounts/AccountForm.tsx` | Modify | Manage account-level default expense/income places with inactive-default warning. |
| `frontend/src/features/{expenses,incomes}/*Form.tsx` | Modify | Required place selector, active default prefill, no active places CTA, inactive default warning. |
| `frontend/src/components/QuickAddExpenseModal.tsx` | Modify | Add required place selector and active default prefill. |
| `frontend/src/schemas/{expense,income}.schema.ts` | Modify | Require container IDs for manual forms; keep update schemas compatible with explicit null handling only where backend allows. |
| `frontend/src/features/{expenses,incomes}/formSubmissions.ts` | Modify | Stop converting empty manual place into omitted/null payload for creates. |

## Interfaces / Contracts

Accounts expose:

```ts
default_expense_container_id?: string | null;
default_income_container_id?: string | null;
```

`PUT /api/accounts/:id` accepts those fields as nullable. Non-null values MUST reference active `payment_containers` in that account. Manual one-time expense/income create MUST send `source_container_id` / `destination_container_id`; update MUST not leave the final one-time row without its required container. Import inserts MAY keep these fields null.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend handler | Account default validation; manual create/update rejects missing, inactive, wrong-account place; importer allows null. | Extend existing Go handler tests with sqlmock. |
| Frontend unit/runtime | Zod required container behavior and quick-add payload includes place. | Vitest/schema tests and component/payload tests where existing patterns exist. |
| Manual smoke | Active default prefill, inactive warning, no active places CTA. | Browser smoke after backend/frontend build. |

## Migration / Rollout

No backfill required. New columns are nullable so legacy rows and imports remain valid. Rollback: revert handler/UI validation and stop reading defaults; down migration drops indexes/columns if not yet shipped, or leave harmless nullable columns if safer.

## PR Slicing

1. Backend migration + account contract/default validation + manual required-place tests.
2. Expense/income forms + account default management UI.
3. Quick-add alignment + importer regression and final smoke.

## Open Questions

- [ ] Exact UX route/label for “Create a place” CTA should reuse the existing payment containers page naming.
