# Design: Implement New Branding

## Technical Approach

Apply branding as a narrow, token-first UI integration. The approved `branding/` assets remain the source material, but runtime references should use frontend-owned public copies under `frontend/public/brand/` so Vite/PWA metadata, `<img>`, and install icons all resolve from stable app URLs. Define semantic brand primitives once, then migrate shared primitives and key surfaces: metadata/PWA, app shell navigation, auth/onboarding headers, and PDF export identity. Do not blanket-replace every `blue-*`; status colors and unrelated feature accents stay scoped unless they are key-surface primary actions.

## Architecture Decisions

| Decision | Choice | Alternatives / Tradeoff | Rationale |
|---|---|---|---|
| Asset delivery | Copy approved SVG/PNG variants into `frontend/public/brand/` with clear names. | Importing from `branding/` keeps one file but is outside frontend public runtime and awkward for PWA icons. | Public assets are deterministic for `index.html`, VitePWA manifest, Apple icons, and image tags. |
| Brand source in code | Add `src/lib/brand.ts` for names, asset URLs, hex/RGB tokens, PDF colors. | Scatter strings in components. | One contract prevents drift across DOM metadata, UI, and jsPDF. |
| Token integration | Add CSS variables/semantic utilities in `src/index.css`; shared primitives consume `brand-primary`, focus, subtle, and on-primary semantics. | Tailwind config rewrite or broad class replacement. | Tailwind v4 is CSS-first here; variables fit current code and keep review scope small. |
| Logo rendering | Add presentational `src/components/BrandLogo.tsx`. | Inline `<img>` everywhere. | Centralizes alt text, variant, sizing, and dark-surface safety without container logic. |
| Theme preference | Keep Zustand persist key `avaltra-theme`; only add migration fallback if a legacy key is discovered during implementation. | Renaming key. | Spec requires compatibility; the current key is already brand-neutral enough and stable. |

## Data Flow

`branding/*` → copied public assets → `brand.ts` constants + `index.css` tokens → `BrandLogo`, primitives, Layout/Auth/Onboarding, VitePWA/index metadata, jsPDF export.

Theme flow remains unchanged: `theme.store.ts` persists `avaltra-theme` → applies `.dark` on `<html>` → CSS brand tokens expose light/dark-safe values.

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/public/brand/avaltra-isotipo.svg` / `.png` | Create | Approved icon source from `branding/SVG|PNG/Isotipo.*`. |
| `frontend/public/brand/avaltra-imagotipo.svg` / `.png` | Create | Approved wordmark source from `branding/SVG|PNG/Imagotipo.*`. |
| `frontend/src/lib/brand.ts` | Create | Brand name, tagline, asset URLs, hex/RGB palette (`#003366`, `#005a73`, `#008080`, `#444`, cloud/white). |
| `frontend/src/components/BrandLogo.tsx` | Create | Atomic presentational logo component. |
| `frontend/src/index.css` | Modify | Add semantic brand variables/utilities while preserving typography and status colors. |
| `frontend/src/components/ui/Button.tsx`, `Input.tsx` | Modify | Replace primary/focus `blue-*` with semantic brand classes. |
| `frontend/src/components/Layout.tsx`, `BottomNav.tsx`, `MoreMenu.tsx` | Modify | Use `BrandLogo` and brand active/nav accents. |
| `frontend/src/features/auth/*.tsx` | Modify | Replace text title with approved logo and brand link/focus accents. |
| `frontend/src/features/onboarding/OnboardingWizard.tsx`, `steps/*.tsx` | Modify | Replace primary gradients/spinners/progress with semantic brand usage. |
| `frontend/index.html`, `frontend/vite.config.ts` | Modify | Favicon, Apple icon, manifest icons, theme color, includeAssets. |
| `frontend/src/hooks/useExport.ts` | Modify | Use `brand.ts` PDF name/colors; keep CSV untouched. |
| `frontend/src/hooks/useExport.test.ts` | Modify | Assert exported PDF theme helpers/brand color constants. |

## Interfaces / Contracts

```ts
export const BRAND = {
  name: 'Avaltra',
  assets: { iconSvg: '/brand/avaltra-isotipo.svg', wordmarkSvg: '/brand/avaltra-imagotipo.svg' },
  colors: { primary: '#003366', growth: '#005a73', accent: '#008080', graphite: '#444444' },
  pdf: { primaryRgb: [0, 51, 102] as const }
} as const;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Brand constants and PDF export color/header helpers. | Vitest in `useExport.test.ts` or `brand.test.ts`. |
| Integration | Metadata/manifest points reference `/brand/*` SVG + PNG fallbacks. | Build plus targeted config/HTML assertions. |
| Manual/a11y | Light/dark contrast on buttons, nav, auth, onboarding; PWA icon install preview. | Browser inspection, Lighthouse/contrast checker. |

## Migration / Rollout

No data migration required. Keep `avaltra-theme` persist key to preserve existing preference. Roll out in slices: assets/metadata, tokens/primitives, shell/auth/onboarding, export/tests.

## Open Questions

None blocking.
