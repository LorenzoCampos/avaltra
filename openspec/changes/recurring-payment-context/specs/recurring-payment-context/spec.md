# recurring-payment-context Specification

## Purpose

Define optional normalized payment context on recurring templates and generation-time inheritance that mirrors one-time transaction validation semantics.

## Requirements

### Requirement: Optional Template Payment Context
Recurring expense and income templates MUST allow optional `container_id` and optional `instrument_id` references, and MUST accept null for both fields.

#### Scenario: Save template without payment context
- GIVEN a user creates a recurring expense template
- WHEN both container and instrument are omitted
- THEN the template SHALL be saved successfully
- AND both normalized references SHALL remain null

#### Scenario: Save template with payment context
- GIVEN a user selects a valid container and instrument on a recurring income template
- WHEN the template is saved
- THEN both references SHALL be persisted on the template

### Requirement: Future Occurrence Inheritance by Snapshot
When recurring generation creates a new transaction occurrence, the system MUST copy the template payment context present at generation time into the new occurrence.

#### Scenario: Generated occurrence inherits current template context
- GIVEN a recurring template has container A and instrument B
- WHEN the scheduler generates the next expense occurrence
- THEN the new expense SHALL store container A and instrument B

### Requirement: Template Edit Scope Is Future-Only
Editing a recurring template payment context MUST affect only future generated occurrences and MUST NOT mutate already-generated expense or income rows.

#### Scenario: Existing generated rows stay unchanged
- GIVEN previous occurrences were generated with container A
- WHEN the user updates the template to container C
- THEN existing generated rows SHALL still reference container A
- AND only later generated rows SHALL reference container C

### Requirement: Validation Parity with One-Time Transactions
Recurring template payment context validation MUST follow the same domain rules as one-time expense/income payment context validation.

#### Scenario: Invalid instrument-container relationship is rejected
- GIVEN a template payload includes a card instrument without a valid backing container relationship
- WHEN validation executes
- THEN the request SHALL be rejected
- AND the response SHALL return the same validation class used by one-time transaction flows
