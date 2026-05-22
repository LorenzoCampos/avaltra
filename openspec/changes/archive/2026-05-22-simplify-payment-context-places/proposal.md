# Proposal: Simplify Payment Context Places

## Intent

Simplify payment context to places/containers only. Expenses choose where money came from; incomes choose where money arrived. Instruments/means stop being primary product concepts now while stored compatibility data remains readable.

## Scope

### In Scope
- Hide/stop instrument selectors and instrument payload shaping in expense, income, recurring, and import primary flows.
- Persist new/edited transactions and recurring templates with container/place refs only; generated recurring occurrences inherit the template place for future rows only.
- Preserve existing rows with instrument refs and keep labels/fallbacks non-broken.
- Reconcile paused/draft PR #23 assumptions; do not depend on it merging as-is.

### Out of Scope
- Physical removal of instrument tables/columns and historical backfill.
- Transfers between places.
- Credit/debt/cards/cuotas/resumen modeling.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `payment-containers`: Rewrite requirements from container+instrument to place/container-first transaction context, soft-deprecating instruments while preserving legacy display compatibility.
- `recurring-payment-context`: Change active delta from optional container+instrument refs to place/container-only template context and future-occurrence inheritance.

## Approach

Use soft deprecation: keep DB columns/table temporarily, accept legacy/instrument fields only for compatibility, but hide instruments in UI and stop sending them from primary flows. Prefer container/place labels over instrument labels, falling back to existing instrument/legacy data for old rows. Deliver in slices because coupling spans backend handlers, shared validation, frontend helpers/forms, recurring scheduler, importer, tests, and specs.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/transactions/payment_context.go` | Modified | Validate place-only primary context; compatibility-tolerate old instrument refs. |
| `backend/internal/handlers/{expenses,incomes,recurring_*}` | Modified | Accept/respond with place-first context; stop primary instrument use. |
| `backend/pkg/scheduler/recurring_*` | Modified | Snapshot template place only into future occurrences. |
| `backend/internal/handlers/{activity,imports}` | Modified | Prefer place labels/mapping; preserve old fallbacks. |
| `frontend/src/lib/paymentContext.ts`, forms | Modified | Remove instrument-driven normalization/selectors. |
| `openspec/specs/payment-containers`, active recurring delta | Modified | Update requirements to places-only soft-deprecation model. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hidden instrument coupling | High | Slice work; update shared helper/tests first. |
| Legacy rows lose friendly labels | Med | Keep instrument/legacy fallback display. |
| Import mapping changes outcomes | Med | Prioritize unique place matches; document ambiguity behavior. |
| PR #23 reintroduces instrument assumptions | Med | Reconcile before apply; do not assume direct merge. |

## Rollback Plan

Revert UI/API/helper/scheduler changes. Because schema is retained, old instrument-based behavior and existing rows remain recoverable.

## Dependencies

- Current `payment-containers` spec and active `recurring-payment-context` change.
- Paused/draft PR #23 must be reviewed for conflicting assumptions.

## Success Criteria

- [ ] Expenses select source place only; incomes select destination place only.
- [ ] Recurring templates use place-only context for future generated rows.
- [ ] Existing instrument-linked rows still render usable labels.
- [ ] Primary flows no longer expose payment instruments/means.
