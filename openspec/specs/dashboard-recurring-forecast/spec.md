# Dashboard Recurring Forecast Specification

## Purpose

Define the dashboard behavior for showing projected recurring expenses for the next calendar month, scoped to the active account.

## Requirements

### Requirement: Summary exposes next-month recurring expense projection

The system MUST expose `next_month_recurring_expense_total` in dashboard summary responses for the active account context.

#### Scenario: Summary includes projected amount

- GIVEN an authenticated request to dashboard summary with a valid `X-Account-ID`
- WHEN next-month recurring expense occurrences exist for that account
- THEN the response includes `next_month_recurring_expense_total`
- AND the value represents projected expenses for the next calendar month only

#### Scenario: No next-month recurring expenses

- GIVEN an authenticated request with a valid `X-Account-ID`
- WHEN no qualifying recurring expenses occur in the next calendar month
- THEN `next_month_recurring_expense_total` is `0`

### Requirement: Projection is active-account scoped

The system MUST scope the projection to the account identified by `X-Account-ID` and MUST NOT aggregate across family/global accounts.

#### Scenario: Active account isolation

- GIVEN recurring templates in multiple accounts
- WHEN summary is requested with `X-Account-ID` for account A
- THEN projected totals include only recurring expenses from account A

#### Scenario: Cross-account data excluded

- GIVEN account B has recurring expenses in the next calendar month
- WHEN summary is requested for account A
- THEN account B expenses are excluded from `next_month_recurring_expense_total`

### Requirement: Projection uses normalized primary-currency amounts

The system MUST compute the projection using normalized amounts in the active account primary currency.

#### Scenario: Mixed-currency recurring templates

- GIVEN qualifying recurring expenses with different source currencies
- WHEN summary is computed
- THEN the total is returned in the active account primary currency using normalized values

#### Scenario: Ineligible recurring templates excluded

- GIVEN recurring templates that are inactive or have no occurrence in the next calendar month
- WHEN summary is computed
- THEN those templates are excluded from `next_month_recurring_expense_total`

### Requirement: Frontend renders backend-provided forecast only

The dashboard UI MUST render a clear recurring-forecast label/insight using the API field and MUST NOT calculate recurrence totals client-side.

#### Scenario: Forecast insight is visible

- GIVEN dashboard summary includes `next_month_recurring_expense_total`
- WHEN the dashboard loads
- THEN users see a labeled recurring-expense forecast value for next calendar month

#### Scenario: No client-side recurrence math

- GIVEN the dashboard receives summary data
- WHEN rendering the recurring forecast insight
- THEN the UI uses only the backend-provided forecast field
- AND no client recurrence-rule aggregation is required for displayed totals
