# Proposal: Implement New Branding

## Intent

Replace the fragmented placeholder identity with the approved `branding/` assets and a maintainable brand system. The goal is consistency across install metadata, app shell, auth/onboarding surfaces, exports, and shared UI without unsafe global color replacement.

## Scope

### In Scope
- Adopt `branding/SVG` and generated/selected PNG assets for favicon, PWA, and visible logo usage.
- Define semantic brand tokens from the asset palette: Trust Blue, Growth Teal, Innovation Aqua, Graphite Grey, Cloud Grey, white.
- Migrate shared UI primitives and key surfaces away from hardcoded `blue-*` accents to semantic tokens.
- Update product metadata/title/manifest/export branding and document icon workflow.
- Preserve persisted theme preferences through migration or key compatibility.

### Out of Scope
- UI-wide typography changes without explicit brand guidance.
- Blind replacement of every `blue-*` class.
- Redefining success/warning/error/status colors unless required by brand specs.
- Full redesign of unrelated feature workflows.

## Capabilities

### New Capabilities
- `brand-identity`: Covers brand assets, semantic color tokens, install metadata, and branded shell/auth/export presentation.

### Modified Capabilities
- None; no existing `openspec/specs/` capabilities were found.

## Approach

Use a token-first migration in reviewable slices: identity assets and metadata first; then global tokens and shared primitives; then app shell/auth/onboarding; finally targeted feature accent cleanup. Keep the logo assets as source-of-truth, map colors to semantic CSS/Tailwind tokens, and validate accessibility before broad usage.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `branding/` | Source | Logo/palette assets drive implementation. |
| `frontend/public/`, `frontend/index.html`, `frontend/vite.config.ts` | Modified | Favicon, PWA icons, manifest, theme color, title. |
| `frontend/src/index.css`, shared UI components | Modified | Brand tokens and primary/focus styles. |
| `frontend/src/components/Layout.tsx`, `frontend/src/features/auth/*` | Modified | Visible brand identity on key surfaces. |
| `frontend/src/hooks/useExport.ts`, docs | Modified | Export/documentation branding. |
| `frontend/src/stores/theme.store.ts` | Modified | Theme-key migration/compatibility. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contrast regressions | Med | Validate light/dark token usage against WCAG. |
| Scope creep | Med | Migrate through primitives; avoid bulk replacements. |
| PWA icon incompatibility | Med | Provide deliberate SVG/PNG icon set and test manifest. |
| Lost theme preference | Low | Keep key compatibility or migration fallback. |
| Typography overreach | Low | Do not change fonts without evidence. |

## Rollback Plan

Revert asset references, token mappings, and migrated component classes in one change. Keep old icon/manifest paths available until validation passes so metadata can be restored quickly.

## Dependencies

- Existing `branding/` SVG/PNG assets.
- Accessibility/build validation in frontend tooling.

## Success Criteria

- [ ] App install metadata and visible key surfaces use approved branding.
- [ ] Shared primary UI uses semantic brand tokens, not hardcoded `blue-*`.
- [ ] Light/dark contrast and PWA manifest/icon behavior are validated.
- [ ] Existing theme preference is preserved or migrated safely.
