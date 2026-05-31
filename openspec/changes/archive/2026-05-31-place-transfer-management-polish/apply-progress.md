# Apply Progress: place-transfer-management-polish

## Mode
Standard workflow (no explicit strict_tdd config found for this change; frontend Vitest/typecheck/ESLint available and run for PR 2).

## Delivery / PR Boundary
- Strategy: chained PRs, stacked-to-main.
- Current work unit: PR 2 / Work Unit 2 — frontend UX/i18n polish + tests only.
- Boundary: starts after merged PR #69 backend cancel/reporting; ends with frontend cancel helper/hook, transfer-history cancel UX, active-only history guard, localized transfer copy, correction guidance, and focused frontend verification.
- Out of scope for this batch: backend changes, edit-in-place, hard delete, showing canceled transfers by default, canceled/audit filters.

## Completed Tasks
- [x] 1.1 Registered `PATCH /api/place-transfers/:id/cancel` on place transfer routes.
- [x] 1.2 Implemented `CancelPlaceTransfer` with active-account scoping and `deleted_at = COALESCE(deleted_at, NOW())` soft-cancel.
- [x] 1.3 Confirmed/default-tested `GET /api/place-transfers` remains active-only with `pt.deleted_at IS NULL`.
- [x] 2.1 Implemented idempotent `200` canceled outcome and `404` for missing/cross-account transfers.
- [x] 2.2 Added dashboard query assertions that canceled transfers are excluded from money-by-container transfer legs.
- [x] 2.3 Confirmed transfer operations remain P&L-neutral through summary aggregation tests.
- [x] 3.1 Added `cancelPlaceTransfer` + `useCancelPlaceTransfer` in `frontend/src/hooks/usePlaceTransfers.ts`; invalidates `place-transfers`, `payment-containers`, and `dashboard` keys.
- [x] 3.2 Wired `onCancelTransfer` from `PaymentContainersPage` into `PlaceTransferHistory`.
- [x] 3.3 Added transfer-history cancel action, pending state, active-only filtering guard, active status chip, and correction guidance: cancel + recreate.
- [x] 3.4 Localized transfer form/history/action/status/toast/validation copy in English and Spanish, using cancel/anular semantics and avoiding delete/eliminar/borrar UI wording.
- [x] 3.5 Added minimal cancel response typing and optional canceled/deleted timestamps while preserving active-only list contract.
- [x] 4.1 Added table-driven Go cancel tests for success, recancel, and missing/cross-account `404`.
- [x] 4.2 Extended dashboard tests for canceled-transfer money-by-container exclusion and transfer-neutral totals.
- [x] 4.3 Added/extended frontend tests for cancel helper endpoint, active-only history rendering, correction-copy visibility, and page consistency.
- [x] 4.4 Added UI copy assertions ensuring cancel/anular wording is used and delete/eliminar/borrar text is absent from transfer management.
- [x] 5.1 Added inline correction-policy comment near transfer history guidance.
- [x] 5.2 Ran targeted frontend suites/typecheck/ESLint and recorded results.

## Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `backend/internal/handlers/place_transfers/handlers.go` | Modified in PR1 | Added `CancelPlaceTransfer` handler using soft-cancel update scoped by active account. |
| `backend/internal/handlers/place_transfers/types.go` | Modified in PR1 | Added cancel response payload with `id`, `status`, and `canceled_at`. |
| `backend/internal/server/server.go` | Modified in PR1 | Registered `PATCH /api/place-transfers/:id/cancel`. |
| `backend/internal/server/server_test.go` | Modified in PR1 | Added route registration assertion. |
| `backend/internal/handlers/place_transfers/handlers_test.go` | Modified in PR1 | Added cancel behavior tests and strengthened active-only list SQL assertion. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modified in PR1 | Strengthened transfer-leg query expectations and added canceled-transfer exclusion test. |
| `frontend/src/hooks/usePlaceTransfers.ts` | Modified | Added cancel API helper/mutation and localized create/cancel toast messages. |
| `frontend/src/types/placeTransfer.ts` | Modified | Added cancel response type and optional canceled/deleted timestamp fields for defensive active-only UI filtering. |
| `frontend/src/features/payment-containers/PaymentContainersPage.tsx` | Modified | Wired cancel mutation into transfer history. |
| `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` | Modified | Added cancel action, pending state, active-only filtering, status chip, localized copy, and correction guidance. |
| `frontend/src/features/payment-containers/PlaceTransferForm.tsx` | Modified | Moved transfer form labels/help/submit text and validation messages to i18n keys. |
| `frontend/src/features/payment-containers/placeTransferFormSubmission.ts` | Modified | Added optional localized validation-message injection while preserving default pure helper behavior. |
| `frontend/src/i18n/locales/en/navigation.json` | Modified | Added transfer form/history/action/status/toast/validation keys. |
| `frontend/src/i18n/locales/es/navigation.json` | Modified | Added Spanish transfer copy using anular/cancelar semantics, avoiding eliminar/borrar. |
| `frontend/src/hooks/usePlaceTransfers.test.ts` | Modified | Covered cancel endpoint helper and kept invalidation-key assertions. |
| `frontend/src/features/payment-containers/PlaceTransferHistory.test.tsx` | Modified | Covered active-only history, correction guidance, and no hard-delete wording. |
| `frontend/src/features/payment-containers/paymentContainerManagement.test.ts` | Modified | Covered page-level transfer section consistency and cancel copy wiring. |
| `openspec/changes/place-transfer-management-polish/tasks.md` | Modified | Marked PR2 frontend tasks complete and recorded stacked-to-main chain strategy. |

## Verification
- PR1 backend: `go test ./internal/handlers/place_transfers ./internal/handlers/dashboard ./internal/server` — PASS.
- PR2 frontend focused tests: `npm test -- src/hooks/usePlaceTransfers.test.ts src/features/payment-containers/PlaceTransferHistory.test.tsx src/features/payment-containers/PlaceTransferForm.test.tsx src/features/payment-containers/paymentContainerManagement.test.ts` — PASS (4 files, 21 tests).
- PR2 frontend typecheck: `npm run typecheck` — PASS.
- PR2 changed-file lint: `npx eslint src/hooks/usePlaceTransfers.ts src/features/payment-containers/PlaceTransferHistory.tsx src/features/payment-containers/PlaceTransferForm.tsx src/features/payment-containers/PaymentContainersPage.tsx src/features/payment-containers/placeTransferFormSubmission.ts src/hooks/usePlaceTransfers.test.ts src/features/payment-containers/PlaceTransferHistory.test.tsx src/features/payment-containers/PlaceTransferForm.test.tsx src/features/payment-containers/paymentContainerManagement.test.ts` — PASS.

## Deviations from Design
None — implementation matches the frontend slice of the design. The UI defensively filters optional `canceled_at`/`deleted_at` fields, but the API default list contract remains active-only.

## Issues Found
- `openspec/config.yaml` was not present in the repository; standard workflow was used based on orchestrator strict_tdd forwarding and package-level frontend test scripts.
- Repository already had unrelated untracked files (`Planilla de gastos diarios - En blanco 2026.xlsx`, `branding/`) before handoff; they were not touched.

## Remaining Tasks
None for this SDD change. Do not archive yet until verify phase runs.

## Status
17/17 tasks complete. Ready for SDD verify phase and PR 2 review slice.
Session: sdd-apply-place-transfer-management-polish-pr1
Project: bolsillo-claro
Scope: project
Topic: sdd/place-transfer-management-polish/apply-progress
Duplicates: 1
Revisions: 2
Created: 2026-05-31 00:41:09
