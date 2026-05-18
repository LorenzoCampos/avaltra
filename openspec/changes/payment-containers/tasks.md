# Tasks: Payment Containers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 DB+backend CRUD → PR2 tx wiring → PR3 frontend management → PR4 forms+labels → PR5 importer+dashboard |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — resolved by orchestrator/user for PR1
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + backend container/instrument APIs | PR 1 | Base: `feat/payment-containers`; includes migration/tests |
| 2 | Expense/income normalized refs + validation | PR 2 | Depends on PR1; keep legacy `payment_method` behavior |
| 3 | Frontend types/hooks + management UI routes | PR 3 | Depends on PR2 contracts |
| 4 | Transaction forms/activity labels fallback | PR 4 | Depends on PR3 |
| 5 | Importer compatibility + dashboard breakdown | PR 5 | Depends on PR4; closes spec scenarios |

## Phase 1: Foundation (DB + Backend APIs)

- [x] 1.1 Create `backend/migrations/023_create_payment_containers.up.sql` and `.down.sql` with tables `payment_institutions`, `payment_containers`, `payment_instruments`, and nullable FK columns in `expenses`/`incomes`.
- [x] 1.2 Add `backend/internal/transactions/payment_context.go` for ownership checks, single-association guard (`split-payment-not-supported`), and card backing validation (`backing-container-required`).
- [x] 1.3 Create `backend/internal/handlers/payment_containers/{types.go,store.go,list.go,create.go,update.go,deactivate.go}` and instrument equivalents; register routes in `backend/internal/server/server.go`.

## Phase 2: Transaction Wiring (Compatibility First)

- [x] 2.1 Update `backend/internal/handlers/expenses/{create.go,update.go,get.go,list.go,store.go}` to accept/return `source_container_id` and `source_instrument_id` while preserving legacy-only payloads.
- [x] 2.2 Update `backend/internal/handlers/incomes/{create.go,update.go,get.go,list.go,store.go}` for `destination_container_id` and `destination_instrument_id` with same fallback rules.
- [x] 2.3 Update `backend/internal/handlers/activity/list.go` to expose normalized `payment_context` with precedence: normalized label → `payment_method` label → null.
- [x] PR2 verification warning fix: update validation now proves one-field normalized ref replacements against the existing counterpart, and activity fallback maps legacy `payment_method` values to user-facing backend labels.

## Phase 3: Frontend Management + Forms

- [ ] 3.1 Add `frontend/src/types/paymentContainer.ts` and `frontend/src/types/paymentInstrument.ts`; extend `frontend/src/types/{expense.ts,income.ts,dashboard.ts}` with optional payment-context fields.
- [ ] 3.2 Add hooks `frontend/src/hooks/{usePaymentContainers.ts,usePaymentInstruments.ts}` and wire queries/mutations to backend endpoints.
- [ ] 3.3 Create `frontend/src/features/payment-containers/{PaymentContainersPage.tsx,ContainerForm.tsx,InstrumentForm.tsx}` and add route entry in `frontend/src/App.tsx` (or current route module).
- [ ] 3.4 Update `frontend/src/schemas/{expense.schema.ts,income.schema.ts}` and `frontend/src/features/{expenses/ExpenseForm.tsx,incomes/IncomeForm.tsx}` for optional UUID selectors.
- [ ] 3.5 Update `frontend/src/features/{expenses/ExpenseList.tsx,incomes/IncomeList.tsx,activity/components/ActivityFeed.tsx}` and `frontend/src/hooks/useActivity.ts` to render fallback-safe context labels without altering money formatting.

## Phase 4: Importer, Dashboard, and Verification

- [ ] 4.1 Update `backend/internal/handlers/imports/{mapping.go,commit.go,types.go}` to keep alias behavior and optionally attach deterministic normalized refs only when safe.
- [ ] 4.2 Update `backend/internal/handlers/dashboard/summary.go` and `frontend/src/features/dashboard/{Dashboard.tsx,InsightsCard.tsx}` plus `frontend/src/hooks/useDashboard.ts` for `money_by_container` including `unassigned` bucket.
- [ ] 4.3 Backend tests: add/extend `backend/internal/handlers/{expenses,incomes}/payment_method_test.go`, `backend/internal/handlers/imports/{preview_test.go,commit_test.go}`, `backend/internal/handlers/dashboard/summary_test.go`, and new payment-container handler tests.
- [ ] 4.4 Frontend tests: extend `frontend/src/features/paymentMethod.runtime.test.ts`, `frontend/src/features/dashboard/Dashboard.test.ts`, and add tests for `ExpenseForm.tsx`/`IncomeForm.tsx` optional selection behavior.
- [ ] 4.5 Verification run: `go test ./...` in `backend/` and `npm test` + `npm run build` in `frontend/`; confirm all spec scenarios (legacy-only create, split rejection, card backing rule, fallback labels, unassigned breakdown).
