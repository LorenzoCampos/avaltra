# Proposal: Savings Goals Use Places

## Intent

Make savings goals use validated places/payment containers for stored money instead of free-text `saved_in`, so future place balances and dashboards can be exact from migration-forward without guessing historical data.

## Scope

### In Scope
- Add nullable `saved_container_id`/equivalent place reference for savings goals.
- Validate referenced places against the active account; keep legacy `saved_in` temporarily for compatibility/backfill.
- Capture migration-forward savings deposits/withdrawals with exact place attribution; mark old unlinked savings movement as unassigned historical.
- Replace savings UI free-text location with place selection and unassigned messaging.

### Out of Scope
- Full visual Places/dashboard redesign.
- Guessed mapping of legacy `saved_in` text to places.
- Removing `saved_in` physically in this change; final cleanup is deferred.

## Capabilities

### New Capabilities
- `savings-goal-place-storage`: Savings goals store money location through validated place references with legacy compatibility.

### Modified Capabilities
- `payment-containers`: Money-by-container breakdown must account for migration-forward savings movements and explicit unassigned historical savings movement.
- `savings-goal-editing`: Savings goal create/edit flows must use place selection instead of free-text location while preserving existing edit access behavior.

## Approach

Use a phased dual-model migration: add nullable place reference, validate active-account ownership, keep `saved_in` read-only/compatibility metadata, and add transaction-level place attribution for new deposits/withdrawals. Historical transactions without place linkage remain explicitly unassigned.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/` | New | Add nullable place references and compatibility migration. |
| `backend/internal/handlers/savings_goals/` | Modified | Contracts, validation, create/update/list/get, deposits/withdrawals. |
| `backend/internal/handlers/dashboard/summary.go` | Modified | Include attributed savings movements and unassigned bucket. |
| `frontend/src/features/savings/` | Modified | Place selector, display labels, unassigned state. |
| `frontend/src/schemas/savings.schema.ts`, `frontend/src/types/savings.ts`, `frontend/src/i18n/locales/*/savings.json` | Modified | API/types/copy for place-based savings. |
| `openspec/specs/payment-containers/spec.md`, `openspec/specs/savings-goal-editing/spec.md` | Modified | Delta specs for behavior changes. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Review size exceeds 400 lines | High | Plan chained PRs: schema/API, frontend, dashboard/reporting. |
| Legacy text mapping ambiguity | High | Never guess; expose unassigned historical movement. |
| Dashboard inconsistency | Med | Include only exact migration-forward attribution plus unassigned bucket. |

## Rollback Plan

Keep additive columns nullable and preserve `saved_in`; rollback by reverting handlers/UI to legacy fields and ignoring new columns until a follow-up cleanup.

## Dependencies

- Existing payment container validation patterns and active-account scoping.

## Success Criteria

- [ ] New/edited savings goals can reference only active-account places.
- [ ] Legacy `saved_in` data remains readable without guessed backfill.
- [ ] New deposits/withdrawals have exact place attribution.
- [ ] Dashboard can distinguish attributed savings movement from unassigned historical movement.
