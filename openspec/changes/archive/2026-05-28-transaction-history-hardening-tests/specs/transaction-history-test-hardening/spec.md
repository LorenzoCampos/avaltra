# transaction-history-test-hardening Specification

## Purpose

Define verification expectations for mounted tests that harden existing transaction-history UI behavior without changing runtime requirements.

## Requirements

### Requirement: Activity Row Routing Interaction Coverage

The test suite MUST verify mounted Activity row navigation for routable expense/income entries via pointer and keyboard activation.

#### Scenario: Routable row navigates on click
- GIVEN a mounted Activity feed with a routable expense or income row
- WHEN the user clicks that row
- THEN navigation SHALL target the expected transaction route

#### Scenario: Routable row navigates on keyboard activation
- GIVEN a mounted Activity feed with focusable routable row
- WHEN the user presses Enter or Space on the focused row
- THEN navigation SHALL target the same expected transaction route

### Requirement: Activity Non-Routable Guard Coverage

The test suite MUST verify that non-routable Activity rows do not trigger navigation actions.

#### Scenario: Non-routable row ignores click and keyboard
- GIVEN a mounted Activity feed with a non-routable row
- WHEN the user clicks or activates it with Enter/Space
- THEN no navigation callback SHALL be invoked

### Requirement: Expense and Income Pagination Control Coverage

The test suite MUST verify mounted pagination controls for both expense and income lists, including boundary disablement and page-change callbacks.

#### Scenario: Pagination boundaries are enforced
- GIVEN mounted expense or income list pagination at first or last page
- WHEN controls are rendered
- THEN previous or next controls SHALL be disabled at the respective boundary

#### Scenario: Pagination emits callbacks for valid page changes
- GIVEN mounted expense or income list pagination with additional pages
- WHEN the user selects a valid next or previous page action
- THEN the page-change callback SHALL receive the expected target page

### Requirement: Page-Local Filter Behavior Preservation

Hardening tests MUST document and preserve current page-local filter behavior. The suite MUST NOT redefine filters as global or redesign filter semantics.

#### Scenario: Page-local filter scope remains unchanged
- GIVEN mounted transaction-history pages with local filter controls
- WHEN tests exercise pagination and activity interactions
- THEN assertions SHALL confirm filter behavior remains page-local
- AND no test SHALL assume cross-page/global filter state
