# Tasks: Implement New Branding

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 520–820 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 assets+metadata → PR2 tokens+primitives → PR3 surfaces+export+tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Brand assets and install metadata | PR 1 | Independent vertical slice with build validation |
| 2 | Semantic tokens and shared primitives | PR 2 | Depends on Unit 1; includes focused UI regression checks |
| 3 | Key surfaces + export + full verification | PR 3 | Depends on Unit 2; completes spec scenarios |

## Phase 1: Foundation

- [x] 1.1 Copy approved logo files from `branding/` into `frontend/public/brand/` as `avaltra-isotipo.{svg,png}` and `avaltra-imagotipo.{svg,png}`; keep names stable for metadata and UI usage.
- [x] 1.2 Create `frontend/src/lib/brand.ts` exporting `BRAND` constants (name, tagline, `/brand/*` asset URLs, hex palette, PDF RGB tuple) as the single branding contract.
- [x] 1.3 Update `frontend/index.html` favicon/title and `frontend/vite.config.ts` manifest/icon/includeAssets/theme-color entries to reference approved `/brand/*` assets with SVG + PNG fallbacks.

## Phase 2: Tokens and Primitives

- [x] 2.1 Add semantic brand CSS variables/utilities in `frontend/src/index.css` (`brand-primary`, `brand-accent`, `on-brand`, focus ring) without changing typography or status-color semantics.
- [x] 2.2 Refactor `frontend/src/components/ui/Button.tsx` and `frontend/src/components/ui/Input.tsx` to consume semantic brand classes instead of hardcoded `blue-*` primary/focus accents.
- [x] 2.3 Create presentational `frontend/src/components/BrandLogo.tsx` (variant, size, alt defaults, dark-surface-safe rendering) consuming `BRAND.assets`.

## Phase 3: Surface Integration

- [x] 3.1 Integrate `BrandLogo` and semantic nav accents in `frontend/src/components/Layout.tsx`, `frontend/src/components/BottomNav.tsx`, and `frontend/src/components/MoreMenu.tsx`.
- [x] 3.2 Update auth surfaces in `frontend/src/features/auth/*.tsx` to replace text-only identity with approved logo usage and semantic brand link/focus accents.
- [x] 3.3 Update onboarding branding in `frontend/src/features/onboarding/OnboardingWizard.tsx` and `frontend/src/features/onboarding/steps/*.tsx` (primary gradients/spinners/progress) using semantic tokens only.
- [x] 3.4 Update `frontend/src/hooks/useExport.ts` to use `BRAND` name/colors for PDF identity while leaving CSV behavior unchanged.
- [x] 3.5 Validate `frontend/src/stores/theme.store.ts` keeps persisted `avaltra-theme`; only add deterministic legacy-key migration if legacy key usage is discovered.

## Phase 4: Testing and Verification

- [x] 4.1 Extend `frontend/src/hooks/useExport.test.ts` (or add `frontend/src/lib/brand.test.ts`) to verify brand constants and PDF color/header helpers map to approved palette values.
- [x] 4.2 Add metadata integration checks covering spec scenarios: manifest/favicon entries reference `/brand/*`, and PNG fallback entries exist for limited SVG launcher support.
- [x] 4.3 Run frontend verification (`pnpm --dir frontend test`, `pnpm --dir frontend build`) and manually validate light/dark contrast on buttons/nav/auth/onboarding plus install icon preview.
