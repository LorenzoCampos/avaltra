# recurring-payment-context Specification

## Purpose

Define place-first recurring payment templates and generation compatibility with legacy instrument fields.

## Requirements

### Requirement: Optional Template Payment Context
Recurring expense and income templates MUST use optional `container_id` as the primary payment-context input. `instrument_id` MAY be accepted only for legacy compatibility and MUST NOT be required or exposed as primary user input.

(Previously: templates treated optional `container_id` and optional `instrument_id` as co-primary input.)

#### Scenario: Save template with place-only context
- GIVEN a user creates or edits a recurring template
- WHEN they provide only `container_id`
- THEN the template SHALL be saved successfully
- AND primary recurring context SHALL be place/container based

#### Scenario: Legacy payload with instrument remains compatible
- GIVEN an older client sends `instrument_id`
- WHEN the template request is processed
- THEN compatibility handling SHALL preserve request acceptance rules
- AND primary UX/API contracts SHALL still center on `container_id`

### Requirement: Future Occurrence Inheritance by Snapshot
When recurring generation creates a new occurrence, the system MUST copy template place/container context present at generation time. The system MUST NOT require instrument context for new occurrences generated from current place-only templates.

(Previously: generation copied both container and instrument from template context.)

#### Scenario: Generated occurrence inherits place snapshot
- GIVEN a template has container A and no instrument
- WHEN the scheduler generates the next occurrence
- THEN the new transaction SHALL store container A
- AND generation SHALL succeed without instrument data

### Requirement: Template Edit Scope Is Future-Only
Editing recurring template payment context MUST affect only future generated occurrences and MUST NOT mutate already-generated rows.

(Previously: same behavior, now explicitly applied to place-first context.)

#### Scenario: Existing generated rows stay unchanged after place edit
- GIVEN previous occurrences were generated with container A
- WHEN the user updates the template to container C
- THEN existing rows SHALL remain with container A
- AND only later generated rows SHALL use container C

### Requirement: Validation Parity with One-Time Transactions
Recurring template validation MUST follow one-time transaction payment-context rules for place-first flows. Legacy instrument fields MAY be tolerated for compatibility but SHALL NOT redefine primary validation success criteria.

(Previously: parity focused on instrument-container relationship validation as a primary rule.)

#### Scenario: Place-first validation parity
- GIVEN a template payload with valid container context and no instrument
- WHEN validation executes
- THEN the request SHALL be accepted
- AND validation class SHALL match one-time place-first semantics

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
