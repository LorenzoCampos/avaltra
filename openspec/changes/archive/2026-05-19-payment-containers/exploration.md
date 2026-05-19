## Exploration: payment-containers

### Current State
- Backend stores `payment_method` directly on `expenses` and `incomes` as nullable `TEXT` constrained to a fixed enum-like set: `cash`, `bank_transfer`, `debit_card`, `credit_card`, `digital_wallet`, `other` (migration `021_add_payment_method_to_transactions.up.sql`).
- Validation is centralized in `backend/internal/transactions/payment_method.go` and reused by create/update handlers for expenses and incomes.
- Activity timeline includes `payment_method` for income/expense rows, but savings rows always return `NULL` for payment method (`backend/internal/handlers/activity/list.go`).
- Dashboard recent transactions do not include payment method at all (query/DTO omit it in `backend/internal/handlers/dashboard/summary.go`).
- Importer maps raw `MEDIO` to the same coarse catalog via hard-coded aliases (`backend/internal/handlers/imports/mapping.go`), and rejects unknown values as `unsupported_payment_method`.
- Frontend models payment method as a union type with the same six values (`frontend/src/types/paymentMethod.ts`), uses one shared select options list (`frontend/src/lib/paymentMethods.ts`), and applies it in expense/income forms and lists.

### Affected Areas
- `backend/migrations/021_add_payment_method_to_transactions.up.sql` — current DB constraint is flat and non-relational.
- `backend/internal/transactions/payment_method.go` — single catalog and validation entry-point.
- `backend/internal/handlers/expenses/{create.go,update.go,list.go}` — create/update/read surface for expenses.
- `backend/internal/handlers/incomes/{create.go,update.go,list.go}` — create/update/read surface for incomes.
- `backend/internal/handlers/activity/list.go` — timeline API currently exposes one `payment_method` field.
- `backend/internal/handlers/dashboard/summary.go` — recent transactions payload currently cannot show payment/source context.
- `backend/internal/handlers/imports/{mapping.go,types.go,commit.go}` — import mapping, validation, persistence, and fingerprint behavior depend on `payment_method`.
- `frontend/src/types/{paymentMethod.ts,expense.ts,income.ts,importExcelTemplate.ts,dashboard.ts}` — type contracts tied to single payment-method dimension.
- `frontend/src/features/{expenses/ExpenseForm.tsx,incomes/IncomeForm.tsx,expenses/ExpenseList.tsx,incomes/IncomeList.tsx,imports/ImportExcelTemplatePage.tsx,activity/components/ActivityFeed.tsx,dashboard/Dashboard.tsx}` — UI surfaces that render/capture payment context.

### Approaches
1. **Extend current enum with more values**
   - Pros: Lowest migration cost short-term; minimal API breakage.
   - Cons: Keeps semantic ambiguity (container vs instrument), cannot model relationships (card -> backing account/wallet), scales poorly.
   - Effort: Low.

2. **Introduce normalized payment domain (recommended)**
   - Brief: Model separate entities and references:
     - `money_containers` (cash wallet, bank account, fintech wallet; can hold balance)
     - `payment_instruments` (card, bank transfer rail, etc.; may reference `backing_container_id`)
     - transactions store optional `source_container_id`, `destination_container_id`, `instrument_id`, plus legacy `payment_method` during transition.
   - Pros: Resolves domain ambiguity; supports “where money moved” + “what instrument was used”; enables future reconciliation and richer analytics.
   - Cons: Higher schema/API/UI change footprint; requires careful migration and UX decisions.
   - Effort: High.

3. **Hybrid bridge model (incremental)**
   - Brief: Keep legacy `payment_method`, add optional `container_id` + `instrument_id` now, enforce semantics progressively.
   - Pros: Backward compatible rollout; importer/UI can migrate in phases; safer for existing clients.
   - Cons: Temporary dual-write/dual-read complexity and inconsistent data during migration window.
   - Effort: Medium-High.

### Recommendation
Use **Approach 3 as delivery path toward Approach 2 target model**. Define clear domain boundaries now (container vs instrument), add relational references without breaking existing flows, then deprecate coarse `payment_method` once UI/import paths are fully migrated.

Suggested terminology boundaries:
- **Money Container**: entity with balance semantics (cash, bank account, fintech wallet).
- **Payment Instrument**: mechanism used to execute payment/collection (credit/debit card, transfer rail), optionally linked to a container.
- **Financial Institution**: metadata owner/operator (bank/fintech/issuer) for containers/instruments.
- **Card**: instrument; by default no independent balance, except prepaid cards (should be explicit subtype or separate container-backed mode).
- **Transaction linkage**:
  - Expense: usually `source_container_id` + optional `instrument_id`.
  - Income: usually `destination_container_id` + optional `instrument_id`.
  - Transfers (future): both source and destination required.

### Risks
- Migration complexity across backend, importer, and multiple frontend screens may exceed review budget if done in one PR.
- Backward compatibility risk for existing clients/tests expecting `payment_method` only.
- Ambiguous historical records: legacy values like `digital_wallet` can represent either container or instrument context.
- Importer quality risk: current alias map is narrow and hard-coded; richer model increases mapping ambiguity.

### Ready for Proposal
Yes — once product decisions below are confirmed.

### Open Questions (product/domain decisions needed)
1. Should cards be modeled strictly as instruments (no balance) except prepaid cards, or do you want “card with balance” as first-class?
2. For expenses/incomes, do we require container reference at creation time, or keep it optional initially?
3. Should one transaction allow multiple instruments/containers (split tender), or exactly one each for v1?
4. How should existing `payment_method` history be backfilled: heuristic mapping, partial null migration, or user-assisted cleanup?
5. Do we need institution-level reporting in v1 (bank/issuer insights), or only internal linkage for now?
