# account-default-places Specification

## Purpose

Define account-level default places for expense and income manual flows, with active-state validation and clear handling when defaults become inactive.

## Requirements

### Requirement: Account-level default place preferences
The system MUST allow each account to store zero or one default expense place and zero or one default income place. When set, each default SHALL belong to the same account and SHALL be active.

#### Scenario: Save valid defaults
- GIVEN an account with active places
- WHEN the user saves default expense and/or income place IDs for that account
- THEN the system SHALL persist those defaults
- AND each persisted default SHALL reference an active place in the same account

#### Scenario: Reject cross-account or inactive default
- GIVEN a default place ID that is inactive or belongs to another account
- WHEN account default validation runs
- THEN the system SHALL reject the update
- AND the response SHALL state the default is invalid for that account

### Requirement: Manual flow preselection and inactive-default handling
The system MUST preselect active account defaults in manual expense, income, and manual quick-add flows. The system MUST ignore inactive or archived defaults and SHALL surface a clear warning so users can pick a valid place.

#### Scenario: Active default is preselected
- GIVEN an account has an active default expense or income place
- WHEN the matching manual form or quick-add opens
- THEN the selector SHALL be prefilled with the active default

#### Scenario: Inactive default is ignored with warning
- GIVEN an account default exists but the place is archived or inactive
- WHEN the manual form or quick-add opens
- THEN the system SHALL not preselect that default
- AND the UI SHALL show a clear warning that the default needs replacement
