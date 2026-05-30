# Proposal: Place to Place Transfers

## Intent

Allow users to move money between active places without creating fake income/expense rows, preserving correct balances, reporting, and auditability.

## Scope

### In Scope
- Add dedicated `place_transfers` domain records/API for active-account scoped transfers.
- Enforce v1 same-currency transfers only; no conversion.
- Update `money_by_container` so source decreases and destination increases.
- Add reviewable transfer UI/history flow, sliced for chained PR delivery.

### Out of Scope
- Currency conversion, cross-account transfers, fees, scheduled transfers.
- Fake income+expense transfer representation.
- Activity timeline integration for v1; defer to avoid union/reporting scope risk.
- Places UI redesign and legacy media removal.

## Capabilities

### New Capabilities
- `place-transfers`: Dedicated transfer records, validation, history, and UI for moving money between places.

### Modified Capabilities
- `payment-containers`: Money-by-container balances must include transfer inflows/outflows while income/expense totals remain unchanged.

## Approach

Create a dedicated transfer table with `account_id`, `source_container_id`, `destination_container_id`, `amount`, `date`, and optional note. Validate same active account, active distinct places, positive amount, and same-currency policy. Expose CRUD/list endpoints and frontend form/history. Adjust dashboard aggregation to add transfer deltas only to container balances, not P&L totals.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/` | New | Add transfer schema/indexes. |
| `backend/internal/handlers/place_transfers/` | New | Transfer API and validation. |
| `backend/internal/handlers/dashboard/summary.go` | Modified | Include transfer deltas in `money_by_container`. |
| `backend/internal/server/server.go` | Modified | Register transfer routes. |
| `frontend/src/features/payment-containers/` | Modified | Entry point plus transfer form/history. |
| `frontend/src/types/dashboard.ts` | Modified | Preserve dashboard contract with transfer-adjusted balances. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dashboard balance regressions | Med | Backend tests for source/destination deltas and unchanged totals. |
| Review budget >400 lines | High | Use chained PRs: backend domain/API, dashboard math, UI. |
| Currency ambiguity | Med | Enforce same-currency only; conversion rejected/deferred. |

## Rollback Plan

Disable/remove transfer routes and UI entry points, revert dashboard query changes, and roll back the transfer migration before user-created transfer data is depended on.

## Dependencies

- Existing active account and `payment_containers` model.

## Success Criteria

- [ ] A same-currency active-account transfer persists as a transfer record.
- [ ] Source/destination balances update correctly in dashboard money-by-container.
- [ ] Income/expense totals and P&L remain unchanged by transfers.
