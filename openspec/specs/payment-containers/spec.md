# payment-containers Specification

## Purpose

Define normalized payment containers with soft-deprecated instruments, place-first transaction context, and v1 compatibility with legacy `payment_method`.

## Requirements

### Requirement: Container and Instrument Domain Model
The system MUST treat containers/places as the primary payment context. A container SHALL represent where money is held, came from, or arrived. Instruments SHALL be soft-deprecated: they MAY remain stored/read for compatibility but MUST NOT be required for primary create/edit flows.

(Previously: containers and instruments were co-primary concepts for transaction context.)

#### Scenario: Primary flow stores place-only context
- GIVEN a user creates an expense or income from current UI/API contracts
- WHEN the transaction is validated and saved
- THEN the system SHALL persist container/place context as the primary association
- AND instrument context SHALL be optional legacy compatibility only

#### Scenario: Legacy instrument-backed rows remain readable
- GIVEN an existing transaction has only instrument linkage
- WHEN activity or detail views render it
- THEN the row SHALL remain readable
- AND label fallback SHALL use instrument or legacy method when place is absent

### Requirement: Optional Single Association per Transaction in V1
Expense and income transactions MAY reference zero or one normalized association set in v1 for legacy and importer-compatible records. The system MUST require one active place/container for manual one-time expense and income create/update, including quick-add expense. The system MUST NOT support split payments.

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

#### Scenario: Split payment is rejected
- GIVEN a payload with two instruments for one expense
- WHEN validation runs
- THEN the system SHALL reject the payload
- AND return a split-payment-not-supported error

### Requirement: Card Backing Container Rule
In v1, card-type instruments MUST reference a backing container and MUST NOT carry independent balances. Prepaid card balance behavior is out of scope.

#### Scenario: Card requires backing container
- GIVEN a user creates a credit card instrument
- WHEN no backing container is provided
- THEN creation SHALL be rejected
- AND a backing-container-required error SHALL be returned

### Requirement: Legacy `payment_method` Compatibility and Gradual Migration
The system MUST continue to accept and return legacy `payment_method` during migration. New normalized links SHALL be additive, and the system MUST NOT require historical backfill before rollout.

#### Scenario: Legacy-only client compatibility
- GIVEN a client sends only `payment_method`
- WHEN create/update endpoints process the request
- THEN the transaction SHALL succeed
- AND normalized references MAY remain null

### Requirement: Container and Instrument Management UX
The system MUST provide CRUD management for containers and instruments, including activation status and relationship editing (instrument-to-container), without forcing immediate transaction remapping.

#### Scenario: Deactivate referenced instrument
- GIVEN an instrument already used by transactions
- WHEN the user deactivates it
- THEN existing transaction history SHALL remain readable
- AND new selection lists SHALL exclude the inactive instrument

### Requirement: Transaction Form Selection Behavior
Expense and income forms SHALL provide a primary place/container selector only. Expense flows SHOULD phrase context as source place; income flows SHOULD phrase context as destination place. Instrument selectors MUST NOT appear in primary UX. Submission MUST require an active place, and backend validation MUST enforce this requirement (frontend-only checks are insufficient).

(Previously: forms offered optional container and optional instrument selectors.)

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

### Requirement: Activity and Transaction Detail Display
Activity/list/detail views MUST prefer normalized place/container labels. When place data is absent on legacy rows, the system SHALL fallback to instrument label and then legacy `payment_method` label to avoid blank context.

(Previously: display used normalized container/instrument labels and only then legacy `payment_method`.)

#### Scenario: Fallback precedence avoids broken labels
- GIVEN a legacy row without place but with instrument or payment_method data
- WHEN the row is rendered
- THEN the UI SHALL show the best available non-empty fallback label
- AND no empty payment-context placeholder SHALL be shown

### Requirement: Mini Breakdown by Money Location
Dashboard/home MUST expose a compact breakdown of money by container/location for v1. The breakdown SHOULD support container type grouping and MUST tolerate partial unmigrated data.

#### Scenario: Mixed migrated and unmigrated data
- GIVEN some transactions have normalized links and some do not
- WHEN the mini breakdown is rendered
- THEN linked amounts SHALL be grouped by container/location
- AND unmapped amounts SHALL be included in an explicit unknown/unassigned bucket

### Requirement: Importer Backward Compatibility
Importer flows MUST preserve legacy alias handling, and SHOULD map incoming context to a place/container when a deterministic match exists. If deterministic place mapping is unavailable, importer SHALL preserve legacy compatibility behavior without breaking ingestion.

(Previously: importer centered on `payment_method` and only optionally attached normalized links.)

#### Scenario: Deterministic place mapping is preferred
- GIVEN an imported row with a medium alias that uniquely matches a place
- WHEN import normalization runs
- THEN the transaction SHALL attach that place/container context
- AND legacy behavior SHALL remain available for non-deterministic rows

### Requirement: Explicit V1 Non-Goals
This change MUST NOT implement transfers between places, credit/debt/cards/cuotas/resumen modeling, split payments, or physical schema removal/backfill of instrument data.

(Previously: v1 non-goals excluded split payments and reporting/reconciliation features but did not explicitly lock these future financial scopes.)

#### Scenario: Future-scope request handling
- GIVEN a request for transfers or card/cuotas behavior
- WHEN scope is evaluated for this change
- THEN the request SHALL be marked out of scope
- AND no requirement in this change SHALL claim support
