# Verification Report: savings-goals-use-places — PR 2 Dashboard/Backend Slice

**Mode**: Hybrid persistence; Strict TDD verification resolved from Engram apply-progress (`sdd/savings-goals-use-places/apply-progress`). `openspec/config.yaml` was not present, but apply-progress states Strict TDD is active from cached testing capabilities.
**Scope**: PR 2 / Work Unit 2 only — dashboard `money_by_container` savings attribution and backend dashboard tests. Frontend selector/UX remains intentionally out of scope.
**Final Verdict**: **PASS**

## Completeness

| Area | Status | Evidence |
|---|---|---|
| PR2 dashboard tasks | Complete | Tasks 3.1-3.3 and 5.2 are checked in `openspec/changes/savings-goals-use-places/tasks.md`. |
| PR1 backend/API dependency | Complete | Prior report `verify-report-pr1-backend.md` passed; savings transaction `container_id` contract exists for dashboard attribution. |
| Frontend scope | Out of scope | Tasks 4.1-4.4 and 5.3 remain unchecked for PR3. |

## Build / Test / Coverage Evidence

| Command | Result | Notes |
|---|---:|---|
| `go test -count=1 ./internal/handlers/dashboard -run 'TestQueryMoneyByContainerIncludesSignedSavingsLegs|TestGetSummaryAppliesSavingsDeltasOnlyToMoneyByContainer'` | PASS | Focused PR2 dashboard savings attribution tests. |
| `go test -count=1 ./internal/handlers/dashboard ./internal/handlers/savings_goals` | PASS | Required focused dashboard + savings-goals backend suite. |
| `go test -count=1 ./internal/handlers/...` | PASS | Broader handler regression suite; existing income/expense/place transfer behavior remains intact. |
| `go test -count=1 -cover ./internal/handlers/dashboard ./internal/handlers/savings_goals` | PASS | Dashboard coverage 60.1%; savings_goals coverage 58.2%. |

## Spec Compliance Matrix

| Requirement / Scenario | Status | Runtime Test Evidence | Source Evidence |
|---|---|---|---|
| `money_by_container` includes migration-forward assigned savings movements | COMPLIANT | `TestQueryMoneyByContainerIncludesSignedSavingsLegs` passed. | `summary.go` adds a `savings_goal_transactions` `UNION ALL` leg joined through `savings_goals` scoped by account. |
| Assigned savings deposit decreases the place balance | COMPLIANT | Focused test asserts SQL includes `WHEN transaction_type = 'deposit' THEN -sgt.amount`; passed. | `queryMoneyByContainer` signed CASE applies negative deposit leg. |
| Assigned savings withdrawal increases the place balance | COMPLIANT | Focused test asserts SQL includes `WHEN transaction_type = 'withdrawal' THEN sgt.amount`; passed. | `queryMoneyByContainer` signed CASE applies positive withdrawal leg. |
| Null/unassigned savings movements are not guessed into places | COMPLIANT | `TestQueryMoneyByContainerIncludesSignedSavingsLegs` and `TestGetSummaryAppliesSavingsDeltasOnlyToMoneyByContainer` passed with nil-container row/unassigned bucket. | Dashboard groups by `sgt.container_id`; null remains null and `buildMoneyByContainerBreakdown` exposes an unassigned bucket. |
| Legacy `saved_in` text is not used for dashboard attribution | COMPLIANT | Covered indirectly by PR2 SQL tests and PR1 no-guess compatibility tests; focused dashboard tests passed. | `summary.go` does not reference `saved_in`; attribution uses only `sgt.container_id`. |
| Income/expense/P&L/current balance totals remain unchanged by money-by-container attribution | COMPLIANT | `TestGetSummaryAppliesSavingsDeltasOnlyToMoneyByContainer` passed. | Savings attribution is isolated to `queryMoneyByContainer`; income/expense/current-balance queries remain separate. |
| Existing income/expense/place transfer behavior remains intact | COMPLIANT | Existing dashboard tests passed, including transfer-neutral totals and canceled transfer exclusion. | Existing transfer legs still filter `pt.deleted_at IS NULL`; broader handler suite passed. |

