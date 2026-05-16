# desktop-sidebar-navigation Specification

## Purpose

Define desktop-first sidebar navigation while preserving current mobile navigation behavior and accessibility quality.

## Requirements

### Requirement: Desktop Sidebar Navigation Shell

The system MUST render primary navigation in a desktop-only sidebar on desktop breakpoints, and route navigation from sidebar items MUST behave equivalently to prior desktop top-nav routing.

#### Scenario: Desktop renders sidebar navigation
- GIVEN viewport width is at or above the desktop breakpoint
- WHEN the app layout renders
- THEN primary navigation is displayed in a sidebar container instead of a top bar

#### Scenario: Sidebar navigation changes route
- GIVEN desktop sidebar is visible
- WHEN a user activates a sidebar nav item
- THEN the corresponding route SHALL load and active-state indication updates

### Requirement: Mobile Navigation Preservation

The system MUST preserve existing mobile navigation behavior, including `BottomNav` and `MoreMenu`, and sidebar navigation MUST NOT appear on mobile breakpoints.

#### Scenario: Mobile keeps BottomNav and MoreMenu
- GIVEN viewport width is below the desktop breakpoint
- WHEN the app layout renders
- THEN `BottomNav` and `MoreMenu` remain available with unchanged behavior

#### Scenario: Desktop-only sidebar does not leak to mobile
- GIVEN viewport width is below the desktop breakpoint
- WHEN navigation UI is rendered
- THEN desktop sidebar elements are not visible or focusable

### Requirement: Navigation Accessibility and Tour Anchor Continuity

The system MUST preserve accessible contrast for nav text/icons in light and dark themes, MUST provide visible keyboard focus states for interactive nav controls, and SHALL preserve existing desktop feature-tour anchor selectors after nav relocation.

#### Scenario: Accessible nav contrast and focus
- GIVEN light or dark theme is active
- WHEN a user views or tabs through navigation controls
- THEN nav labels/icons remain readable and focused items show a visible focus indicator

#### Scenario: Desktop tour selectors remain resolvable
- GIVEN desktop feature-tour expects existing `*-desktop` targets
- WHEN the tour locates navigation anchors after sidebar migration
- THEN selectors resolve to visible desktop navigation elements

### Requirement: Explicit Non-Goals for This Navigation Change

The system MUST NOT include transaction dual-currency display changes, MUST NOT perform a broad UI redesign beyond sidebar shell and branding visibility updates, and MUST NOT require backend API or data model changes.

#### Scenario: Out-of-scope work is excluded
- GIVEN implementation work for this change is reviewed
- WHEN candidate changes include transaction-row currency formatting, broad restyling, or backend edits
- THEN those changes SHALL be treated as non-compliant scope expansion
