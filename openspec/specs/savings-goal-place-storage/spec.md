# savings-goal-place-storage Specification

## Purpose

Define place-based storage for savings goals using validated container references, phased legacy compatibility, and explicit unassigned historical movement.

## Requirements

### Requirement: Validated Place Reference for Savings Goals
The system MUST allow each savings goal to reference an active-account place/container via a nullable place identifier. Free-text `saved_in` SHALL be treated as legacy compatibility metadata during this change.

#### Scenario: Create or update with valid place
- GIVEN an active-account user submits a savings goal with a place identifier
- WHEN the place belongs to the active account and is active
- THEN the savings goal SHALL persist that place reference

#### Scenario: Invalid place is rejected
- GIVEN a savings goal create/update references missing, inactive, or cross-account place
- WHEN validation runs
- THEN the system SHALL reject the request and SHALL NOT persist guessed mapping from legacy `saved_in`

### Requirement: Legacy Compatibility Without Unsafe Backfill
The system MUST keep legacy `saved_in` readable during migration and MUST NOT guess historical place mapping from free text.

#### Scenario: Legacy row remains readable
- GIVEN a savings goal created before place references existed
- WHEN the goal is returned in read/list responses
- THEN legacy location context SHALL remain readable for compatibility

#### Scenario: Ambiguous legacy text is not auto-mapped
- GIVEN legacy `saved_in` text with no deterministic place match
- WHEN migration or runtime compatibility logic runs
- THEN the system SHALL keep place reference unassigned

### Requirement: Exact Forward Attribution and Historical Unassigned Movement
Savings deposits and withdrawals created after migration MUST store exact place attribution. Historical savings movement without place linkage MUST be represented as unassigned historical movement.

#### Scenario: Migration-forward deposit/withdrawal is place-attributed
- GIVEN a migrated savings goal operation creates a new savings movement
- WHEN the movement is persisted
- THEN the movement SHALL include exact place attribution used by the operation

#### Scenario: Historical unlinked movement stays unassigned
- GIVEN savings movement records created before place attribution existed
- WHEN place-ledger or dashboard summaries are computed
- THEN those records SHALL contribute only to unassigned historical savings movement
