## Exploration: simplify-payment-context-places

### Current State
- The domain currently models **containers + instruments** (`payment_containers`, `payment_instruments`) and optional legacy `payment_method` fallback (`backend/migrations/023_create_payment_containers.up.sql`, `backend/internal/handlers/expenses/create.go`, `backend/internal/handlers/incomes/create.go`).
- Recurring templates also persist both references and snapshot them into generated transactions (`backend/migrations/024_add_recurring_payment_context.up.sql`, `backend/pkg/scheduler/recurring_expenses.go`, `backend/pkg/scheduler/recurring_incomes.go`).
- Validation logic enforces instrument ownership/activeness and card backing-container compatibility (`backend/internal/transactions/payment_context.go`).
- Frontend form helpers auto-resolve container from selected instrument backing container, which tightly couples UX and payload shaping to instruments (`frontend/src/lib/paymentContext.ts`).
- Dashboard `money_by_container` already computes by container only and has explicit unassigned handling (`backend/internal/handlers/dashboard/summary.go`).
- Activity feed display prioritizes instrument name, then container name, then legacy payment method (`backend/internal/handlers/activity/list.go`, `frontend/src/lib/paymentContext.ts`).
- Importer can map by active container names and active instrument names when the match is unique (`backend/internal/handlers/imports/mapping.go`).

### Affected Areas
- `backend/migrations/023_create_payment_containers.up.sql` — current schema includes instruments and transaction instrument columns.
- `backend/migrations/024_add_recurring_payment_context.up.sql` — recurring template instrument columns.
- `backend/internal/transactions/payment_context.go` — shared validation depends on instrument semantics and backing-container rule.
- `backend/internal/handlers/expenses/*.go` and `backend/internal/handlers/incomes/*.go` — API contracts/read-write paths expose source/destination instrument IDs.
- `backend/internal/handlers/recurring_expenses/*.go` and `backend/internal/handlers/recurring_incomes/*.go` — recurring create/update/list/get include instrument fields.
- `backend/pkg/scheduler/recurring_expenses.go` and `backend/pkg/scheduler/recurring_incomes.go` — generation snapshots instrument IDs into transactions.
- `backend/internal/handlers/dashboard/summary.go` — stable baseline already aligned to places-only (container-based).
- `backend/internal/handlers/imports/mapping.go` and `backend/internal/handlers/imports/commit.go` — importer payment-context mapping and persisted columns include instruments.
- `backend/internal/handlers/activity/list.go` — payment context label prefers instrument over container.
- `frontend/src/lib/paymentContext.ts` — form payload normalization currently revolves around instrument/backing container behavior.
- `frontend/src/features/payment-containers/*` and `frontend/src/types/paymentInstrument.ts` — management UI/types for instrument lifecycle.
- `frontend/src/features/recurring-expenses/RecurringExpenseForm.tsx` and `frontend/src/features/recurring-incomes/RecurringIncomeForm.tsx` — recurring forms include instrument selectors.
- `openspec/specs/payment-containers/spec.md` and `openspec/changes/recurring-payment-context/specs/*` — requirements currently codify containers+instruments.

### Approaches
1. **Hard Cut: remove instruments now (schema + API + UI in one pass)**
   - Pros: Fastest path to final model; zero long-term dual-model burden.
   - Cons: High blast radius (migrations, recurring snapshots, importer, tests, i18n, paused PR2 assumptions); rollback is hard if data/API consumers still reference instrument fields.
   - Effort: High

2. **Soft Deprecation: keep instrument storage temporarily, hide from product flows, write/read places-only**
   - Pros: Safest migration path; preserves backward compatibility while immediately moving UX/domain language to places-only; allows phased cleanup of API/tests/specs; enables low-risk adaptation of recurring and importer.
   - Cons: Temporary model debt (unused columns/tables remain); requires explicit deprecation discipline.
   - Effort: Medium

3. **Compatibility Facade: introduce canonical `place_id` abstraction while internally mapping to current columns**
   - Pros: Clean public contract early; can stage internals later.
   - Cons: Adds translation layer complexity now, plus eventual second migration anyway; over-engineering given current app scope.
   - Effort: Medium-High

### Recommendation
Use **Approach 2 (Soft Deprecation)** as the immediate change strategy.

Why this is the cleanest migration path:
- It aligns with the revised domain immediately (money lives/moves between places) without forcing a risky hard delete.
- Existing persisted data and paused PR2/test branches remain recoverable while we simplify form/API behavior.
- Dashboard `money_by_container` already matches the target mental model, so we can leverage current behavior instead of replacing it.
- We can define clear deprecation boundaries now:
  - **In scope now**: places-only selection in expenses/incomes/recurring forms and handlers, activity labeling preference to container/place, importer mapping priority to place names, spec rewrites to place language.
  - **Out of scope now**: dropping instrument tables/columns and credit-card debt modeling.

Migration shape (recommended):
1) Product/API behavior switch to places-only (instrument optional ignored/hidden).  
2) Remove instrument usage paths and tests from active code paths.  
3) Perform physical schema drop in a later dedicated cleanup change after stability window.

Future-ready context:
- **Transfers between places** should be treated as a future transaction type using two place refs (from_place_id/to_place_id) rather than reintroducing instrument semantics. This informs naming now but is not immediate scope.
- **Credit cards/debt/cuotas/resumen** should remain future scope because they require liabilities, statement cycles, and installment schedules; mixing that now would pollute the places foundation and slow migration.

Delivery strategy and likely PR slicing (ask-on-risk, 400-line guard):
- **PR1 (foundation/domain contract)**: rename UX/API semantics to place-first, keep compatibility fields accepted but non-primary, update shared payment-context logic and activity label precedence.
- **PR2 (forms + recurring + i18n)**: remove instrument selectors from expense/income/recurring UX, adjust frontend normalization helpers, update locale keys/text.
- **PR3 (importer + specs/tests cleanup)**: importer place-only mapping rules, OpenSpec delta updates (`payment-containers` + recurring delta rewrite), regression tests.
- **PR4 (optional later cleanup change)**: physical drop of instrument columns/tables once telemetry/manual validation confirms no dependencies.

### Risks
- Hidden coupling: backend and frontend tests currently assert instrument-specific behaviors and backing-container constraints; partial removal can break many fixtures.
- Import ambiguity risk: importer currently allows unique match among both containers and instruments; place-only can change resolution outcomes for duplicated names.
- Compatibility risk with paused PR2 branch: rebasing may reintroduce instrument assumptions unless explicitly reconciled.
- Data interpretation risk: legacy records with instrument-only context may lose friendly labels if activity fallback precedence is not carefully adjusted.

### Ready for Proposal
Yes — ready for proposal with explicit scope: implement places-only behavior via soft deprecation now, defer physical schema deletion and credit/debt modeling to follow-up changes.
