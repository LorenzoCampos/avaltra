# Proposal: Money Format Dual Currency

## Intent

Normalize frontend money formatting by app language and make transaction lists show account-currency value plus original-currency value when they differ. This removes browser-locale drift, duplicated helpers, and hardcoded ARS display in transaction surfaces.

## Scope

### In Scope
- Centralize money formatting for `es` as `500.000,40` and `en` as `500,000.40`, with fixed two decimals.
- Show dual-currency transaction display in activity, expenses, incomes, and home/dashboard when transaction currency differs from account currency.
- Preserve existing sign/color semantics while using `amount_in_primary_currency` for account-currency value and `amount`/`currency` for original value.

### Out of Scope
- Backend API, schema, exchange-rate, or DTO changes.
- Custom wallets, banks, cards, and payment-instrument UX.
- Savings goal edit UX and unrelated broad UI redesign.

## Capabilities

### New Capabilities
- `transaction-money-display`: Locale-aware money formatting and dual-currency transaction presentation across core transaction surfaces.

### Modified Capabilities
- None.

## Approach

Add a shared formatter utility/hook driven by i18next language (`es`→`es-AR`, `en`→`en-US`) using `Intl.NumberFormat`. Replace fragmented formatting in `utils`, `useActivity`, expenses, incomes, and dashboard. Add a small display helper/component for transaction amounts: primary line in account currency, secondary line in original currency only when currencies differ.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/lib/utils.ts` | Modified | Normalize shared currency formatter. |
| `frontend/src/hooks/useActivity.ts` | Modified | Remove duplicate/hardcoded ARS formatting. |
| `frontend/src/features/activity/components/ActivityFeed.tsx` | Modified | Fix summary currency and item dual display. |
| `frontend/src/features/expenses/ExpenseList.tsx` | Modified | Use normalized formatter and dual display. |
| `frontend/src/features/incomes/IncomeList.tsx` | Modified | Use normalized formatter and dual display. |
| `frontend/src/features/dashboard/Dashboard.tsx` | Modified | Apply consistent recent-transaction dual display. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Confusing primary/secondary amount order | Medium | Specify account currency as primary and original as secondary only on mismatch. |
| Activity summary has no explicit summary currency | Medium | Use active account currency as display currency; avoid backend changes. |
| Test snapshots/string expectations fail | Low | Update tests around locale-specific output. |

## Rollback Plan

Revert the frontend formatter/display changes and restore previous per-screen formatting. No database or backend rollback is required.

## Dependencies

- Existing frontend i18next language state.
- Existing DTO fields: `amount`, `currency`, `amount_in_primary_currency`, and account primary currency.

## Success Criteria

- [ ] Spanish renders grouped decimal style like `500.000,40`; English renders `500,000.40`.
- [ ] Activity, expenses, incomes, and dashboard show both amounts only when transaction and account currencies differ.
- [ ] Same-currency transactions show a single amount.
- [ ] Excluded payment-instrument and savings-goal edit UX remain unchanged.
