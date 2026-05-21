# Delta for payment-containers

## MODIFIED Requirements

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

### Requirement: Transaction Form Selection Behavior
Expense and income forms SHALL provide a primary place/container selector only. Expense flows SHOULD phrase context as source place; income flows SHOULD phrase context as destination place. Instrument selectors MUST NOT appear in primary UX.

(Previously: forms offered optional container and optional instrument selectors.)

#### Scenario: Place-only selection in primary forms
- GIVEN a user opens expense or income creation
- WHEN payment context is shown
- THEN only place/container selection SHALL be presented
- AND submission SHALL not require instrument selection

### Requirement: Activity and Transaction Detail Display
Activity/list/detail views MUST prefer normalized place/container labels. When place data is absent on legacy rows, the system SHALL fallback to instrument label and then legacy `payment_method` label to avoid blank context.

(Previously: display used normalized container/instrument labels and only then legacy `payment_method`.)

#### Scenario: Fallback precedence avoids broken labels
- GIVEN a legacy row without place but with instrument or payment_method data
- WHEN the row is rendered
- THEN the UI SHALL show the best available non-empty fallback label
- AND no empty payment-context placeholder SHALL be shown

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
