# Delta for recurring-payment-context

## ADDED Requirements

### Requirement: Recurring Edit Date Hydration Format
Recurring expense and recurring income edit payloads MUST hydrate persisted start/end dates using HTML date-input compatible `YYYY-MM-DD` strings.

#### Scenario: Edit form receives canonical start date
- GIVEN a recurring template has a persisted start date
- WHEN the edit payload is requested
- THEN the payload SHALL include the original start date formatted as `YYYY-MM-DD`
- AND the date input SHALL render the value without client-side re-entry

#### Scenario: End date parity
- GIVEN a recurring template has a persisted end date
- WHEN the edit payload is requested
- THEN the payload SHALL include end date formatted as `YYYY-MM-DD`
- AND the same format contract SHALL apply to both recurring expense and recurring income

#### Scenario: Missing optional dates remain safe
- GIVEN a recurring template omits optional end date
- WHEN the edit payload is requested
- THEN the system SHALL return a null/empty-compatible value
- AND the form SHALL remain editable without format errors
