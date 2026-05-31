## Exploration: place-transfer-management-polish

### Current State
Internal place transfers are currently implemented as a dedicated domain with only **create + list** behavior end-to-end. Backend exposes `POST /api/place-transfers` and `GET /api/place-transfers`; no update/delete/cancel routes are registered in `server.go`. The transfer table already has `deleted_at`, but handlers do not provide mutation semantics beyond creation. Frontend mirrors that scope: `usePlaceTransfers` supports list/create only and `PlaceTransferHistory` is read-only (no actions).

UI-wise, transfer form/history exist inside `PaymentContainersPage`, but the section is stylistically inconsistent with surrounding management sections: transfer strings are hardcoded Spanish (not i18n), history entries are simple articles without the richer action/metadata patterns used in expense/income lists, and there are no row-level management controls.

### Affected Areas
- `backend/internal/server/server.go` — transfer route surface is currently GET/POST only; management actions would be added here.
- `backend/internal/handlers/place_transfers/handlers.go` — create/list logic exists; no update/delete/cancel handlers yet.
- `backend/internal/handlers/place_transfers/handlers_test.go` — tests cover create/list only; no management mutation tests.
- `backend/migrations/026_create_place_transfers.up.sql` — includes `deleted_at`, enabling soft-cancel semantics without schema redesign.
- `frontend/src/hooks/usePlaceTransfers.ts` — only list/create helpers + invalidation; lacks update/delete/cancel hooks.
- `frontend/src/features/payment-containers/PlaceTransferHistory.tsx` — read-only rendering, no controls, hardcoded copy.
- `frontend/src/features/payment-containers/PaymentContainersPage.tsx` — composition point where transfer management UX and consistency changes would land.
- `frontend/src/features/expenses/ExpenseList.tsx` and `frontend/src/features/incomes/IncomeList.tsx` — established edit/delete interaction and visual patterns to reuse.

### Approaches
1. **Hard delete + optional edit** — add `DELETE /place-transfers/:id` (physical delete) and maybe `PUT` for corrections.
   - Pros: Simple mental model for users; small UI copy change.
   - Cons: Weak auditability; riskier financial history integrity; inconsistent with existing soft-delete patterns in expenses/incomes.
   - Effort: Medium

2. **Soft cancel (recommended) + optional recreate flow** — add `PATCH /place-transfers/:id/cancel` (sets `deleted_at`), keep rows auditable; users correct mistakes by cancel + create new transfer.
   - Pros: Safest accounting trail; aligns with existing soft-delete conventions and existing `deleted_at`; avoids complex edit recalculation edge cases.
   - Cons: Requires explicit UX messaging (“canceled” vs “deleted”); correction takes two user actions.
   - Effort: Medium

3. **Full edit-in-place + soft cancel** — support `PUT /place-transfers/:id` to change endpoints/amount/date plus cancel action.
   - Pros: Best direct UX for quick corrections.
   - Cons: Highest semantic risk (must reverse old leg and apply new leg correctly), larger test matrix, higher chance to regress dashboard container math.
   - Effort: High

### Recommendation
Ship a **management polish v1.1** focused on **soft cancel + UI consistency**, not full edit-in-place. This is the safest step with the highest quality/effort ratio:
- Backend: add cancel endpoint with account-scoped ownership + idempotent response semantics, keeping transfer rows as audit records.
- Frontend: add cancel action in history and unify transfer section styling/copy patterns with the rest of payment container management (including i18n keys).
- Correction policy: “wrong transfer” = cancel + recreate (explicitly documented in UX and spec).

Defer true edit-in-place to a later change once cancel behavior is stable and analytics/activity requirements are clarified.

### Risks
- **Semantic confusion risk**: users may expect delete/edit; cancel behavior must be clearly labeled.
- **Dashboard regression risk**: canceled transfers must be excluded from money-by-container calculations consistently.
- **Scope creep risk**: adding edit-in-place in this change likely breaches the review budget and raises verification complexity.

### Ready for Proposal
Yes — propose a scoped change: soft-cancel transfer management + transfer section UI consistency polish. Recommend chained delivery because backend API/tests plus frontend UX/i18n/tests is likely near or above a single 400-line review slice.
