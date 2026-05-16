# Delta for brand-identity

## MODIFIED Requirements

### Requirement: Approved Brand Assets and Logo Usage

The system MUST use approved assets from `branding/` as source-of-truth for visible product identity, MUST provide light-surface and dark-surface-safe logo/icon variants for app-chrome usage, and MUST NOT introduce ad-hoc logos outside approved variants. Logo selection SHOULD be deterministic by rendered surface/theme so legibility does not depend only on CSS effects.
(Previously: Approved assets were required, but explicit light/dark-safe variant behavior was not required.)

#### Scenario: Approved logo appears on key surfaces
- GIVEN approved `branding/SVG` and required PNG assets are available
- WHEN app shell or auth/onboarding surfaces render branding
- THEN the displayed logo/wordmark uses an approved variant from `branding/`

#### Scenario: Dark surface uses dark-safe brand variant
- GIVEN a dark themed or dark surface app shell region
- WHEN `BrandLogo` renders branding
- THEN the selected artwork SHALL be the approved dark-safe variant with readable foreground contrast

#### Scenario: Unapproved logo source is rejected
- GIVEN a proposed logo asset outside approved `branding/` sources
- WHEN branding is wired into a key surface
- THEN implementation SHALL be considered non-compliant

### Requirement: Favicon and PWA Icon Update Behavior

The system MUST update favicon and PWA metadata to use approved brand icon assets, SHOULD provide color-scheme-aware favicon declarations where browser support exists, and MUST include compatibility fallbacks for environments with limited SVG or color-scheme favicon support.
(Previously: Required branded favicon/PWA icons and fallbacks, but did not require color-scheme-aware favicon behavior.)

#### Scenario: Manifest and shell metadata reference branded icons
- GIVEN frontend metadata and manifest are generated
- WHEN installable app metadata is inspected
- THEN favicon and PWA icon entries reference approved branded assets

#### Scenario: Dark-mode browser tab icon has supported variant
- GIVEN a browser that honors `prefers-color-scheme` favicon links
- WHEN the user runs the app in dark mode
- THEN the browser MAY select a dedicated dark-mode-safe favicon variant for tab visibility

#### Scenario: Compatibility fallback exists
- GIVEN a platform with inconsistent SVG or color-scheme favicon behavior
- WHEN app icon metadata is consumed
- THEN a stable default favicon and valid PNG fallback entries are present
