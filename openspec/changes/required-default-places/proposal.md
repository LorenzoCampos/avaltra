# Proposal: Required Default Places

## Intent

Make money location explicit for manual one-time expenses/incomes while reducing form friction through account-level default places.

## Scope

### In Scope
- Require active place/container on primary manual expense/income create and update paths, including quick-add expense.
- Add account-level default expense and income places; preselect active defaults in manual forms.
- Preserve importer compatibility for unresolved/ambiguous rows without forcing guessed places.
- Ignore inactive/archived defaults at runtime and show clear settings/form warning.

### Out of Scope
- Recurring template required-place rules, savings-goal places, transfers, credit/debt/card modeling, physical instrument removal.
- Historical backfill of transactions without place.

## Capabilities

### New Capabilities
- `account-default-places`: account-scoped default expense/income place preferences, validation, inactive/default warning behavior.

### Modified Capabilities
- `payment-containers`: manual one-time transaction flows require place, while importer and legacy display compatibility remain tolerant of unassigned rows.

## Approach

Store `default_expense_container_id` and `default_income_container_id` on accounts because places are account-scoped. Backend account APIs validate defaults belong to the account and are active when set. Manual expense/income create/update handlers enforce required active container. Frontend schemas/forms preselect active defaults, block submission without place, and guide users to create a place when none exist. Quick-add is in scope to avoid bypassing required-place intent.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/*` | New | Add nullable account default place columns. |
| `backend/internal/handlers/accounts/*` | Modified | Read/update defaults with account-scoped validation. |
| `backend/internal/handlers/{expenses,incomes}/*` | Modified | Enforce required active container on manual create/update. |
| `backend/internal/handlers/imports/commit.go` | Modified | Preserve non-blocking unresolved/ambiguous import behavior. |
| `frontend/src/features/{expenses,incomes}/*Form.tsx` | Modified | Required selector, active default prefill, no-place CTA/warning. |
| `frontend/src/components/QuickAddExpenseModal.tsx` | Modified | Align quick-add with required expense place. |
| `frontend/src/schemas/{expense,income}.schema.ts` | Modified | Require container fields for manual forms. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing legacy rows/imports conflict with required place | Med | Scope enforcement only to primary manual create/update; keep display/import tolerance. |
| Stale defaults after archive/deactivation | Med | Ignore inactive defaults, warn, and require replacement before auto-selecting. |
| Quick-add scope growth | Med | Limit to required place + default prefill, no redesign. |

## Rollback Plan

Revert form/API validation and quick-add changes, stop using account default columns, and leave nullable columns harmless until a later cleanup migration.

## Dependencies

- Existing active payment containers for useful defaults.

## Success Criteria

- [ ] Manual expense/income create/update cannot save without an active account place.
- [ ] Active account defaults preselect expense/income places; inactive defaults are ignored with warning.
- [ ] Importer can still commit unresolved/ambiguous rows without guessed places.
- [ ] Quick-add expense cannot bypass required-place behavior.
