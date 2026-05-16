# Tasks: Dark Branding Sidebar

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–390 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (`size:exception` only if diff drifts >400) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Branding + favicon + desktop sidebar + verification | Single PR | Keep scope strict; no dual-currency edits |

## Phase 1: Foundation (Brand Assets + Contracts)

- [x] 1.1 Add approved dark-safe assets in `frontend/public/brand/` (`icon-dark.svg`, `icon-light.svg`, `wordmark-dark.svg`, `wordmark-light.svg`, plus required PNG fallbacks).
- [x] 1.2 Update `frontend/src/lib/brand.ts` with explicit light/dark asset keys (`iconLightSvg`, `iconDarkSvg`, `wordmarkLightSvg`, `wordmarkDarkSvg`) while preserving existing exported contract usage.
- [x] 1.3 Add/update brand contract tests in `frontend/src/lib/brand.test.ts` to assert all required asset paths resolve and remain inside approved brand namespace.

## Phase 2: Core UI Implementation

- [x] 2.1 Refactor `frontend/src/components/BrandLogo.tsx` to use deterministic `surface: 'light' | 'dark'` asset selection (and temporary compatibility mapping from `darkSurfaceSafe` if still referenced).
- [x] 2.2 Update `frontend/src/components/Layout.tsx` to render desktop-only sidebar (`md+`) with current desktop route list, active-route styles, account/logout controls, and preserved `data-tour="*-desktop"` anchors.
- [x] 2.3 Keep mobile behavior unchanged in `Layout.tsx`: existing header controls, `BottomNav`, and `MoreMenu` remain mobile-only and unaffected by desktop sidebar logic.

## Phase 3: Metadata + Integration Wiring

- [x] 3.1 Update `frontend/index.html` favicon links to include ordered defaults plus `prefers-color-scheme` variants with stable SVG/PNG fallbacks.
- [x] 3.2 Update `frontend/vite.config.ts` PWA icon/manifest entries to reference approved assets added in `public/brand` without changing installability behavior.
- [x] 3.3 Verify `frontend/src/components/FeatureTour.tsx` selector assumptions still resolve after nav relocation; adjust only selector bindings if required.

## Phase 4: Testing & Verification

- [x] 4.1 Add/extend tests in `frontend/src/components/BrandLogo.test.tsx` (or nearest existing component test file) for light/dark surface variant selection and accessibility alt behavior.
- [x] 4.2 Add layout/navigation assertions in `frontend/src/components/Layout.test.tsx` for desktop sidebar visibility, active-state updates, and mobile sidebar non-visibility/focusability.
- [ ] 4.3 Run frontend checks (`pnpm --dir frontend test`, `pnpm --dir frontend build`) and perform manual viewport/theme smoke checks: dark/light logo legibility, favicon visibility, keyboard focus, mobile nav parity.

## Phase 5: Scope Guard & Final Review

- [x] 5.1 Confirm no edits in transaction display paths (`frontend/src/features/transactions/**`) affecting dual-currency behavior.
- [ ] 5.2 Capture before/after screenshots for desktop dark/light sidebar and mobile nav continuity, attach to PR for visual review.

## Corrective Apply Notes (2026-05-16)

- Added desktop sidebar collapse/expand behavior with an accessible persisted toggle; mobile navigation remains unchanged.
- Changed the desktop sidebar from forced-dark styling to light/dark theme-aware surface classes.
- Added pragmatic integrated lockup SVG assets where the icon mark stands in for the initial A in Avaltra; this is a code/SVG approximation, not a designer-exported final brand redraw.
- Automated focused/full frontend tests and typecheck passed; build passed on retry with existing chunk warnings. Browser screenshot/manual visual checks remain pending, so tasks 4.3 and 5.2 stay open.

## Corrective Apply Notes (2026-05-16, visual feedback round 2)

- Replaced the generated lockup direction on app/auth/onboarding surfaces with a typographic `A` mark plus `Avaltra` text rendered by CSS/classes in `BrandMark`.
- Collapsed desktop sidebar now shows lucide route icons reused from mobile bottom navigation and MoreMenu mappings instead of first-letter labels; expanded sidebar shows icon + label.
- Mobile header keeps the same structure but displays the typographic mark + app name.
- Removed runtime references to the generated lockup SVG assets from the brand contract. Automated focused/full frontend tests, typecheck, scope guard, and production build passed; changed-file lint remains blocked by pre-existing auth lint issues.
