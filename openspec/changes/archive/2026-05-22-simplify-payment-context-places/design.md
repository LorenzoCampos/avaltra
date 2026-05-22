# Design: Simplify Payment Context Places

## Technical Approach

Move primary transaction context to place/container-only behavior while preserving existing schema and legacy/instrument readability. Backend create/update flows should validate and persist `*_container_id` as the canonical new input, tolerate existing `*_instrument_id` for compatibility, and stop deriving new rows from instruments. Frontend forms should fetch/select containers only; labels should prefer container/place names, then instrument names, then legacy `payment_method`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Hard-delete instrument schema now | Clean model, high rollback/data risk | Reject; soft-deprecate instruments and keep columns/tables. |
| Add new `place_id` API fields | Future-friendly, but duplicates current container columns | Reject for now; use existing `source_container_id` / `destination_container_id` and place language in UI/docs. |
| Accept instrument payloads | Preserves external compatibility but risks new coupling | Accept only as legacy compatibility; primary UI/import/scheduler must not set instruments. |
| Salvage PR #23 wholesale | Contains useful UI/i18n polish but reinforces instrument management | Do not merge as-is; cherry-pick neutral container/i18n polish only after simplification, or retarget PR #23 to remove instrument UI. |

## Data Flow

```text
Expense form ── source_container_id ──→ expense handler ──→ expenses.source_container_id
Income form  ── destination_container_id → income handler  ──→ incomes.destination_container_id
Recurring form → template container_id ──→ scheduler ───────→ future row container_id
Importer raw medium → unique active container match ────────→ row container_id
Lists/activity ← container label → instrument fallback → legacy payment_method fallback
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/internal/transactions/payment_context.go` | Modify | Add/adjust place-first validation helpers; retain legacy instrument validation only where instrument is explicitly provided. |
| `backend/internal/handlers/expenses/*`, `backend/internal/handlers/incomes/*` | Modify | Keep response fields, but create/update primary behavior should not require or infer instruments. Update list/get label joins to prefer containers. |
| `backend/internal/handlers/recurring_*/*` | Modify | Accept/persist template container fields; instrument fields remain nullable legacy compatibility. |
| `backend/pkg/scheduler/recurring_expenses.go`, `backend/pkg/scheduler/recurring_incomes.go` | Modify | Copy container IDs to future rows; write null instrument IDs for new generated rows. |
| `backend/internal/handlers/imports/{mapping,commit}.go` | Modify | Load active containers for deterministic mapping; stop mapping active instruments into new import rows. Preserve legacy payment method alias behavior. |
| `backend/internal/handlers/activity/list.go` | Modify | Change `COALESCE(pi.name, pc.name)` to `COALESCE(pc.name, pi.name)` for incomes/expenses. |
| `frontend/src/lib/paymentContext.ts` and runtime tests | Modify | Remove instrument-backed container resolution; normalize container fields only and preserve display fallback. |
| `frontend/src/features/{expenses,incomes}/**`, `frontend/src/features/recurring-*/**` | Modify | Remove instrument hooks/selects/autofill from primary forms; duplicate/edit should not copy legacy instrument IDs into new submissions. |
| `frontend/src/i18n/locales/**` | Modify | Rename visible copy from instruments/means to place/container language. |
| `openspec/specs/payment-containers/spec.md`, recurring delta specs | Modify | Rewrite requirements to soft-deprecated instrument model. |

## Interfaces / Contracts

Primary fields remain current API names to avoid dead-end contracts: expenses use `source_container_id`; incomes use `destination_container_id`; recurring mirrors those. `source_instrument_id` / `destination_instrument_id` remain accepted/returned nullable legacy fields but MUST NOT be sent by primary frontend flows or importer-created rows.

Future transfers should use explicit `from_container_id` / `to_container_id`; future credit/debt work should introduce liability/statement concepts rather than reviving instruments as the main transaction context.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/handler | Container-only create/update, explicit instrument compatibility, label precedence | Go tests near `payment_context_test.go`, expense/income/activity/import tests. |
| Scheduler | Future recurring occurrences copy containers and null instruments | Go scheduler tests or focused integration-style DB tests. |
| Frontend unit/runtime | Forms submit only container IDs; labels fallback container → instrument → legacy | Vitest for `paymentContext`, form submission helpers, recurring forms where covered. |
| Verification | No instrument selector in primary flows | `go test ./...`; `pnpm test`, `pnpm typecheck`, targeted UI smoke. |

## Migration / Rollout

No DB migration required. Roll out in PR slices: (1) backend/domain labels, (2) frontend forms/i18n including safe PR #23 salvage, (3) recurring/importer/spec tests. Rollback is code-only because schema and legacy fields remain intact.

## Open Questions

- [ ] Should existing edit forms clear a legacy instrument when the user saves a changed/new container, or preserve it unless explicitly untouched?
