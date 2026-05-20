## Exploration: recurring-payment-context

### Current State
- Recurring templates (`recurring_expenses`, `recurring_incomes`) currently store recurrence, category/family, and multicurrency fields, but **no normalized payment context** (`container/instrument`) in schema or handlers.
- Daily generation jobs (`backend/pkg/scheduler/recurring_expenses.go`, `recurring_incomes.go`) read templates and insert new `expenses`/`incomes` rows, but currently insert no payment context fields.
- One-time expense/income flows already support normalized payment context with validation helpers (`backend/internal/handlers/{expenses,incomes}/payment_context.go`) and DB columns added by migration `023_create_payment_containers.up.sql` on `expenses`/`incomes`.
- Recurring update handlers already document the key rule: template edits affect only future generated rows; historical rows are preserved (`note` in both update handlers).
- Payment context management UI (`PaymentContainersPage.tsx`) currently shows create/edit forms inline above the lists, which differs from the card/list-driven pattern used in other app sections.
- Localization is partial: page labels use i18n keys, but there are still hardcoded English strings in payment context form submission validation and mutation toasts.

### Affected Areas
- `backend/migrations/013_create_recurring_expenses.up.sql` — recurring expense template schema currently lacks source container/instrument FKs.
- `backend/migrations/016_create_recurring_incomes.up.sql` — recurring income template schema currently lacks destination container/instrument FKs.
- `backend/internal/handlers/recurring_expenses/{create.go,update.go,get.go,list.go}` — request/response + persistence for template payment context fields.
- `backend/internal/handlers/recurring_incomes/{create.go,update.go,get.go,list.go}` — same for recurring incomes.
- `backend/pkg/scheduler/{recurring_expenses.go,recurring_incomes.go}` — template read model + generated transaction insert must copy template payment context into newly generated rows.
- `backend/internal/handlers/{expenses,incomes}/payment_context.go` — likely reusable validation logic/pattern to mirror for recurring handlers.
- `frontend/src/types/{recurringExpense.ts,recurringIncome.ts}` — recurring contracts need payment context fields.
- `frontend/src/features/recurring-expenses/RecurringExpenseForm.tsx` — add source container/instrument selectors and edit hydration.
- `frontend/src/features/recurring-incomes/RecurringIncomeForm.tsx` — add destination container/instrument selectors and edit hydration.
- `frontend/src/hooks/{useRecurringExpenses.ts,useRecurringIncomes.ts}` — payload typing and UX messages for recurring flows.
- `frontend/src/features/payment-containers/PaymentContainersPage.tsx` — restructure UX (create CTA + separate edit flow/modal/view).
- `frontend/src/features/payment-containers/{ContainerForm.tsx,InstrumentForm.tsx,formSubmissions.ts}` — adjust form mounting strategy and remove hardcoded English validation strings.
- `frontend/src/hooks/{usePaymentContainers.ts,usePaymentInstruments.ts}` — localize hardcoded English toast messages.
- `frontend/src/i18n/locales/{es,en}/navigation.json` (+ likely `common` namespace additions) — support new CTA/edit modal text and translated error/toast keys.

### Approaches
1. **Single integrated SDD change, two PR slices (domain first, UX second)** — keep one change (`recurring-payment-context`) but split implementation delivery.
   - Pros: One coherent feature narrative; recurring domain and management UX both requested together; easier SDD traceability.
   - Cons: Still broad; requires strict slice boundaries to keep review load manageable.
   - Effort: Medium.

2. **Two separate SDD changes** — one for recurring payment context, another for payment management UX/i18n.
   - Pros: Maximum separation of concerns and independent release timing.
   - Cons: Extra orchestration overhead; duplicates context/spec editing; user asked as one intent bundle.
   - Effort: Medium-High process overhead.

### Recommendation
Use **Approach 1**: keep a single SDD change with **two chained PR slices** under the same change.

- **Slice A (backend + recurring forms/types):** add recurring template payment context schema/handlers/scheduler propagation and recurring form selectors.
- **Slice B (payment context management UX + localization):** refactor management page to app-consistent pattern (create button, separate edit surface) and remove hardcoded English UI/toast/validation text.

This keeps a unified business outcome while reducing reviewer risk and avoiding a monolithic PR.

### Risks
- **Migration/compat risk:** adding nullable FK columns to recurring templates must preserve existing templates and backward-compatible API payloads.
- **Rule drift risk:** recurring handlers may implement payment-context validation differently from expenses/incomes unless shared patterns are reused.
- **Generation consistency risk:** scheduler must copy template context only at generation time; wrong query/update strategy could accidentally backfill historical rows.
- **UX scope creep risk:** payment management redesign can expand quickly (navigation, modal infra, responsive behavior) unless constrained to create/edit affordance and localization parity.
- **Test coverage risk:** recurring handlers/scheduler currently have limited explicit payment-context tests; regression risk is high without targeted tests.

### Ready for Proposal
Yes — enough code-level evidence exists to draft proposal/spec/design/tasks.

Key domain rule to codify in next phase:
- **Future-only propagation:** changing recurring template payment context MUST affect only occurrences generated after the update timestamp; previously generated `expenses`/`incomes` rows MUST remain unchanged.

Likely spec impact:
- **Extend existing capability:** `openspec/specs/payment-containers/spec.md` with recurring-template payment context behavior + management UX consistency/localization requirement updates.
- **Potential new capability (recommended if clarity needed):** `recurring-payment-context` for template-specific future-only generation semantics and recurring selector behavior.
