# Tasks: Place to Place Transfers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700-1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend transfer domain/API + migration + tests | PR 1 | Self-contained backend slice; no dashboard/activity/UI scope |
| 2 | Dashboard `money_by_container` transfer deltas + tests | PR 2 | Depends on PR 1 data model; keep totals/P&L queries untouched |
| 3 | Frontend place transfer form/history + tests | PR 3 | Depends on PR 1 API; no activity integration, no places redesign |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 RED: Add migration tests for `026_create_place_transfers` checks/indexes in `backend/migrations/026_create_place_transfers.{up,down}.sql`.
- [x] 1.2 GREEN: Create `backend/migrations/026_create_place_transfers.up.sql` with account-scoped FKs, positive amount check, distinct source/destination check, ARS/account-currency field.
- [x] 1.3 GREEN: Create `backend/migrations/026_create_place_transfers.down.sql` dropping transfer indexes/table in rollback-safe order.

## Phase 2: Core Backend Transfer API (TDD)

- [ ] 2.1 RED: Create `backend/internal/handlers/place_transfers/handlers_test.go` for create/list/update/delete and errors: `source-place-required`, `destination-place-required`, `source-destination-must-differ`, `invalid-place-account`, `currency-mismatch-not-supported`.
- [x] 2.2 GREEN: Add `backend/internal/handlers/place_transfers/{types,store}.go` for transfer DTOs, scans, active-account scoping, active place ownership validation.
- [ ] 2.3 GREEN: Implement `backend/internal/handlers/place_transfers/{create,list,update,delete}.go` with v1 same-currency/account-currency-only policy (ARS in current product workflow).
- [x] 2.4 REFACTOR: Register authenticated routes in `backend/internal/server/server.go` under active-account middleware and align error payloads with existing `{ "error": "..." }` contract.

PR 1 apply note: create/list backend API, validation errors, migration, and route registration are implemented. Update/delete remain unchecked because they were not part of the approved PR 1 slice for this apply batch.

## Phase 3: Dashboard Integration (No P&L impact)

- [x] 3.1 RED: Extend `backend/internal/handlers/dashboard/summary_test.go` scenarios for source `-A`, destination `+A`, unchanged income/expense/P&L totals.
- [x] 3.2 GREEN: Update `backend/internal/handlers/dashboard/summary.go` `queryMoneyByContainer` with transfer source/destination `UNION ALL` signed legs only.
- [x] 3.3 REFACTOR: Verify `buildMoneyByContainerBreakdown` compatibility with mixed migrated/unassigned buckets and transfer-balanced totals.

PR 2 apply note: dashboard `money_by_container` now includes signed transfer source/destination legs only. Income, expense, available balance, and current available balance queries remain unchanged by transfer rows.

## Phase 4: Frontend Payment Containers Transfer UX (TDD)

- [x] 4.1 RED: Add frontend tests for hooks/form validation/query invalidation in `frontend/src/hooks/usePlaceTransfers.test.ts` and `frontend/src/features/payment-containers/PlaceTransferForm.test.tsx`.
- [x] 4.2 GREEN: Create `frontend/src/types/placeTransfer.ts` and `frontend/src/hooks/usePlaceTransfers.ts` for list/create/update/delete against `/api/place-transfers`.
- [x] 4.3 GREEN: Create `frontend/src/features/payment-containers/{PlaceTransferForm,PlaceTransferHistory}.tsx` using active places only; no FX conversion fields.
- [x] 4.4 REFACTOR: Modify `frontend/src/features/payment-containers/PaymentContainersPage.tsx` to mount transfer UI/history without redesigning places or removing legacy media.

PR 3 apply note: frontend implements the available `GET/POST /api/place-transfers` contract only, matching the approved PR 3 scope and PR 1 backend surface. Update/delete frontend hooks were not added because backend update/delete endpoints remain outside the approved slices.

## Phase 5: Verification / Scope Guardrails

- [ ] 5.1 Run backend tests for transfer handler + dashboard summary; verify no synthetic income/expense transaction creation path.
- [ ] 5.2 Run frontend tests for transfer flow and dashboard invalidation; verify transfer-only actions do not change P&L widgets.
- [ ] 5.3 Document deferred scope in change notes: activity timeline integration, multi-currency conversion, places redesign, and legacy media removal remain out of this change.
