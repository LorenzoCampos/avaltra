# Tasks: Place Transfer Management Polish

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–620 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend cancel/reporting) → PR 2 (frontend UX/i18n) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Ship scoped/idempotent cancel semantics and reporting exclusions | PR 1 | Base: main/feature branch; include Go handler+dashboard tests. |
| 2 | Ship transfer-management UI polish, cancel action wiring, and i18n copy | PR 2 | Depends on PR 1 API; include Vitest/component tests. |

## Phase 1: Foundation / API Contract

- [x] 1.1 Update `backend/internal/server/server.go` to register `PATCH /api/place-transfers/:id/cancel` on place transfer routes.
- [x] 1.2 Implement `CancelPlaceTransfer` in `backend/internal/handlers/place_transfers/handlers.go` with active-account scoping and `deleted_at = COALESCE(deleted_at, NOW())` soft-cancel.
- [x] 1.3 Ensure `GET /api/place-transfers` default behavior in `backend/internal/handlers/place_transfers/handlers.go` returns active transfers only (`deleted_at IS NULL`) and keeps canceled rows out of default history.

## Phase 2: Core Backend Behavior

- [x] 2.1 Return idempotent `200` canceled outcome for repeated cancel calls and `404` for missing/cross-account IDs in `backend/internal/handlers/place_transfers/handlers.go`.
- [x] 2.2 Validate money-by-container logic excludes canceled transfers in dashboard query path covered by `backend/internal/handlers/dashboard/summary_test.go` assertions.
- [x] 2.3 Confirm transfer operations remain P&L-neutral (no income/expense mutation) in backend summary/aggregation path touched by place transfers.

## Phase 3: Frontend Integration / UX

- [ ] 3.1 Add `cancelPlaceTransfer` + `useCancelPlaceTransfer` in `frontend/src/hooks/usePlaceTransfers.ts` and invalidate transfer/container/dashboard query keys.
- [ ] 3.2 Update `frontend/src/features/payment-containers/PaymentContainersPage.tsx` to wire `onCancelTransfer` into transfer history flow.
- [ ] 3.3 Update `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` to add cancel action (pending/disabled states), hide canceled rows by default, and show correction guidance: cancel + recreate.
- [ ] 3.4 Update `frontend/src/features/payment-containers/PlaceTransferForm.tsx` and `frontend/src/i18n/locales/en/navigation.json`, `frontend/src/i18n/locales/es/navigation.json` to use localized transfer copy and avoid delete/eliminar/borrar semantics.
- [ ] 3.5 Adjust `frontend/src/types/placeTransfer.ts` only as needed for cancel response typing while preserving active-only list contract.

## Phase 4: Testing / Verification

- [x] 4.1 Add table-driven Go tests in `backend/internal/handlers/place_transfers/handlers_test.go` for cancel success, idempotent recancel, and cross-account `404`.
- [x] 4.2 Extend `backend/internal/handlers/dashboard/summary_test.go` to verify canceled transfers are excluded from money-by-container and transfer activity keeps income/expense/P&L unchanged.
- [ ] 4.3 Add/extend frontend tests under `frontend/src/hooks` and `frontend/src/features/payment-containers` for cancel mutation invalidation, active-only history rendering, and correction-copy visibility.
- [ ] 4.4 Add UI copy assertions ensuring cancel wording is used (no delete/eliminar/borrar text) in transfer management components.

## Phase 5: Cleanup / Documentation

- [ ] 5.1 Update inline comments/docs near transfer management components and handlers to codify correction policy: cancel then recreate (no edit-in-place).
- [ ] 5.2 Run targeted backend/frontend test suites for touched files and record pass/fail output in phase handoff notes.
