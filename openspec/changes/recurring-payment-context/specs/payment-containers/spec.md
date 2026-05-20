# Delta for payment-containers

## PR Boundary

This delta documents future PR2 scope for the broader `recurring-payment-context` change. It is NOT part of PR1 packaging, which is limited to recurring template payment-context persistence, scheduler snapshots, and recurring form wiring. PR1 must leave the requirements below pending/future work.

## ADDED Requirements

### Requirement: Localized Payment Context Management Text
All user-visible payment container/instrument management strings MUST be localized through the existing i18n convention; hardcoded English text MUST NOT remain in management forms, validation feedback, or mutation toasts.

#### Scenario: Validation and toast text uses locale resources
- GIVEN a user triggers a management validation error or success toast
- WHEN the UI renders feedback
- THEN the text SHALL come from locale keys
- AND no hardcoded English management text SHALL be displayed

## MODIFIED Requirements

### Requirement: Container and Instrument Management UX
The system MUST provide CRUD management for containers and instruments, including activation status and relationship editing (instrument-to-container), without forcing immediate transaction remapping. Management flows MUST align with shared app visual patterns, MUST expose an explicit create button entry point, and MUST provide edit through either a modal flow or a dedicated edit view.

(Previously: CRUD management was required but create/edit entry surfaces and app-pattern alignment were not explicitly constrained.)

#### Scenario: Deactivate referenced instrument
- GIVEN an instrument already used by transactions
- WHEN the user deactivates it
- THEN existing transaction history SHALL remain readable
- AND new selection lists SHALL exclude the inactive instrument

#### Scenario: Create starts from explicit CTA
- GIVEN a user opens payment context management
- WHEN they need to add a container or instrument
- THEN the interface SHALL provide a visible create button
- AND creation SHALL start from that button flow

#### Scenario: Edit uses dedicated edit surface
- GIVEN a user chooses to edit an existing container or instrument
- WHEN edit is initiated
- THEN editing SHALL open in a modal or dedicated edit view
- AND the edit interaction SHALL follow app visual patterns
