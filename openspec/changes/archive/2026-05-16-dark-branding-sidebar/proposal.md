# Proposal: Dark Branding Sidebar

## Intent

Fix dark-mode brand legibility in app chrome and browser metadata, and introduce a desktop sidebar shell without changing the existing mobile navigation. This keeps the visual iteration focused on brand/navigation polish and avoids mixing in dual-currency transaction display work.

## Scope

### In Scope
- Add dark-surface-safe logo/icon variants and wire `BrandLogo` to select appropriate artwork.
- Add color-scheme-aware favicon metadata with conservative fallbacks.
- Replace the desktop top navbar with a desktop-only sidebar shell.
- Preserve mobile `BottomNav` + `MoreMenu` behavior and desktop tour anchors.

### Out of Scope
- Dual-currency transaction display or transaction-row redesign.
- Full app redesign, typography overhaul, or broad token migration.
- Reworking mobile navigation patterns.

## Capabilities

### New Capabilities
- `desktop-sidebar-navigation`: Desktop users get primary navigation in a sidebar while mobile users keep the current bottom navigation and overflow menu.

### Modified Capabilities
- `brand-identity`: Brand assets and favicon metadata gain explicit light/dark visibility behavior.

## Approach

Use the recommended minimal safe path: introduce approved dark-safe brand variants, update favicon/link metadata and manifest references as needed, then refactor `Layout` so desktop navigation renders in a sidebar while mobile components remain unchanged. Keep existing `data-tour` selectors attached to desktop nav targets.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/public/brand/` | Modified | Add or adjust dark-safe logo/icon assets and fallbacks. |
| `frontend/src/components/BrandLogo.tsx` | Modified | Select theme/surface-appropriate logo variant. |
| `frontend/index.html` | Modified | Declare light/dark favicon metadata and fallback ordering. |
| `frontend/vite.config.ts` | Modified | Keep PWA icon metadata aligned with available assets. |
| `frontend/src/components/Layout.tsx` | Modified | Introduce desktop sidebar shell. |
| `frontend/src/components/BottomNav.tsx` | Unchanged | Preserve mobile navigation behavior. |
| `frontend/src/components/MoreMenu.tsx` | Unchanged | Preserve mobile overflow behavior. |
| `frontend/src/components/FeatureTour.tsx` | Modified/Guarded | Preserve desktop tour selectors after nav relocation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Browser favicon dark-mode behavior varies | Med | Test Chromium, Firefox, and Safari-like behavior where available; keep safe fallback order. |
| Sidebar changes mobile nav accidentally | Med | Use responsive boundaries and regression-check mobile viewport behavior. |
| SVG variants drift over time | Low | Use clear asset naming for light/dark variants. |
| Visual contrast cannot be fully automated | Med | Include manual dark/light screenshot validation. |

## Rollback Plan

Revert the change branch or restore `Layout`, `BrandLogo`, metadata, and brand assets to their previous references. Because mobile nav is preserved, rollback should not require data migration.

## Dependencies

- Approved dark-safe brand assets or derived variants from existing approved branding sources.
- Branch `feat/dark-branding-sidebar`; issue #7 tracks visual iteration.

## Success Criteria

- [ ] Logo and favicon remain legible on light and dark surfaces.
- [ ] Desktop viewport uses sidebar navigation.
- [ ] Mobile navigation remains functionally unchanged.
- [ ] Existing desktop feature-tour anchors still resolve.
- [ ] No dual-currency transaction display work is included.
