# Savings Goal Editing Specification

## Purpose

Define savings goal edit action availability and behavior across mobile and desktop without changing the existing edit flow or backend domain.

## Requirements

### Requirement: Mobile Edit Action Discoverability

The system MUST make a savings goal edit action visible and directly discoverable on mobile/touch-oriented layouts without requiring hover-only interaction.

#### Scenario: Mobile card shows edit affordance without hover

- GIVEN a user is viewing savings goal cards on a mobile viewport
- WHEN a card is rendered
- THEN an edit action is visible on the card without hover
- AND the action is perceivable as interactive

#### Scenario: Touch interaction can reach edit action

- GIVEN a touch-capable device where hover is unavailable or unreliable
- WHEN the user scans a savings goal card
- THEN the user can locate and activate the edit action via touch

### Requirement: Desktop Behavior Preservation

The system SHALL preserve existing desktop savings card action behavior, including current hover-reveal interaction patterns, except for minimal responsive adjustments needed to satisfy mobile discoverability.

#### Scenario: Desktop hover behavior remains intact

- GIVEN a user is viewing savings goal cards on a desktop viewport
- WHEN the pointer hovers and unhovers a card
- THEN action visibility behavior matches existing desktop expectations

#### Scenario: No unintended desktop regressions

- GIVEN the desktop savings list
- WHEN cards are displayed and interacted with
- THEN edit action placement and interaction remain functionally equivalent to current behavior

### Requirement: Edit Action Routes to Existing Edit Form

The system MUST route savings goal edit activation to the existing edit path (`/savings/edit/:goalId`) and MUST use the existing edit form and update flow.

#### Scenario: Edit action opens existing edit route

- GIVEN a savings goal card with goal identifier `goalId`
- WHEN the user activates the edit action
- THEN navigation goes to `/savings/edit/:goalId`

#### Scenario: Existing update flow is unchanged

- GIVEN the user arrived through card edit activation
- WHEN the user submits edits in the existing form
- THEN the existing update flow processes the change without requiring new backend/domain behavior

### Requirement: Accessible Labels, Titles, and Focus

The system MUST provide localized accessible naming for icon-only edit controls (including `aria-label` and `title`), and keyboard focus MUST reach the edit action in a predictable order on supported devices.

#### Scenario: Localized accessibility text is present

- GIVEN the savings UI in English or Spanish locale
- WHEN an edit control is inspected
- THEN it includes a locale-appropriate accessible label and title conveying "Edit goal"

#### Scenario: Keyboard focus reaches edit action

- GIVEN keyboard navigation through interactive card controls
- WHEN the user tabs through the card actions
- THEN focus reaches the edit action and activation is possible via keyboard

### Requirement: Explicit Non-Goals and Scope Guardrails

This change MUST NOT introduce backend API modifications, savings goal domain model changes, or broad savings card redesign beyond minimal responsive affordance updates needed for mobile edit discoverability.

#### Scenario: Backend and domain remain unchanged

- GIVEN the implemented change set
- WHEN reviewing touched behavior
- THEN no new backend endpoint, contract, or savings goal domain rule is introduced

#### Scenario: UI scope remains narrow

- GIVEN savings card presentation before and after the change
- WHEN comparing layouts
- THEN only small action-visibility/accessibility adjustments are introduced
- AND no broad card or navigation redesign is introduced
