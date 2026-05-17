# Design: Money Format Dual Currency

## Technical Approach

Implement a frontend-only shared money display layer for `transaction-money-display`. The layer will map i18next language to an explicit `Intl.NumberFormat` locale (`es` → `es-AR`, `en` → `en-US`) and expose helpers/components used by dashboard/home, activity, expenses, and incomes. Transaction rows will render account-currency value from `amount_in_primary_currency` first, and original `amount`/`currency` second only when it differs from the active account currency.

## Architecture Decisions

| Decision | Choice | Alternatives / Tradeoff | Rationale |
|---|---|---|---|
| Central formatter | Replace `formatCurrency` in `frontend/src/lib/utils.ts` with locale-aware `Intl.NumberFormat`; add a hook wrapper for React language access. | Passing locale manually everywhere is explicit but noisy. Reading i18n globally in utility is simpler but less testable. | Keeps one pure formatter contract and lets views derive language through `useTranslation()`/hook. |
| Dual display component | Create `MoneyAmountDisplay` in `frontend/src/components/MoneyAmountDisplay.tsx`. | Inline JSX per screen is faster initially but repeats mismatch rules. | One component prevents future divergence and preserves per-view color/sign classes through props. |
| Account currency source | Use `activeAccount.currency`, with dashboard `primary_currency || activeAccount.currency`. Activity summaries use active account currency. | Inferring from transaction list fails on empty pages. | Matches spec: active account currency is implicit summary currency when payload lacks explicit currency. |
| Scope boundary | Do not touch payment method, savings goal edit, backend DTOs, or export formatting. | Broader cleanup would reduce more formatting drift but raises review risk. | User explicitly excluded those surfaces; existing DTO fields satisfy the requirement. |

## Data Flow

```text
i18next.language ──→ useMoneyFormatter() ──→ formatMoney(amount,currency,language)
activeAccount.currency ───────────────┐
transaction amount fields ────────────┴──→ MoneyAmountDisplay → row/card UI
```

For mismatches: `primary = amount_in_primary_currency + accountCurrency`; `secondary = amount + transaction.currency`. For same-currency: render only `amount` in that currency or equivalent single primary value; avoid duplicate lines.

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/src/lib/utils.ts` | Modify | Add pure `formatCurrency(amount, currency, options)` using explicit locale, fixed two decimals, and existing `Currency` type. |
| `frontend/src/hooks/useMoneyFormatter.ts` | Create | React hook reading active language and returning `formatMoney`. |
| `frontend/src/components/MoneyAmountDisplay.tsx` | Create | Shared primary/secondary transaction amount renderer with sign and className props. |
| `frontend/src/features/activity/components/ActivityFeed.tsx` | Modify | Remove hook-local formatter import, use active account currency for summary cards and dual display for activity cards. |
| `frontend/src/hooks/useActivity.ts` | Modify | Delete duplicated hardcoded `es-AR` `formatCurrency`; keep data hook/type helpers. |
| `frontend/src/features/expenses/ExpenseList.tsx` | Modify | Replace `toLocaleString(undefined)` desktop/mobile amount cells with shared dual display. |
| `frontend/src/features/incomes/IncomeList.tsx` | Modify | Same as expenses, with income color/sign semantics. |
| `frontend/src/features/dashboard/Dashboard.tsx` | Modify | Use shared formatter for totals/categories and dual display for top expenses and recent transactions. |
| `frontend/src/lib/utils.test.ts` | Create/Modify | Unit coverage for `es`/`en`, fixed decimals, and currency codes. |
| `frontend/src/components/MoneyAmountDisplay.test.tsx` | Create | Same-currency single line and mismatch two-line rendering. |

## Interfaces / Contracts

```ts
type Currency = 'ARS' | 'USD' | 'EUR';
formatCurrency(amount: number, currency: Currency, opts?: { language?: string }): string;

interface MoneyAmountDisplayProps {
  amount: number;
  currency: Currency;
  accountCurrency: Currency;
  amountInAccountCurrency: number;
  sign?: '+' | '-';
  primaryClassName?: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `500000.4` formats as `500.000,40` for `es` and `500,000.40` for `en`. | Vitest against pure formatter; assert numeric separators while allowing symbol/code placement. |
| Component | Same currency renders one amount; mismatch renders account value plus original value. | React/Vitest component tests for `MoneyAmountDisplay`. |
| Integration | Target views call shared formatter path and preserve signs/colors. | Focused tests where existing harness exists; otherwise typecheck/build plus component tests. |

## Migration / Rollout

No migration required. Roll out on `feat/money-format-dual-currency` as one PR; expected review size is moderate and below high-risk threshold if implementation stays scoped.

## Open Questions

None blocking.
