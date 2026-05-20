# Tasks: Recurring Payment Context

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 520-760 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 recurring domain/forms/scheduler → PR2 payment management UX/i18n → PR3 tests/verification hardening |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Recurring template payment-context persistence + scheduler snapshot + recurring form wiring | PR 1 | Base: main; include backend+frontend contract tests for new fields. |
| 2 | Payment management create/edit UX and i18n polish | PR 2 | Base: PR1 branch; keep focused on payment-containers page/hooks/locales. |
| 3 | Cross-scenario verification and regression hardening | PR 3 | Base: PR2 branch; finalize future-only/inactive-selection behavior tests. |

### Current PR1 Boundary

PR1 is recurring-only: recurring template payment-context persistence, scheduler snapshot propagation, recurring form wiring, and focused blocker fixes. Payment context management UX/i18n requirements remain future PR2 scope and must stay pending for PR1 review packaging.

## Phase 1: Foundation (Schema + Shared Validation)

- [x] 1.1 Create `backend/migrations/024_add_recurring_payment_context.up.sql` and `.down.sql` with nullable recurring template refs, FK/indexes, and rollback.
- [x] 1.2 Update `backend/internal/transactions/payment_context.go` to expose reusable active ownership/backing validation helpers callable by recurring handlers.
- [x] 1.3 Update recurring template structs/queries in `backend/pkg/scheduler/recurring_expenses.go` and `backend/pkg/scheduler/recurring_incomes.go` to load payment-context refs.

## Phase 2: Core Recurring Implementation (Handlers + Forms + Scheduler)

- [x] 2.1 Modify `backend/internal/handlers/recurring_expenses/{create,update,get,list}.go` to accept optional source refs, support explicit `null` clearing, validate parity, and return refs.
- [x] 2.2 Modify `backend/internal/handlers/recurring_incomes/{create,update,get,list}.go` for destination refs with identical null/validation semantics.
- [x] 2.2a Fix recurring template partial update validation so submitted refs are merged with existing refs and the final stored pair is validated before update.
- [x] 2.3 Update scheduler insert paths in `backend/pkg/scheduler/{recurring_expenses,recurring_incomes}.go` to snapshot template refs only at generation time.
- [x] 2.4 Add recurring payment-context fields in `frontend/src/types/{recurringExpense,recurringIncome}.ts` and adapt payload builder in `frontend/src/lib/paymentContext.ts`.
- [x] 2.5 Update `frontend/src/features/recurring-expenses/*Form.tsx` and `frontend/src/features/recurring-incomes/*Form.tsx` for selector rendering, edit hydration, and explicit-null submit behavior.

## Phase 3: Payment Context UX + i18n Polish

- [ ] 3.1 Refactor `frontend/src/features/payment-containers/*` to use explicit Create CTA and separate modal/panel create/edit surfaces (no always-open inline forms).
- [ ] 3.2 Update `frontend/src/hooks/usePaymentContainers.ts` and `frontend/src/hooks/usePaymentInstruments.ts` so inactive items are excluded from general selectors.
- [x] 3.3 Implement recurring-edit exception: if selected container/instrument is inactive, keep it visible/editable in that template form only (context retention without global reselectability).
- [ ] 3.4 Localize remaining management strings in `frontend/src/i18n/locales/en/*.json` and `frontend/src/i18n/locales/es/*.json` for validation, CTA, edit labels, and mutation toasts.

## Phase 4: Tests and Verification

- [ ] 4.1 Add backend tests for recurring handlers validating omit vs explicit `null`, invalid instrument-container rejection, and list/get field exposure.
- [ ] 4.2 Add scheduler tests proving generation snapshots current template refs and template edits do not mutate previously generated rows.
- [ ] 4.3 Extend frontend tests (including `paymentContainerManagement.test.ts`) for create CTA/edit surface flow, localized feedback, inactive exclusion, and recurring-edit inactive visibility exception.
- [ ] 4.4 Run full verification for changed areas (backend recurring + scheduler + frontend recurring/payment-containers) and document pass/fail evidence in apply/verify phase outputs.
