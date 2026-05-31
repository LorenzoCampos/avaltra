# Delta for savings-goal-editing

## ADDED Requirements

### Requirement: Place Selection Replaces Free-Text Storage Input
Savings goal create/edit flows MUST use place/container selection as the primary storage-location input and MUST NOT require free-text `saved_in` entry for migration-forward edits.

#### Scenario: Create flow requires valid place selection
- GIVEN a user creates a savings goal in migration-forward flows
- WHEN no valid active-account place is selected
- THEN submission SHALL be rejected until a valid place is selected

#### Scenario: Edit flow updates place selection
- GIVEN an existing savings goal is edited
- WHEN the user selects a different valid active-account place
- THEN the goal SHALL persist the new place reference

### Requirement: Compatibility Display for Legacy Unassigned Goals
The system MUST preserve edit access behavior for existing goals and SHALL surface explicit unassigned/legacy messaging when a goal has no validated place reference.

#### Scenario: Legacy goal remains editable
- GIVEN a legacy savings goal without validated place reference
- WHEN the user opens the existing edit route
- THEN the goal SHALL remain editable using existing access behavior

#### Scenario: Legacy unassigned state is explicit
- GIVEN a savings goal has no validated place reference
- WHEN goal details or cards are rendered
- THEN the UI SHALL display explicit unassigned/legacy location messaging
