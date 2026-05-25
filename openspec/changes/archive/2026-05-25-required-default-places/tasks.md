# Tasks: Required Default Places

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 620–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 backend defaults+validation/tests → PR2 frontend account/forms required place → PR3 quick-add+import guard+smoke |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Account defaults persistence + manual API required-place enforcement + tests | PR 1 | Base: `feat/required-default-places`; includes migration and handler tests. |
| 2 | Frontend account defaults management + expense/income required selector/prefill/warnings | PR 2 | Base: PR1 branch; includes schema/payload tests. |
| 3 | Quick-add required-place alignment + importer compatibility guard + smoke | PR 3 | Base: PR2 branch; verifies no bypass and import null compatibility. |

## Phase 1: Foundation (Data + Contracts)

- [x] 1.1 Add `backend/migrations/025_add_account_default_places.up.sql` and `.down.sql` with nullable `default_expense_container_id`/`default_income_container_id` FKs + indexes.
- [x] 1.2 Extend `backend/internal/handlers/accounts/{create,get,list,update}.go` DTOs and SQL mapping to read/write nullable default place fields.
- [x] 1.3 Add account update validation in `accounts/update.go` so non-null defaults must be active containers in the same account.

## Phase 2: Backend Enforcement (Tests-first)

- [x] 2.1 RED: Add failing handler tests for manual one-time expense/income create/update rejecting missing/inactive/wrong-account place in `backend/internal/handlers/{expenses,incomes}/*_test.go`.
- [x] 2.2 GREEN: Implement required active place validation in `backend/internal/handlers/expenses/{create,update,payment_context.go}`.
- [x] 2.3 GREEN: Implement required active place validation in `backend/internal/handlers/incomes/{create,update,payment_context.go}`.
- [x] 2.4 Guard `backend/internal/handlers/imports/commit.go` behavior with regression tests proving unresolved/ambiguous import rows may keep null place.

## Phase 3: Frontend Defaults + Required Selection

- [x] 3.1 Update `frontend/src/types/account.ts` and `frontend/src/hooks/useAccounts.ts` for nullable account default expense/income place fields in read/update payloads.
- [x] 3.2 Update `frontend/src/features/accounts/AccountForm.tsx` to manage default expense/income places, ignore inactive defaults for prefill, and show replacement warning.
- [x] 3.3 RED: Add/adjust schema tests for required manual place fields in `frontend/src/schemas/{expense,income}.schema.ts`.
- [x] 3.4 GREEN: Update `frontend/src/features/{expenses,incomes}/*Form.tsx` and `formSubmissions.ts` to prefill active defaults, block submit without active place, and show no-active-place warning/CTA.

## Phase 4: Quick-add Alignment + Verification

- [x] 4.1 RED/GREEN: Update `frontend/src/components/QuickAddExpenseModal.tsx` tests and implementation so quick-add requires active place and preselects active account default.
- [x] 4.2 Run integration verification: backend handler tests + frontend schema/component tests for spec scenarios (active default prefill, inactive warning, required-place rejection).
- [x] 4.3 Manual smoke: validate expense/income forms and quick-add cannot bypass required-place intent; confirm importer commit path still accepts unresolved null-place rows.

## Phase 5: Scope Guardrails

- [x] 5.1 Confirm no implementation tasks are added for out-of-scope items: recurring templates, savings-goal places, transfers, credit/debt, physical instrument removal.
