# payment-containers Specification

## Purpose

Define normalized payment containers and instruments, optional transaction linkage, and v1 compatibility with legacy `payment_method`.

## Requirements

### Requirement: Container and Instrument Domain Model
The system MUST model money containers separately from payment instruments. A container SHALL represent where money is held; an instrument SHALL represent how money is moved. A financial institution MAY be linked to either entity.

#### Scenario: Create separate entities
- GIVEN a user manages payment context
- WHEN they create a bank account and a debit card
- THEN the bank account SHALL be stored as a container
- AND the debit card SHALL be stored as an instrument

### Requirement: Optional Single Association per Transaction in V1
Expense and income transactions MAY reference zero or one normalized association set in v1. The system MUST NOT support split payments (multiple containers or instruments per single transaction).

#### Scenario: Transaction without normalized links
- GIVEN a user creates an expense with only legacy method
- WHEN the expense is saved
- THEN container and instrument references SHALL remain null
- AND the transaction SHALL be accepted

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
Expense and income forms SHALL provide optional container and optional instrument selectors. Expense flows SHOULD prioritize source-container language; income flows SHOULD prioritize destination-container language.

#### Scenario: Optional form selection
- GIVEN a user fills an income form
- WHEN they leave container/instrument blank
- THEN submission SHALL still be allowed
- AND legacy method behavior SHALL remain available

### Requirement: Activity and Transaction Detail Display
Activity/list/detail views MUST show normalized container/instrument labels when present, and SHALL fallback to legacy `payment_method` labeling when normalized data is absent.

#### Scenario: Display fallback precedence
- GIVEN a transaction with null normalized links and `payment_method="digital_wallet"`
- WHEN activity renders the row
- THEN the row SHALL display legacy payment method context
- AND no empty normalized label placeholders SHALL be shown

### Requirement: Mini Breakdown by Money Location
Dashboard/home MUST expose a compact breakdown of money by container/location for v1. The breakdown SHOULD support container type grouping and MUST tolerate partial unmigrated data.

#### Scenario: Mixed migrated and unmigrated data
- GIVEN some transactions have normalized links and some do not
- WHEN the mini breakdown is rendered
- THEN linked amounts SHALL be grouped by container/location
- AND unmapped amounts SHALL be included in an explicit unknown/unassigned bucket

### Requirement: Importer Backward Compatibility
Importer flows MUST continue accepting existing legacy medium aliases and mapping to `payment_method`. Importer MAY additionally attach normalized links when deterministic mappings are available.

#### Scenario: Unknown medium still validated by legacy rules
- GIVEN an imported row with unmapped medium text
- WHEN import validation runs
- THEN behavior SHALL match legacy unsupported-payment-method handling
- AND existing import safety guarantees SHALL remain unchanged

### Requirement: Explicit V1 Non-Goals
V1 MUST NOT include split payments, detailed institution/instrument reports, required transaction association, transfer/reconciliation features, or card-held balances (except potential future prepaid modeling).

#### Scenario: Out-of-scope report request
- GIVEN a request for institution-level detailed reporting
- WHEN v1 capability scope is evaluated
- THEN the feature SHALL be marked out of scope
- AND no v1 requirement SHALL claim support for it
