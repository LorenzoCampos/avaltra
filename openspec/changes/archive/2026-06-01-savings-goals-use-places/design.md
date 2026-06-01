# Design: Savings Goals Use Places

## Technical Approach

Use an additive, phased migration: keep `savings_goals.saved_in` readable, add nullable `savings_goals.saved_container_id`, and add nullable `savings_goal_transactions.container_id` for migration-forward attribution. Backend savings handlers validate active-account places with the existing `payment_containers(account_id, is_active)` pattern when a place is provided, but `NULL` remains a valid explicit unassigned state for create/update and movements. Frontend savings forms replace the free-text storage field with an optional active place selector plus “unassigned” messaging. Dashboard `queryMoneyByContainer` adds signed savings movement legs only for assigned movements, with null movements kept unassigned, without changing income, expense, or P&L totals.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Goal storage migration | Add nullable `saved_container_id UUID REFERENCES payment_containers(id) ON DELETE SET NULL`; keep `saved_in` | Required replacement; guessed text backfill | Additive rollback is safe and avoids false historical mapping. |
| Explicit unassigned policy | Allow `saved_container_id = NULL` on create/update as a first-class unassigned state | Force assignment after migration | A place is useful for exact balances, but not important enough to block users. |
| Movement attribution | Store nullable `container_id` on `savings_goal_transactions`; deposits/withdrawals copy request place, else goal place, else `NULL` | Derive only from goal at dashboard time; guess from `saved_in` | Transaction snapshots preserve exact attribution after later goal edits, and null stays honestly unassigned. |
| Operation place selection | `add-funds`/`withdraw-funds` accept optional `container_id`; default to goal `saved_container_id`; allow both missing as unassigned | Always require modal selection | Default keeps UX simple; explicit request allows overrides; missing data must not be guessed. |
| Compatibility contract | Responses include `saved_container_id`, optional `saved_container_name`, `saved_in`, and `storage_status` (`assigned`, `unassigned`) | Remove `saved_in` from API | Existing clients remain readable while new UI prefers container fields and shows explicit unassigned state. |
| Dashboard impact | Add savings deposit as negative movement and withdrawal as positive movement only for non-null `container_id`; null remains unassigned/bucketed | Change P&L calculations; allocate null by goal text | Savings movement reallocates availability by exact place only; existing total income/expense logic stays unchanged. |

## Data Flow

```text
SavingsForm ──saved_container_id?──→ create/update ──validate if non-null──→ savings_goals
ContributionForm ──container_id?───→ add/withdraw ──snapshot id or NULL────→ savings_goal_transactions
assigned transactions ────────────→ queryMoneyByContainer ──signed legs────→ place breakdown
null transactions ────────────────→ unassigned bucket / excluded from exact place totals
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/migrations/0xx_savings_goals_use_places.up.sql` | Create | Add `saved_container_id`, transaction `container_id`, FK indexes, comments; no text backfill. |
| `backend/internal/handlers/savings_goals/create.go`, `update.go`, `list.go`, `get.go` | Modify | Request/response fields, joins to container name, active-account validation. |
| `backend/internal/handlers/savings_goals/add_funds.go`, `withdraw_funds.go`, `get_transactions.go` | Modify | Accept/return `container_id`, snapshot attribution, keep old null rows unassigned. |
| `backend/internal/handlers/dashboard/summary.go` | Modify | Extend `queryMoneyByContainer` with signed savings movement union legs. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modify | Table-driven cases for savings attribution, unassigned null rows, P&L neutrality. |
| `backend/internal/handlers/savings_goals/*_test.go` | Create | Handler tests; none currently exist. |
| `frontend/src/features/savings/SavingsForm.tsx`, `ContributionForm.tsx`, `SavingsCard.tsx` | Modify | Use `usePaymentContainers`, optional selector UI, unassigned labels. |
| `frontend/src/schemas/savings.schema.ts`, `frontend/src/types/savings.ts`, `frontend/src/hooks/useSavings.ts`, `frontend/src/i18n/locales/*/savings.json` | Modify | New contracts, optimistic state, validation/copy. |

## Interfaces / Contracts

```json
{
  "saved_container_id": "uuid|null",
  "saved_container_name": "string|null",
  "saved_in": "legacy string|null",
  "storage_status": "assigned|unassigned",
  "transaction.container_id": "uuid|null"
}
```

Create/update MAY omit or clear `saved_container_id`. Backend rejects non-null missing/inactive/cross-account IDs. Historical and new transactions with null `container_id` are never mapped from `saved_in`; they remain unassigned or in an explicit unassigned bucket.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/handler | Place validation, explicit unassigned create/update, operation attribution defaults/overrides/null | Go table-driven tests with `pgxmock`. |
| Dashboard | Signed assigned savings legs, null unassigned bucket, no income/expense/P&L changes | Extend existing `summary_test.go` expectations. |
| Frontend | Optional selector, unassigned card messaging, mutation payloads | Existing Vitest/RTL style around savings components/hooks. |

## Migration / Rollout

Add nullable columns and indexes only. Do not backfill from `saved_in`, and do not force assignment during rollout. Deploy backend compatibility first, then frontend optional selector. Defer physical `saved_in` removal and broader Places/dashboard visual redesign to `places-experience-redesign`. This likely exceeds 400 lines; slice PRs into migration/API, dashboard accounting, then frontend UX.

## Open Questions

None.
