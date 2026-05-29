# Design: Place to Place Transfers

## Technical Approach

Add a dedicated `place_transfers` table, Go handler package, API routes, and small payment-containers UI slice for moving money between active payment containers in the active account. Dashboard `money_by_container` will read transfers as container deltas only; existing income, expense, recent transaction, category, savings, and P&L queries stay untouched.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Transfer domain | New `backend/internal/handlers/place_transfers/` package and `place_transfers` table | Fake income+expense rows; adding transfer type to activity union | Keeps transfers auditable without polluting P&L or monthly transaction reports. |
| Currency v1 | Store `currency` as the active account currency; request currency is optional/implicit and rejected when different | Add per-container currency; conversion fields | `payment_containers` have no currency today. Account currency is the only reliable model, so same-currency means account-currency-only for v1. |
| Validation | Validate positive amount, required source/destination, distinct IDs, both `is_active=true`, both owned by active account | Rely on FK/DB errors | Existing handlers return explicit 400s; account scoping must happen before insert/update to avoid cross-account movement. |
| Dashboard effect | Extend `queryMoneyByContainer` with two `UNION ALL` transfer legs: source `-amount`, destination `+amount` | Recompute balances in app code | Existing SQL already models money movement as signed rows and `buildMoneyByContainerBreakdown` can remain mostly unchanged. |
| Delivery | Chain backend schema/API, dashboard math, then frontend UI/history | One large PR | Backend+frontend change is likely >400 changed lines; slices keep reviewable boundaries. |

## Data Flow

    Transfer form ──POST /api/place-transfers──> place_transfers handler
          │                                      │
          │                                      ├─ validates active account + active distinct places
          │                                      └─ inserts transfer in account currency
          └─ invalidates transfers/dashboard queries

    Dashboard summary ──queryMoneyByContainer──> income + expense + transfer signed movements

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/migrations/026_create_place_transfers.up.sql` | Create | `place_transfers(id, account_id, source_container_id, destination_container_id, amount, currency, date, note, deleted_at, created_at, updated_at)` plus account/date/source/destination indexes and distinct/positive checks. |
| `backend/migrations/026_create_place_transfers.down.sql` | Create | Drop indexes/table. |
| `backend/internal/handlers/place_transfers/{types,store,create,list,update,delete}.go` | Create | Handler types, scanning, validation helpers, create/list/update/soft-delete endpoints. |
| `backend/internal/handlers/place_transfers/handlers_test.go` | Create | pgxmock tests for validation, account scoping, create/list/update/delete. |
| `backend/internal/handlers/dashboard/summary.go` | Modify | Add transfer source/destination legs to `queryMoneyByContainer`; do not touch totals/recent/category queries. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modify | Assert transfer deltas affect container balances and not income/expense totals. |
| `backend/internal/server/server.go` | Modify | Register `/api/place-transfers` under auth + account middleware. |
| `frontend/src/types/placeTransfer.ts` | Create | Transfer request/response/list types. |
| `frontend/src/hooks/usePlaceTransfers.ts` | Create | React Query list/create/update/delete hooks with active-account query keys and dashboard invalidation. |
| `frontend/src/features/payment-containers/{PlaceTransferForm,PlaceTransferHistory}.tsx` | Create | Focused form/history components using active containers only. |
| `frontend/src/features/payment-containers/PaymentContainersPage.tsx` | Modify | Add transfer section without redesigning existing places/legacy media UI. |

## Interfaces / Contracts

`POST /api/place-transfers` request:

```json
{"source_container_id":"uuid","destination_container_id":"uuid","amount":123.45,"date":"2026-05-29","note":"optional","currency":"ARS optional"}
```

Response/list item includes `id`, `account_id`, source/destination container IDs and names, `amount`, `currency`, `date`, `note`, `created_at`, `updated_at`. Errors use existing `{ "error": "..." }` shape with stable messages: `source-place-required`, `destination-place-required`, `source-destination-must-differ`, `invalid-place-account`, `currency-mismatch-not-supported`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit | Validation, ownership, CRUD, soft delete | pgxmock handler tests mirroring payment container tests. |
| Dashboard | Transfer deltas and unchanged P&L | Extend `summary_test.go` SQL expectations and direct breakdown tests. |
| Frontend unit | Query keys, form payload validation, active-place selector rules | Vitest tests near payment-container management tests. |
| E2E | Deferred | Manual smoke for create transfer/history/dashboard after slices land. |

## Migration / Rollout

No data backfill required. Roll out as chained PRs: schema+API, dashboard math, frontend form/history. Rollback disables routes/UI and reverts dashboard query before dropping the table if data can be discarded.

## Open Questions

- [ ] None blocking. Future activity timeline integration should be a separate isolated slice.
