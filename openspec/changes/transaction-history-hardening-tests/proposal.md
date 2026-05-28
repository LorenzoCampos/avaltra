# Proposal: Transaction History Hardening Tests

## Intent

Close the remaining `transaction-history-recurring-activity` verification warnings with a small tests-first hardening slice. Validate mounted user interactions for activity navigation and expense/income pagination without changing product behavior.

## Scope

### In Scope
- Add mounted frontend tests for Activity item click and keyboard navigation.
- Add mounted tests for expense/income pagination controls, including disabled boundaries and callbacks.
- Add minimal test runner support for `*.test.tsx` only if required.
- Document current page-local filter behavior in tests; keep it unchanged.

### Out of Scope
- Server-side full-history filter redesign.
- App code changes beyond test-only configuration if required.
- Broad test framework migration or unrelated coverage expansion.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — this hardening change tests existing `transaction-history` behavior without changing requirements.

## Approach

Use the recommended minimal mounted hardening slice: add targeted DOM-level tests for user-observable behavior, keep assertions behavior-focused, and only update `frontend/vite.config.ts` if `*.test.tsx` discovery is needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/activity/components/ActivityFeed.test.ts[x]` | Modified | Add mounted click/Enter/Space navigation and non-navigation cases. |
| `frontend/src/features/expenses/ExpenseList.pagination.test.tsx` | New | Verify pagination buttons, disabled boundaries, callbacks, and local-filter notice. |
| `frontend/src/features/incomes/IncomeList.pagination.test.tsx` | New | Mirror expense pagination behavior coverage. |
| `frontend/vite.config.ts` | Modified | Include `*.test.tsx` only if current config excludes new tests. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DOM tooling adds setup churn | Med | Keep config/test utilities minimal and local. |
| Tests become implementation-coupled | Med | Assert visible behavior and callbacks, not internals. |
| Scope exceeds 400 changed lines | Low | Limit to three focused test files plus minimal config. |

## Rollback Plan

Remove the new/updated test files and revert any `frontend/vite.config.ts` test include change. No runtime code or data migration is expected.

## Dependencies

- Completed `transaction-history-recurring-activity` change.
- Existing frontend test stack; add no new dependency unless mounted TSX tests cannot run without it.

## Success Criteria

- [ ] Activity click, Enter, and Space navigation are covered by mounted tests.
- [ ] Expense and income pagination controls are covered symmetrically.
- [ ] Page-local filter behavior remains unchanged and documented by tests.
- [ ] Forecast remains under the 400 changed-line review budget.
