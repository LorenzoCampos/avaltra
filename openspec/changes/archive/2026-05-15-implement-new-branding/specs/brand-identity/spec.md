# Brand Identity Specification

## Purpose

Define a token-first branding behavior that applies approved `branding/` assets and semantic colors across install metadata and key UI surfaces while preserving accessibility, theme persistence, and controlled scope.

## Requirements

### Requirement: Approved Brand Assets and Logo Usage

The system MUST use approved assets from `branding/` as source-of-truth for visible product identity, and MUST NOT introduce ad-hoc logos outside approved variants.

#### Scenario: Approved logo appears on key surfaces
- GIVEN approved `branding/SVG` and required PNG assets are available
- WHEN app shell or auth/onboarding surfaces render branding
- THEN the displayed logo/wordmark uses an approved variant from `branding/`

#### Scenario: Unapproved logo source is rejected
- GIVEN a proposed logo asset outside approved `branding/` sources
- WHEN branding is wired into a key surface
- THEN implementation SHALL be considered non-compliant

### Requirement: Favicon and PWA Icon Update Behavior

The system MUST update favicon and PWA metadata to use approved brand icon assets, including compatibility fallbacks for environments with limited SVG launcher support.

#### Scenario: Manifest and shell metadata reference branded icons
- GIVEN frontend metadata and manifest are generated
- WHEN installable app metadata is inspected
- THEN favicon and PWA icon entries reference approved branded assets

#### Scenario: Compatibility fallback exists
- GIVEN a platform with inconsistent SVG launcher behavior
- WHEN app icon metadata is consumed
- THEN PNG fallback icon entries are present and valid

### Requirement: Theme Token and Primitive Integration

The system MUST define and use semantic brand tokens (e.g., primary/accent/on-primary) mapped from approved palette values, and shared primitives SHALL consume these tokens instead of hardcoded `blue-*` accents.

#### Scenario: Shared primary primitive uses semantic tokens
- GIVEN a shared primary control (e.g., button) is rendered
- WHEN styles are resolved
- THEN brand accents come from semantic tokens, not hardcoded `blue-*` utilities

#### Scenario: Status colors remain scoped
- GIVEN success/warning/error/info states
- WHEN token migration is applied
- THEN status color semantics MUST remain unchanged unless explicitly re-specified

### Requirement: Key Surface Adoption with Guarded Scope

The system SHALL apply branding to key surfaces (app shell, auth/onboarding, export identity, install metadata) without requiring full-feature redesign or blind global class replacement.

#### Scenario: Key surfaces are branded in scope
- GIVEN scoped migration targets are defined
- WHEN branding rollout is complete
- THEN app shell, auth/onboarding, exports, and install metadata reflect new brand identity

#### Scenario: Broad risky rewrites are excluded
- GIVEN unrelated feature flows outside key surfaces
- WHEN branding work is reviewed
- THEN no full redesign or blanket `blue-*` replacement is required for compliance

### Requirement: Light and Dark Contrast Preservation

The system MUST preserve accessible contrast behavior for branded tokens across light and dark themes on key interactive and text surfaces.

#### Scenario: Light theme contrast validation passes
- GIVEN branded token mappings in light theme
- WHEN contrast checks are run on key text/interactive surfaces
- THEN contrast meets defined accessibility thresholds

#### Scenario: Dark theme contrast validation passes
- GIVEN branded token mappings in dark theme
- WHEN contrast checks are run on key text/interactive surfaces
- THEN contrast meets defined accessibility thresholds

### Requirement: Persisted Theme Preference Compatibility

The system MUST preserve existing user theme preference across branding rollout via storage key compatibility or deterministic migration.

#### Scenario: Existing preference is retained
- GIVEN a user already has a persisted theme preference
- WHEN the branded build is loaded
- THEN the same effective theme is applied without manual reset

#### Scenario: Migration path handles legacy key
- GIVEN legacy theme storage key data exists
- WHEN compatibility logic executes
- THEN value is read directly or migrated safely to the active key

### Requirement: Explicit Non-Goals for Typography and Full Redesign

The system MUST NOT perform global typography changes or full application redesign within this change unless explicit brand guidance or approved scope extension is provided.

#### Scenario: Typography remains unchanged by default
- GIVEN no explicit typography guidance has been approved
- WHEN branding implementation is reviewed
- THEN global font system and typographic scale remain unchanged

#### Scenario: Full redesign is blocked by scope
- GIVEN requests that exceed approved branding scope
- WHEN evaluating this change for completion
- THEN unrelated full redesign work is treated as out-of-scope
