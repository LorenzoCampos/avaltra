# Delta for savings-goal-editing

## ADDED Requirements

### Requirement: Place Selection Replaces Free-Text Storage Input
Savings goal create/edit flows MUST use place/container selection as the primary storage-location input and MUST NOT require free-text `saved_in` entry for migration-forward edits. Users MAY leave place selection empty; when no place is selected, the goal SHALL be persisted as explicit unassigned state.

#### Scenario: Create flow allows unassigned when no place is selected
- GIVEN a user creates a savings goal in migration-forward flows
- WHEN no place is selected
- THEN submission SHALL succeed
- AND the goal SHALL be stored as unassigned

#### Scenario: Create flow rejects invalid place when provided
- GIVEN a user creates a savings goal with a place selection
- WHEN the selected place is missing, inactive, or outside the active account
- THEN submission SHALL be rejected

#### Scenario: Edit flow updates place selection
- GIVEN an existing savings goal is edited
- WHEN the user selects a different valid active-account place
- THEN the goal SHALL persist the new place reference

#### Scenario: Edit flow allows clearing selected place
- GIVEN an existing savings goal has a selected place
- WHEN the user clears place selection and saves
- THEN the goal SHALL persist as unassigned

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
