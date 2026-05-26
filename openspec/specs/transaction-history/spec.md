# transaction-history Specification

## Purpose

Define historical visibility and bounded pagination contracts for expense/income transaction history.

## Requirements

### Requirement: Full History Visibility Contract
The system MUST expose every matching expense and income history record through explicit bounded pagination, not only an implicit recent-only subset.

#### Scenario: Expense history includes older records
- GIVEN a user has expense records older than the latest backend default page
- WHEN the history list is requested
- THEN the first page SHALL include pagination metadata
- AND older records SHALL remain reachable by requesting later pages or using load-more controls

#### Scenario: Income history symmetry
- GIVEN a user has income records older than the latest backend default page
- WHEN the history list is requested
- THEN income history SHALL follow the same pagination and visibility guarantees as expenses

### Requirement: Explicit Pagination Semantics
The system MUST support `page` and `limit` request controls and return compatible pagination metadata including `total_count`, `page`, `limit`, and `total_pages`. The system MUST NOT silently truncate rows without exposing and retrieving additional pages.

#### Scenario: Response reveals list bounds
- GIVEN an expense or income history response has more rows than the current page
- WHEN the response is returned to the client
- THEN it SHALL include `total_count`, `page`, `limit`, and `total_pages` or compatible existing fields
- AND the client SHALL be able to determine that additional rows exist

#### Scenario: Client can retrieve additional rows
- GIVEN total records exceed the current page size
- WHEN the client requests another page using documented controls
- THEN the response SHALL return the next matching history page
- AND behavior SHALL be consistent for expense and income lists

### Requirement: Frontend Pagination Controls
Expense and income history screens MUST expose pagination or load-more controls when more matching rows exist. Controls MUST keep filters and sort criteria consistent across page changes.

#### Scenario: Load more retains filters
- GIVEN a user filters or sorts expense or income history
- WHEN they request the next page or load more
- THEN the request SHALL preserve the active filters and sort
- AND returned rows SHALL belong to the same result set

#### Scenario: Filter changes reset page safely
- GIVEN a user is viewing a later history page
- WHEN filters or sort criteria change
- THEN pagination SHALL reset or reconcile to a valid page
- AND the UI SHALL NOT show stale rows from a previous result set

### Requirement: Bounded Performance
The system MUST keep history retrieval bounded by page size. The system MUST NOT fetch an unbounded full-history payload to solve visibility.

#### Scenario: Page size bound is enforced
- GIVEN a client requests historical expenses or incomes
- WHEN the request includes or omits `limit`
- THEN the backend SHALL apply the configured default/max page-size bound
- AND metadata SHALL describe remaining pages when records exceed that bound