## Correctness Table

| Check | Status | Evidence |
|---|---|---|
| Account scoping | PASS | Savings attribution joins `savings_goals` and filters `sg.account_id = $1`. |
| Deposit/withdrawal sign | PASS | SQL CASE signs deposits negative and withdrawals positive; focused test regex covers both branches. |
| No legacy guessing | PASS | No `saved_in` reference appears in dashboard code. |
| Null handling | PASS | Null `container_id` rows remain nil and are rendered as `is_unassigned`. |
| Regression safety | PASS | Required focused tests and broader `./internal/handlers/...` passed. |

## Design Coherence

| Design Decision | Status | Notes |
|---|---|---|
| Add signed savings movement legs to `queryMoneyByContainer` | Aligned | Implemented as a new `UNION ALL` movement source. |
| Keep null movement unassigned | Aligned | Null `sgt.container_id` is not mapped to a place. |
| Do not use `saved_in` for attribution | Aligned | Dashboard SQL does not query `saved_in`. |
| Leave income/expense/P&L queries unchanged | Aligned | Existing total queries remain separate from the money-by-container query. |
| Keep frontend selector out of PR2 | Aligned | No frontend files are part of this slice. |

## TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Apply-progress includes a TDD Cycle Evidence table with PR2 dashboard rows. |
| All PR2 tasks have tests | ✅ | Tasks 3.1/3.2 and 3.3/5.2 map to `backend/internal/handlers/dashboard/summary_test.go`. |
| RED confirmed (tests exist) | ✅ | Reported dashboard test file exists and contains the named focused tests. |
| GREEN confirmed (tests pass) | ✅ | Focused PR2 dashboard tests and required suites passed during verification. |
| Triangulation adequate | ✅ | Coverage includes assigned deposit, assigned withdrawal, null unassigned movement, totals neutrality, transfer regression, and canceled transfer exclusion. |
| Safety Net for modified files | ✅ | Apply-progress reports dashboard safety-net run before edits; current regression suites pass. |

**TDD Compliance**: 6/6 checks passed.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|------:|------:|-------|
| Unit / unit-ish handler query | 1 PR2-focused test | 1 | Go `testing`, `pgxmock` |
| Handler integration | 1 PR2-focused test | 1 | Go `testing`, `httptest`, `gin`, `pgxmock` |
| E2E | 0 | 0 | Not used for this backend slice |
| **Total** | **2 PR2-focused tests** | **1** | |

## Changed File Coverage

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `backend/internal/handlers/dashboard/summary.go` | Package 60.1% | n/a | Package-level Go coverage only | ⚠️ Informational |
| `backend/internal/handlers/dashboard/summary_test.go` | n/a | n/a | Test file | ➖ |

**Average changed file coverage**: package-level coverage only; no per-file coverage parser was run.

## Assertion Quality

**Assertion quality**: ✅ All PR2 assertions verify real behavior. No tautologies, ghost loops, type-only assertions, or smoke-only checks were found in the PR2 tests.

## Quality Metrics

**Linter**: ➖ Not run; no changed-file linter capability was identified for this verification.
**Type Checker**: ✅ Covered by `go test` compile/type-check for focused and broader handler packages.

## Issues

### CRITICAL

None.

### WARNING

None for the PR2 dashboard/backend slice.

### SUGGESTION

1. Keep PR3 frontend selector/UX verification separate so this dashboard slice remains reviewable and aligned with the chained PR plan.

## Verdict

**PASS** — PR2 dashboard/backend slice is compliant. Runtime tests passed for focused dashboard savings attribution, required backend packages, broader handler regression coverage, and coverage execution. Source inspection confirms savings attribution uses only `savings_goal_transactions.container_id`, preserves unassigned/null behavior, avoids legacy `saved_in` guessing, and leaves dashboard totals logic unchanged.
