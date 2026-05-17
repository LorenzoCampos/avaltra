## Exploration: money-format-dual-currency

### Current State
- Money formatting is inconsistent across frontend surfaces:
  - `frontend/src/lib/utils.ts` `formatCurrency()` returns `"{symbol} {amount.toFixed(2)}"` (no locale grouping, no locale decimal separator).
  - `frontend/src/hooks/useActivity.ts` has a second `formatCurrency()` hardcoded to `es-AR`.
  - `ExpenseList`/`IncomeList` use raw `toLocaleString(undefined, ...)`, depending on browser locale instead of app language.
- i18n language source is available and stable:
  - `frontend/src/i18n/index.ts` configures `es` and `en`, stores preference in `localStorage.preferred_language`.
  - `frontend/src/features/settings/UserSettings.tsx` updates i18n via `i18n.changeLanguage(selectedLanguage)`.
- Dual-currency data already exists in current DTOs and backend responses:
  - `amount`, `currency`, `amount_in_primary_currency` are present in expense/income/activity/dashboard transaction shapes.
  - Account primary currency is available via `activeAccount.currency` and dashboard also returns `primary_currency`.

### Affected Areas
- `frontend/src/lib/utils.ts` — current shared money formatter needs locale-aware normalization.
- `frontend/src/hooks/useActivity.ts` — duplicate formatter and hardcoded `es-AR`; can cause divergent output.
- `frontend/src/features/dashboard/Dashboard.tsx` — already shows dual for top expenses but not for recent transactions.
- `frontend/src/features/activity/components/ActivityFeed.tsx` — summary cards hardcode `ARS`; item cards show only original amount.
- `frontend/src/features/expenses/ExpenseList.tsx` — table + mobile cards show only original amount; formatting tied to browser locale.
- `frontend/src/features/incomes/IncomeList.tsx` — same inconsistency as expenses.
- `frontend/src/types/{expense.ts,income.ts,dashboard.ts}` and `frontend/src/hooks/{useExpenses.ts,useIncomes.ts,useDashboard.ts,useActivity.ts}` — confirm fields needed for dual display are already present.

### Approaches
1. **Centralized locale-aware formatter + targeted view updates**
   - Build one formatter API driven by active app language (`es`→`es-AR`, `en`→`en-US`) and use it in dashboard/activity/expenses/incomes.
   - Add dual-currency secondary line only when `transaction.currency !== accountCurrency`.
   - Pros: Consistent output, minimal blast radius, aligns with current architecture.
   - Cons: Requires touching multiple UI files and adding a small formatting adapter.
   - Effort: Medium.

2. **Incremental patch per screen (no centralized formatter)**
   - Fix each screen with local `Intl.NumberFormat` calls.
   - Pros: Fastest per-file changes.
   - Cons: Continues drift/duplication; higher long-term maintenance risk.
   - Effort: Low now, high later.

### Recommendation
Use **Approach 1**.

Minimum safe normalization plan:
1. Introduce a single money-format utility/hook that accepts `{ amount, currency, language }` and internally uses `Intl.NumberFormat` (`es-AR` / `en-US`) with fixed 2 decimals.
2. Route current consumers (`lib/utils.formatCurrency`, `useActivity.formatCurrency`, expense/income list amount cells, dashboard cards) through that utility.
3. In activity/expenses/incomes/dashboard recent transactions, render:
   - Primary line: amount in account currency (`amount_in_primary_currency`, with sign/color semantics preserved).
   - Secondary line: original amount (`amount`, `currency`) only if source currency differs from account currency.
4. Keep scope exclusions explicit: no payment instruments wallets/banks/cards UX changes; no savings-goal edit UX changes.

### Risks
- Activity summary currently formats with hardcoded `ARS` and has no explicit `summary_currency` in API; FE must rely on active account currency for display semantics.
- Existing tests may assume old string formats (symbol + fixed decimal) and will need updates.
- There is API/docs drift in `/activity` docs vs handler behavior (docs mention default month, handler currently allows all dates when no filters); not blocking this change but can confuse QA expectations.

### Ready for Proposal
Yes — this appears **frontend-only** for requested scope. Backend already provides required fields (`amount`, `currency`, `amount_in_primary_currency`, account primary currency context).
