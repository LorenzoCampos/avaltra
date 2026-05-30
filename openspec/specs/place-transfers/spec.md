# place-transfers Specification

## Purpose

Define dedicated, active-account-scoped transfer behavior for moving money between places without creating income/expense side effects.

## Requirements

### Requirement: Dedicated Transfer Record
The system MUST persist a place-to-place transfer as a dedicated transfer record and MUST NOT represent it as fake income or expense rows.

#### Scenario: Transfer persists as transfer entity
- GIVEN an active account user submits a valid transfer
- WHEN the transfer is created
- THEN the system SHALL store one transfer record with source place, destination place, amount, and date
- AND no synthetic income or expense transaction SHALL be created

### Requirement: Active Account and Place Ownership Validation
The system MUST scope transfers to the active account. Source and destination places MUST both belong to that active account and MUST be distinct places.

#### Scenario: Cross-account place is rejected
- GIVEN a request where one place belongs to a different account
- WHEN validation runs
- THEN the system SHALL reject the transfer
- AND an invalid-place-account error SHALL be returned

#### Scenario: Same source and destination is rejected
- GIVEN a request where source place equals destination place
- WHEN validation runs
- THEN the system SHALL reject the transfer
- AND a source-destination-must-differ error SHALL be returned

### Requirement: Currency Policy for V1
The system MUST support same-currency transfers only in v1. Currency conversion MAY be added later and is out of scope for this change.

#### Scenario: Currency mismatch is rejected
- GIVEN source and destination places with different detectable currencies
- WHEN validation runs
- THEN the system SHALL reject the transfer
- AND a currency-mismatch-not-supported error SHALL be returned

### Requirement: Balance and Reporting Effects
For a persisted transfer, the system MUST decrease source place balance and MUST increase destination place balance by the same amount. Transfer operations MUST NOT change income totals, expense totals, or P&L totals.

#### Scenario: Money moves between places only
- GIVEN a valid transfer of amount A between two active places
- WHEN dashboard balances are calculated
- THEN source balance SHALL decrease by A and destination balance SHALL increase by A
- AND account-level income/expense/P&L totals SHALL remain unchanged

### Requirement: Missing Place Validation
The system MUST reject transfer creation when source place or destination place is missing or inactive.

#### Scenario: Missing destination place is rejected
- GIVEN a request without destination place
- WHEN validation runs
- THEN the system SHALL reject the transfer
- AND a destination-place-required error SHALL be returned
