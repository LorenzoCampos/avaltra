# transaction-money-display Specification

## Purpose

Define consistent, locale-aware money rendering and dual-currency transaction display across core transaction views.

## Requirements

### Requirement: Locale-Aware Money Format by Active Language

The system MUST format monetary values using the active app language, mapping `es` to Spanish numeric style (`500.000,40`) and `en` to English numeric style (`500,000.40`), with exactly two fraction digits.

#### Scenario: Spanish formatting
- GIVEN active language is `es`
- WHEN an amount like `500000.4` is rendered
- THEN the numeric output SHALL follow Spanish grouping and decimal separators
- AND the rendered value SHALL be equivalent to `500.000,40` (currency symbol placement MAY vary by UI context)

#### Scenario: English formatting
- GIVEN active language is `en`
- WHEN an amount like `500000.4` is rendered
- THEN the numeric output SHALL follow English grouping and decimal separators
- AND the rendered value SHALL be equivalent to `500,000.40` (currency symbol placement MAY vary by UI context)

### Requirement: Centralized Formatter for Target Views

The system MUST use one centralized formatter contract for money rendering in dashboard/home, activity, expenses, and incomes. These views MUST NOT apply raw, screen-local formatting that can diverge from the centralized behavior.

#### Scenario: Shared formatter used across views
- GIVEN the target views render transaction money
- WHEN money values are displayed
- THEN each target view SHALL resolve formatted strings through the centralized formatter path
- AND outputs across views SHALL remain consistent for equal inputs

### Requirement: Dual-Currency Display on Currency Mismatch

For activity, expenses, incomes, and dashboard/home transaction entries, when transaction currency differs from account currency, the system MUST render two values: primary account-currency equivalent and secondary original transaction amount.

#### Scenario: Mismatched currency transaction
- GIVEN a transaction with `currency != accountCurrency`
- WHEN the transaction row/card is rendered in a target view
- THEN the primary money line SHALL show `amount_in_primary_currency` in `accountCurrency`
- AND a secondary line SHALL show original `amount` in original `currency`

### Requirement: No Redundant Dual Display for Same Currency

When transaction currency matches account currency, the system MUST render a single amount and MUST NOT show a duplicate secondary currency line.

#### Scenario: Same-currency transaction
- GIVEN a transaction with `currency == accountCurrency`
- WHEN the transaction row/card is rendered in a target view
- THEN only one money amount SHALL be shown
- AND no secondary original-currency line SHALL be rendered

### Requirement: Active Account Currency as Implicit Summary Currency

Where API summary payloads do not provide explicit summary currency, the system MUST treat the active account currency as the summary display currency for formatted totals in scope views.

#### Scenario: Summary without explicit currency
- GIVEN a summary value in a scoped view and no explicit summary-currency field
- WHEN the summary is rendered
- THEN the summary SHALL be formatted using the active account currency
- AND the chosen currency SHALL be consistent with account-context transaction rendering

### Requirement: Scope Boundaries and Non-Goals

This change MUST remain frontend-only and MUST NOT alter backend/domain contracts unless required data is missing. The system MUST NOT modify custom wallets/banks/cards/payment-instrument UX or savings goal edit UX as part of this capability.

#### Scenario: Excluded surfaces remain unchanged
- GIVEN wallets/payment instruments and savings goal edit surfaces
- WHEN this capability is implemented
- THEN their behavior and formatting flows SHALL remain unchanged by this change set
- AND no backend schema/API/domain logic change SHALL be required when existing fields satisfy display needs

### Requirement: Payment Context Labels Preserve Money Formatting Rules

When transaction entries include container/instrument context, the system MUST treat those labels as supplemental metadata. Existing money-format and dual-currency rules SHALL remain unchanged.

#### Scenario: Supplemental context on mismatched currency row
- GIVEN a transaction row with currency mismatch and normalized container/instrument labels
- WHEN the row is rendered
- THEN dual-currency rendering SHALL follow existing requirements
- AND container/instrument labels SHALL appear without altering amount formatting

#### Scenario: Legacy fallback still compatible
- GIVEN a transaction row without normalized links and with legacy `payment_method`
- WHEN the row is rendered
- THEN money display SHALL remain governed by existing formatter rules
- AND payment context SHALL fallback to legacy label behavior
