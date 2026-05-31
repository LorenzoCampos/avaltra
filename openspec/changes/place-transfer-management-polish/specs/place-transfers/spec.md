# Delta for place-transfers

## ADDED Requirements

### Requirement: Soft-Cancel Transfer Management

The system MUST allow canceling an existing transfer through a soft-cancel action and MUST NOT hard-delete transfer records.

#### Scenario: User cancels an active transfer
- GIVEN an active-account user and an existing active transfer in that account
- WHEN the user requests cancel for that transfer
- THEN the system SHALL mark the transfer as canceled and keep it as an auditable record
- AND future transfer effects for that record SHALL be excluded from money movement calculations

#### Scenario: Cancel is idempotent
- GIVEN a transfer that is already canceled
- WHEN the user requests cancel again
- THEN the system SHALL return a successful no-op outcome

### Requirement: Transfer Correction Policy

The system MUST define transfer correction as cancel-and-recreate. The system MUST NOT support edit-in-place for transfer amount, source, destination, or date in this change.

#### Scenario: User needs to correct a wrong transfer
- GIVEN a user identifies a wrong transfer
- WHEN the user follows transfer correction guidance
- THEN the system SHALL require canceling the wrong transfer and creating a new transfer

## MODIFIED Requirements

### Requirement: Balance and Reporting Effects
For a persisted active transfer, the system MUST decrease source place balance and MUST increase destination place balance by the same amount. Canceled transfers MUST NOT affect money-by-container balances. Transfer operations (active or canceled) MUST NOT change income totals, expense totals, or P&L totals.

(Previously: all persisted transfers affected source/destination balances; canceled-state exclusion was not defined.)

#### Scenario: Money moves between places only
- GIVEN a valid active transfer of amount A between two active places
- WHEN dashboard balances are calculated
- THEN source balance SHALL decrease by A and destination balance SHALL increase by A
- AND account-level income/expense/P&L totals SHALL remain unchanged

#### Scenario: Canceled transfer has no balance effect
- GIVEN a transfer of amount A that was later canceled
- WHEN money-by-container and totals are recalculated
- THEN source and destination balances SHALL NOT include that canceled transfer effect
- AND income/expense/P&L totals SHALL remain unchanged
