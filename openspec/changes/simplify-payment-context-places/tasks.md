# Tasks: Simplify Payment Context Places

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 backend core → PR2 frontend UX/i18n + PR23 salvage → PR3 importer/recurring/tests/spec sync |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend place-first contract + legacy clear-on-save | PR 1 | Base main; include handler/scheduler tests |
| 2 | Frontend place-only forms/selectors + i18n + PR #23 reconciliation | PR 2 | Depends PR1 API behavior; cherry-pick neutral PR #23 UI/i18n only |
| 3 | Importer/activity/dashboard + recurring generation parity + final verification | PR 3 | Depends PR1-PR2; include spec-alignment and regression tests |

## Phase 1: Foundation and Contract Alignment

- [x] 1.1 Update `backend/internal/transactions/payment_context.go` to enforce container-first validation and accept instrument IDs as optional compatibility fields only.
- [x] 1.2 Update expense/income create-update handlers under `backend/internal/handlers/expenses/*` and `backend/internal/handlers/incomes/*` so primary payload paths use only `*_container_id`.
- [x] 1.3 Implement clear-on-save rule in edit/save flows: when a row is saved via place-only payload, set `source_instrument_id`/`destination_instrument_id` to null in persistence logic.
- [x] 1.4 Keep read compatibility in detail/list responses (legacy rows still readable) while documenting staged deprecation in code comments near compatibility branches.

## Phase 2: Frontend Simplification and PR #23 Reconciliation

- [ ] 2.1 Refactor `frontend/src/lib/paymentContext.ts` to normalize/submit container fields only and preserve display fallback container → instrument → `payment_method`.
- [ ] 2.2 Remove instrument selectors/hooks/autofill from `frontend/src/features/{expenses,incomes}/**` and ensure duplicate/edit submits do not copy legacy instrument IDs.
- [ ] 2.3 Simplify recurring template forms in `frontend/src/features/recurring-*/**` to container-only primary input.
- [ ] 2.4 Reconcile paused PR #23: salvage neutral container/i18n polish, explicitly abandon or rewrite any instrument-management UI assumptions.
- [ ] 2.5 Update locale copy in `frontend/src/i18n/locales/**` from instrument-centric wording to place/container language.

## Phase 3: Importer, Activity, Dashboard, and Recurring Generation

- [ ] 3.1 Update importer mapping/commit flow in `backend/internal/handlers/imports/{mapping,commit}.go` to prefer deterministic container matches and avoid assigning instrument IDs for new rows.
- [ ] 3.2 Update activity label precedence in `backend/internal/handlers/activity/list.go` to `COALESCE(container, instrument, payment_method)`.
- [ ] 3.3 Update recurring handlers and `backend/pkg/scheduler/recurring_{expenses,incomes}.go` so future occurrences copy container IDs and write null instrument IDs.
- [ ] 3.4 Verify dashboard and transaction read models consuming payment context still render legacy rows without blank labels.

## Phase 4: Tests and Verification

- [x] 4.1 Add/adjust backend tests for container-only create/update acceptance, legacy instrument compatibility, and clear-on-save behavior.
- [ ] 4.2 Add recurring tests for future-only inheritance and scheduler null-instrument generation from place-only templates.
- [ ] 4.3 Add frontend runtime/unit tests proving no instrument selector in primary flows and submission payloads contain only container fields.
- [ ] 4.4 Add importer/activity regression tests for deterministic place mapping and fallback label precedence.
- [ ] 4.5 Run `go test ./...`, `pnpm test`, `pnpm typecheck`, and a targeted manual smoke for expense/income/recurring/import flows.

## Phase 5: Deprecation Staging and Spec Sync

- [ ] 5.1 Record soft-deprecation completion in change docs: no physical schema removal in this PR; legacy data remains readable.
- [ ] 5.2 Plan follow-up migration task set: deterministic instrument→container backfill, then null remaining instrument refs where safe.
- [ ] 5.3 Plan final physical-removal phase after confidence window (drop columns/tables only in later change).
