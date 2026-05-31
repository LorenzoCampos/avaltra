# Proposal: Place Transfer Management Polish

## Intent

Make the just-shipped place transfer feature safe to manage and consistent with the rest of the payment container experience, without introducing risky edit-in-place accounting semantics.

## Scope

### In Scope
- Soft-cancel existing transfers with active-account ownership validation and audit-friendly semantics.
- Add transfer history cancel UX plus clear correction copy: cancel the wrong transfer, then recreate it.
- Polish transfer section styling, metadata, and i18n/copy to match nearby container management sections.
- Ensure active transfers affect money-by-container, while canceled transfers do not affect balances, income, expense, or P&L.

### Out of Scope
- Full edit-in-place for transfer amount/source/destination/date.
- Hard deletion or physical removal of transfer records.
- Currency conversion, split transfers, or broader reconciliation/activity redesign.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `place-transfers`: add soft-cancel management behavior, canceled-state semantics, and correction policy.
- `payment-containers`: clarify money-by-container treatment for canceled transfers and transfer-section UX consistency.

## Approach

Add a scoped cancel endpoint, likely `PATCH /api/place-transfers/:id/cancel`, that sets `deleted_at`, verifies active-account ownership, and behaves idempotently. Update list/balance behavior so canceled transfers remain auditable where needed but are excluded from money movement calculations. On the frontend, extend `usePlaceTransfers` with cancel mutation/invalidation and update `PlaceTransferHistory`/`PaymentContainersPage` to reuse established management-list patterns and translation keys.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/server/server.go` | Modified | Register transfer cancel route. |
| `backend/internal/handlers/place_transfers/handlers.go` | Modified | Implement scoped soft-cancel and filtering semantics. |
| `backend/internal/handlers/place_transfers/handlers_test.go` | Modified | Cover cancel, idempotency, ownership, and reporting behavior. |
| `frontend/src/hooks/usePlaceTransfers.ts` | Modified | Add cancel mutation and cache invalidation. |
| `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` | Modified | Add cancel controls, status/copy, and visual polish. |
| `frontend/src/features/payment-containers/PaymentContainersPage.tsx` | Modified | Align transfer section composition and i18n. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users expect edit/delete, not cancel | Med | Use explicit labels and correction guidance. |
| Canceled transfers regress balances | Med | Add backend tests for money-by-container and P&L exclusion. |
| Review exceeds 400 lines | High | Recommend chained PRs: backend semantics first, frontend polish second. |

## Rollback Plan

Revert cancel route/handler/hook/UI changes and any spec deltas. Existing transfer records remain valid because the change uses the existing `deleted_at` column and adds no required schema migration.

## Dependencies

- Existing `place_transfers.deleted_at` column from migration `026_create_place_transfers.up.sql`.
- Existing place transfer create/list behavior and payment container money-by-container calculations.

## Success Criteria

- [ ] Users can cancel a transfer without hard-deleting its audit record.
- [ ] Canceled transfers do not affect money-by-container, income, expense, or P&L.
- [ ] Transfer management UI uses consistent styling and translated copy.
- [ ] Edit-in-place remains explicitly deferred.
