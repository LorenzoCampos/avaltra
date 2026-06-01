## Exploration: savings-goals-use-places

### Current State
Savings goals currently store money location as free text (`savings_goals.saved_in`) instead of a validated place/container reference. Backend create/update/list/get handlers read and write `saved_in` directly (`backend/internal/handlers/savings_goals/*.go`). Deposits and withdrawals only mutate `savings_goal_transactions` + `savings_goals.current_amount`; they do not reference source/destination place IDs.

Payment containers (places) already have strong active-account validation patterns (for example `validateActivePlaces` in place transfers and `SELECT EXISTS ... account_id ... is_active = true` checks in account defaults and income/expense payment context). Dashboard money-by-container currently aggregates only income/expense container links plus place transfer legs; savings deposits/withdrawals are excluded from place balances (`backend/internal/handlers/dashboard/summary.go`).

Frontend savings create/edit still exposes "Saved In" text (`frontend/src/features/savings/SavingsForm.tsx`, `frontend/src/schemas/savings.schema.ts`, `frontend/src/i18n/locales/*/savings.json`) and cards display that text (`SavingsCard.tsx`).

### Affected Areas
- `backend/migrations/011_update_savings_goals_and_create_transactions.up.sql` — legacy origin of free-text `saved_in`; future migration must replace or deprecate this field.
- `backend/internal/handlers/savings_goals/create.go` — request/response include `saved_in`; insert writes `saved_in`.
- `backend/internal/handlers/savings_goals/update.go` — update path persists `saved_in` via `COALESCE`.
- `backend/internal/handlers/savings_goals/list.go` and `get.go` — API responses still surface `saved_in` to UI.
- `backend/internal/handlers/savings_goals/add_funds.go` and `withdraw_funds.go` — transaction model lacks place context for deposit/withdraw movements.
- `backend/internal/handlers/dashboard/summary.go` — `queryMoneyByContainer` does not include savings-goal movements, so per-place availability cannot be exact once goals move to places.
- `backend/internal/handlers/place_transfers/handlers.go` and `accounts/update.go` — reusable patterns for active-account place validation.
- `frontend/src/features/savings/SavingsForm.tsx` + `frontend/src/schemas/savings.schema.ts` + `frontend/src/types/savings.ts` — form/type contracts currently model free-text `saved_in`.
- `frontend/src/features/savings/components/SavingsCard.tsx` + `frontend/src/i18n/locales/es/savings.json` — UI copy and rendering currently assume textual storage location.
- `openspec/specs/payment-containers/spec.md` + `openspec/specs/place-transfers/spec.md` — establish place-first domain and transfer neutrality constraints this change must respect.

### Approaches
1. **Direct replacement with required `saved_container_id` (no transition window)** — Remove free text quickly and force every goal to point to an active place immediately.
   - Pros: Cleanest target model; no dual-write ambiguity.
   - Cons: Risky migration for existing goals with arbitrary text (`saved_in`) and no deterministic mapping; may block users at deploy time; high rollback cost.
   - Effort: High

2. **Phased dual-model migration to place reference (recommended)** — Introduce `saved_container_id` first, keep `saved_in` temporarily read-only for compatibility/backfill, then remove `saved_in` in a later archive/finalization step.
   - Pros: Safest rollout; supports explicit "unassigned" handling; allows deterministic mappings where possible and manual resolution where not; aligns with existing nullable migration policy in payment-containers spec.
   - Cons: Temporary complexity (dual fields, migration state, compatibility responses).
   - Effort: Medium

### Recommendation
Use **Approach 2 (phased migration)** with these guardrails:
1) Add `saved_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL` in savings goals.
2) Validate on create/update that non-null container belongs to active account (`EXISTS ... account_id ... is_active = true` pattern).
3) Keep legacy `saved_in` only as compatibility metadata during transition; API should prioritize container-based fields and include an explicit unassigned state.
4) Extend savings transactions to optionally capture place movement semantics (see risks) so future dashboard per-place availability can become exact without synthetic inference.
5) Update UI from free-text input to place selector plus explicit unassigned/needs-assignment messaging.

This is the highest-quality path because it preserves data integrity, avoids guessed mapping from arbitrary text, and sets clean foundations for upcoming place-centric dashboard/ledger work.

### Risks
- **Historical precision gap**: Existing `savings_goal_transactions` have no place linkage, so retroactive per-place savings attribution is impossible without assumptions.
- **Migration ambiguity**: `saved_in` values are human text (e.g., "Mercado Pago", "Efectivo") and may map to zero or multiple places.
- **Behavioral mismatch**: Dashboard currently ignores savings-goal movements in money-by-container; once goals use places, this omission will produce inconsistent "available by place" unless addressed.
- **Lifecycle edge cases**: Deactivated/deleted containers referenced by goals need explicit rules (block deactivation, auto-unassign, or require reassignment).
- **Auto-created default goal**: account creation inserts "Ahorro General" without location; post-migration default behavior must be defined.

### Ready for Proposal
Yes — with one product decision to confirm in proposal scope: for historical savings transactions without place linkage, system should expose them as **unassigned historical savings movement** (no guessed backfill) and only guarantee exact per-place savings movement from the migration-forward date.
