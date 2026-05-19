# Design: Payment Containers

## Technical Approach

Add a normalized payment-context layer beside the existing `payment_method` bridge. Backend keeps current Gin/pgx handler style and additive migrations; frontend keeps TanStack Query hooks, React Hook Form/Zod forms, and existing payment-method labels as fallback. V1 makes container/instrument optional on transactions and exposes a compact dashboard breakdown, not full institution reporting.

## Architecture Decisions

| Decision | Choice | Tradeoff / rationale |
|---|---|---|
| Tables/entities | Create `payment_institutions`, `payment_containers`, `payment_instruments`; add nullable `source_container_id/source_instrument_id` to `expenses` and `destination_container_id/destination_instrument_id` to `incomes`. | Separates “where money lives” from “how it moves” while preserving current `expenses`/`incomes` tables and avoiding split-payment join tables in v1. |
| Optional single refs | Nullable FKs; payload accepts at most one `container_id` and one `instrument_id`. | Matches spec and avoids transaction association backfill. No arrays: reject future-looking split payloads with `split-payment-not-supported`. |
| Card backing rule | Instruments of type `credit_card`/`debit_card` require `backing_container_id`; instruments have no balance columns. | Enforces product decision that cards are non-balance instruments; prepaid/card balances remain future work. |
| Compatibility | Continue accepting/returning `payment_method`; normalized labels take display precedence, then `payment_method`, then blank. On writes, normalized IDs do not auto-overwrite legacy method. | Avoids ambiguous inference and keeps old clients/imports stable during gradual migration. |
| Import fallback | Keep `paymentMethodAliases` and `payment_method` insert path. Add optional deterministic lookup by raw medium or explicit decisions later; unresolved imports remain legacy-only. | Preserves existing importer safety and duplicate fingerprint behavior; normalized mapping can evolve without blocking v1. |

## Data Flow

Management: UI → `usePaymentContainers()`/`usePaymentInstruments()` → `/api/payment-containers`, `/api/payment-instruments` → account-scoped CRUD, soft deactivate.

Transactions: forms load active containers/instruments → submit optional IDs plus legacy `payment_method` → handlers validate account ownership/backing relationships → insert/update nullable FKs → list/get joins labels.

Activity/dashboard: SQL left-joins normalized refs; response includes `payment_context`. Dashboard breakdown groups historical income minus expenses by container; null refs go to `unassigned`.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/migrations/023_create_payment_containers.up/down.sql` | Create | Institutions, containers, instruments, nullable transaction refs, indexes/checks. |
| `backend/internal/handlers/payment_containers/*` | Create | Account-scoped CRUD/list/deactivate handlers. |
| `backend/internal/transactions/payment_context.go` | Create | Validation/shared response helpers; keep `payment_method.go`. |
| `backend/internal/server/server.go` | Modify | Register protected/account routes. |
| `backend/internal/handlers/{expenses,incomes}/{create,update,get,list}.go` | Modify | Accept, validate, persist, and return normalized context. |
| `backend/internal/handlers/{activity,dashboard,imports}/*` | Modify | Add display context, breakdown, importer fallback. |
| `frontend/src/types/paymentContainer.ts`, `hooks/usePaymentContainers.ts` | Create | API types/hooks. |
| `frontend/src/features/payment-containers/*` | Create | Management UX. |
| `frontend/src/features/{expenses,incomes}/*`, `schemas/*` | Modify | Optional selectors and Zod UUID/null handling. |
| `frontend/src/{types,hooks,features}/dashboard*`, `useActivity.ts` | Modify | Add context labels and mini breakdown. |

## Interfaces / Contracts

```ts
type PaymentContext = {
  container_id: string | null; container_name: string | null; container_type: 'bank'|'wallet'|'cash'|'other'|null;
  instrument_id: string | null; instrument_name: string | null; instrument_type: 'debit_card'|'credit_card'|'transfer'|'cash'|'other'|null;
  legacy_payment_method: PaymentMethod | null; display_label: string | null;
};
```

Requests add `source_container_id/source_instrument_id` for expenses and `destination_container_id/destination_instrument_id` for incomes. Dashboard adds `money_by_container: [{container_id,name,type,total,percentage,is_unassigned}]`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Backend unit/integration | ownership validation, card backing, optional refs, legacy precedence | Existing pgxmock handler tests plus transaction helper tests. |
| Importer | aliases unchanged; unresolved medium still invalid; deterministic normalized mapping optional | Extend `imports/*_test.go`, preserve fingerprint expectations unless normalized fields are included. |
| Frontend | types/Zod, optional selectors, fallback label, dashboard breakdown | Vitest/RTL near existing payment method/dashboard tests. |

## Migration / Rollout

Additive migration only; no historical backfill. Release backend model/API first, then management UI, transaction selectors, importer compatibility, dashboard/activity display. Rollback by hiding UI and not writing normalized IDs; legacy `payment_method` remains source of truth.

## Review-Safe Slices

1. DB + backend CRUD/routes. 2. Transaction API validation/joins. 3. Frontend types/hooks/management UI. 4. Transaction form/list labels. 5. Importer fallback tests. 6. Dashboard/activity breakdown. Each slice should target ~400 changed lines where practical.

## Open Questions

None blocking.
