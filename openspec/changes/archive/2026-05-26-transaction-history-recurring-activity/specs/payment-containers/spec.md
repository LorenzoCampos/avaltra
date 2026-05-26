# Delta for payment-containers

## ADDED Requirements

### Requirement: Activity Transaction Navigation Safety
Activity items representing `expense` or `income` transactions MUST navigate to an existing transaction detail/edit destination using type-safe routing with transaction `id`. Activity items of other types MUST NOT navigate to expense/income destinations.

#### Scenario: Expense activity routes to expense destination
- GIVEN an activity item has type `expense` and a valid transaction id
- WHEN the user activates the row
- THEN the UI SHALL navigate to the configured expense destination for that id
- AND navigation SHALL use the expense route contract only

#### Scenario: Income activity routes to income destination
- GIVEN an activity item has type `income` and a valid transaction id
- WHEN the user activates the row
- THEN the UI SHALL navigate to the configured income destination for that id
- AND navigation SHALL use the income route contract only

#### Scenario: Non-transaction activity is guarded
- GIVEN an activity item type is not `expense` or `income`
- WHEN the user activates the row
- THEN the UI SHALL NOT attempt expense/income navigation
- AND interaction SHALL remain safe without broken-route errors
