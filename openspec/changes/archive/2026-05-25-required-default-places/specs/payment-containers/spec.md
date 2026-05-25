# Delta for payment-containers

## MODIFIED Requirements

### Requirement: Optional Single Association per Transaction in V1
Expense and income transactions MAY reference zero or one normalized association set in v1 for legacy and importer-compatible records. The system MUST require one active place/container for manual one-time expense and income create/update, including quick-add expense. The system MUST NOT support split payments.

(Previously: manual and legacy flows could save with zero normalized associations.)

#### Scenario: Manual create/update requires active place
- GIVEN a user submits a manual one-time expense or income create/update
- WHEN container validation runs
- THEN the system SHALL reject missing, inactive, or archived place IDs
- AND return a required-active-place error

#### Scenario: Import-compatible row remains nullable
- GIVEN an imported or legacy-compatible row with unresolved or ambiguous place mapping
- WHEN the transaction is validated for compatibility ingestion
- THEN container and instrument references MAY remain null
- AND ingestion SHALL continue without guessed place assignment

### Requirement: Transaction Form Selection Behavior
Expense and income forms SHALL provide a primary place/container selector only. Expense flows SHOULD phrase context as source place; income flows SHOULD phrase context as destination place. Instrument selectors MUST NOT appear in primary UX. Submission MUST require an active place, and backend validation MUST enforce this requirement (frontend-only checks are insufficient).

(Previously: forms were place-only but did not require active place submission.)

#### Scenario: Place-only selection in primary forms
- GIVEN a user opens expense or income creation
- WHEN payment context is shown
- THEN only place/container selection SHALL be presented
- AND submission SHALL not require instrument selection

#### Scenario: Quick-add cannot bypass required place
- GIVEN a user opens manual quick-add expense
- WHEN no active place is selected
- THEN submission SHALL be blocked
- AND the UI SHALL require choosing an active place before save

#### Scenario: API enforces required place
- GIVEN a manual create/update request bypasses client validation
- WHEN backend validation runs
- THEN the request SHALL be rejected without an active place
- AND enforcement SHALL not depend only on frontend rules
