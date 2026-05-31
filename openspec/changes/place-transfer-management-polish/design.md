# Design: Place Transfer Management Polish

## Technical Approach

Implement transfer management as an audit-preserving cancel action. Backend adds `PATCH /api/place-transfers/:id/cancel`, setting the existing `place_transfers.deleted_at` timestamp after active-account ownership validation. No schema migration is required. Existing list and dashboard money-by-container queries already use `deleted_at IS NULL`, so canceled transfers remain stored but stop contributing movement. Frontend adds a cancel mutation and updates transfer form/history copy to use `navigation` i18n keys and the same rounded card/list/action layout used by payment-container management.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Soft cancel via `PATCH /:id/cancel` | Preserves audit trail; needs careful copy so users do not expect deletion | Choose this; hard delete stays out of scope. |
| Edit-in-place | More convenient, but would require reversing/reapplying old transfer legs and larger tests | Reject for this change; correction is cancel + recreate. |
| Active-only transfer history by default | Keeps the main history focused on current effective transfers; audit visibility can be added later with explicit filtering | Choose active-only default; canceled transfers MUST NOT appear in the default history view. |
| Reuse `deleted_at` as canceled state | No migration; name is technically legacy delete language | Choose it and expose UI/API copy as “canceled”, not “deleted”. |

## Data Flow

    TransferHistory cancel button
      └─ PATCH /api/place-transfers/:id/cancel
           └─ UPDATE place_transfers SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
                WHERE id = $1 AND account_id = active account
                     └─ invalidate place-transfers, payment-containers, dashboard
                          └─ money_by_container ignores deleted_at rows

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/internal/handlers/place_transfers/handlers.go` | Modify | Add `CancelPlaceTransfer`; validate account scope; return success for already-canceled rows. Optionally scan `deleted_at` for response status. |
| `backend/internal/server/server.go` | Modify | Register `placeTransfersRoutes.PATCH("/:id/cancel", ...)`. |
| `backend/internal/handlers/place_transfers/handlers_test.go` | Modify | Table-driven cancel tests: active cancel, idempotent no-op, missing/cross-account transfer. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modify | Assert `queryMoneyByContainer` transfer legs include `pt.deleted_at IS NULL`; keep P&L totals transfer-neutral. |
| `frontend/src/types/placeTransfer.ts` | Modify | Keep the default transfer list contract active-only; add cancel response typing only if the hook returns a cancel payload. |
| `frontend/src/hooks/usePlaceTransfers.ts` | Modify | Add `cancelPlaceTransfer(id)` and `useCancelPlaceTransfer` invalidating transfer/container/dashboard keys; replace hardcoded toast copy with i18n if existing hook pattern allows. |
| `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` | Modify | Add cancel action, disabled/pending state, correction guidance, and localized copy; do not render canceled rows in the default history. |
| `frontend/src/features/payment-containers/PlaceTransferForm.tsx` | Modify | Move hardcoded labels/help/errors into `navigation.paymentContainersPage.transfers.*`. |
| `frontend/src/features/payment-containers/PaymentContainersPage.tsx` | Modify | Wire cancel mutation and pass `onCancelTransfer`; keep layout consistent with active places list. |
| `frontend/src/i18n/locales/{en,es}/navigation.json` | Modify | Add transfer form/history/action/status/correction keys; use “cancel/cancelar”, not “delete/eliminar”. |
| Frontend tests under `payment-containers` and `hooks` | Modify | Cover cancel helper endpoint, invalidation keys, rendered cancel/correction copy, and no hard delete wording. |

## Interfaces / Contracts

`GET /api/place-transfers` remains active-only by default and MUST exclude rows with `deleted_at IS NOT NULL`. Canceled transfers can be exposed later through an explicit filter/audit contract, but that is out of scope for the default flow.

`PATCH /api/place-transfers/:id/cancel` returns `200 OK` with either the transfer payload plus `canceled_at`, or `{ "id": string, "status": "canceled" }`. Missing/cross-account IDs return `404` to avoid leaking ownership. Repeated cancel returns `200 OK` with the same canceled outcome.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/handler | Cancel success, idempotency, account scoping, no hard delete SQL | Go table-driven tests with `pgxmock`; direct handler requests. |
| Backend dashboard | Canceled transfers excluded from money-by-container and P&L unchanged | Focused `queryMoneyByContainer` regex/row tests plus summary response assertions. |
| Frontend unit | Hook endpoint/invalidation; history action/copy rendering; canceled rows absent by default | Vitest helper tests and static markup component tests. |
| E2E | Not planned | Existing coverage is unit/handler-focused; add only if app already has transfer E2E. |

## Migration / Rollout

No migration required; `deleted_at` already exists in migration `026_create_place_transfers.up.sql`. Roll out backend route first, then frontend action/copy.

## Open Questions

None.
