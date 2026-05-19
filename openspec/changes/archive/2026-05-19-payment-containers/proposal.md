# Proposal: Payment Containers

## Intent

Replace the flat `payment_method` concept with a domain model that distinguishes where money lives from how it is paid or collected. V1 must support wallets/banks/cards as containers and/or instruments where appropriate, while keeping existing transaction flows working.

## Scope

### In Scope
- Define money containers, payment instruments, and institution metadata.
- Add optional transaction linkage: expenses use one source container and optional instrument; incomes use one destination container and optional instrument.
- Model cards as non-balance instruments backed by a bank/wallet/container in v1.
- Add a mini breakdown of money by container/place.
- Migrate gradually from legacy `payment_method` without breaking current clients/imports.

### Out of Scope
- Split payments: one transaction may reference zero or one container/instrument only.
- Card balances, prepaid-card special cases, transfers, reconciliation, and detailed institution/instrument reports.
- Big-bang removal of `payment_method`.

## Capabilities

### New Capabilities
- `payment-containers`: Defines containers, instruments, backing relationships, transaction linkage, legacy migration, and container balance breakdown behavior.

### Modified Capabilities
- `transaction-money-display`: Transaction rows/cards may add container/instrument context without changing money-format rules.

## Approach

Use the explored hybrid bridge path toward a normalized model: add relational tables and optional transaction foreign keys while retaining `payment_method` during transition. Backend APIs should expose both legacy and new fields initially; frontend forms should make container/instrument selection optional; importer mapping should continue accepting legacy media while preparing normalized mappings.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/` | New/Modified | Add container/instrument tables and transaction linkage columns. |
| `backend/internal/handlers/{expenses,incomes}` | Modified | Create/update/list optional normalized payment context. |
| `backend/internal/handlers/{imports,activity,dashboard}` | Modified | Preserve legacy behavior, surface normalized context, add mini breakdown. |
| `frontend/src/types` | Modified | Add container/instrument contracts beside legacy payment method. |
| `frontend/src/features/{expenses,incomes,imports,activity,dashboard}` | Modified | Optional selectors, labels, and breakdown display. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Change exceeds review budget | High | Split implementation into backend model/API, transaction UI, importer, dashboard/activity slices. |
| Legacy ambiguity | High | Keep `payment_method`, avoid destructive backfill, allow null normalized links. |
| Import regressions | Med | Preserve aliases and add tests before normalized mapping changes. |
| Inconsistent dual fields | Med | Define read/write precedence in design and verify with API tests. |

## Rollback Plan

Keep legacy `payment_method` as the stable fallback. If rollout fails, hide new UI fields, stop writing normalized links, and leave additive DB columns/tables unused until a safe cleanup migration.

## Dependencies

- Branch `feat/payment-containers`; GitHub issue #13.
- No project-specific `openspec/config.yaml` rules were available.

## Success Criteria

- [ ] Existing transactions/imports still work with `payment_method` only.
- [ ] Users can optionally link one container/instrument to expenses/incomes.
- [ ] Cards are instruments backed by a container and do not hold v1 balances.
- [ ] Dashboard exposes a mini breakdown by money container/place.
