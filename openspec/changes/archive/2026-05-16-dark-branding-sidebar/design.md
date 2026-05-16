# Design: Dark Branding Sidebar

## Technical Approach

Refactor the existing `Layout` chrome, not routing or page features. Keep the mobile header account/theme controls plus existing `BottomNav`/`MoreMenu`; move desktop primary navigation from the top bar into a `md+` sidebar that uses the same route list, active-route predicate, translations, and `data-tour="*-desktop"` anchors. Extend brand asset configuration so `BrandLogo` chooses explicit light-surface or dark-surface-safe artwork instead of relying on CSS filters alone. Update favicon/PWA metadata to expose a default fallback plus color-scheme-aware favicon variants.

## Architecture Decisions

| Decision | Choice | Tradeoff / rationale |
|---|---|---|
| Sidebar ownership | Keep sidebar inside `Layout.tsx`; optionally extract a presentational `DesktopSidebarNav` only if `Layout` becomes hard to read. | Minimal scope and no route churn. Extraction is cleaner but risks over-abstracting a single shell variant. |
| Nav data | Use one typed `navLinks` array for desktop sidebar; do not touch `BottomNav`/`MoreMenu` item definitions. | Avoids mobile regression while preserving desktop tour selectors. Some duplication remains, but mobile behavior is intentionally separate. |
| Brand variants | Add explicit asset keys in `BRAND.assets` such as `iconLightSvg`, `iconDarkSvg`, `wordmarkLightSvg`, `wordmarkDarkSvg`; `BrandLogo` selects by `surface="light" | "dark"`. | Deterministic and testable. More files to maintain, but avoids contrast depending on filter hacks. |
| Browser icons | Add ordered `index.html` favicon links with `media="(prefers-color-scheme: ...)"` and keep PNG fallback/apple icon/PWA manifest entries. | Browser support varies, so fallback order remains the safety net. |

## Data Flow

```text
BRAND.assets ──→ BrandLogo(surface, variant) ──→ Layout sidebar/header/auth surfaces
             └─→ index.html + VitePWA manifest ──→ browser/PWA shell icons

Layout route state ──→ shared desktop navLinks ──→ sidebar Link active classes + data-tour anchors
Mobile viewport ──→ existing BottomNav + MoreMenu only
```

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/public/brand/*` | Add | Approved dark-safe SVG/PNG icon and wordmark variants derived from `branding/` sources. |
| `frontend/src/lib/brand.ts` | Modify | Publish light/dark brand asset paths and keep existing palette/PDF contract stable. |
| `frontend/src/components/BrandLogo.tsx` | Modify | Replace `darkSurfaceSafe` filter behavior with deterministic `surface` asset selection; keep accessible `alt`, size, loading defaults. |
| `frontend/index.html` | Modify | Add color-scheme-aware favicon declarations plus default PNG/SVG fallbacks. |
| `frontend/vite.config.ts` | Modify | Include new approved icon assets in PWA cache/manifest without changing app behavior. |
| `frontend/src/components/Layout.tsx` | Modify | Render `md:flex` sidebar, desktop user/account/logout controls in sidebar, mobile top header unchanged; main content gains desktop left offset/rail layout. |
| `frontend/src/components/FeatureTour.tsx` | Guard/verify | Keep desktop selectors resolvable after relocation; no mobile tour logic changes. |
| `frontend/src/lib/*.test.ts` | Modify/Add | Update brand contract, surface, metadata, and sidebar source-level regression tests. |

## Interfaces / Contracts

```ts
type BrandLogoVariant = 'icon' | 'wordmark';
type BrandLogoSurface = 'light' | 'dark';

interface BrandLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  variant?: BrandLogoVariant;
  size?: 'sm' | 'md' | 'lg';
  surface?: BrandLogoSurface;
}
```

Existing `darkSurfaceSafe` MAY be retained temporarily as deprecated compatibility, mapping to `surface="dark"`, if auth/onboarding migration would otherwise expand scope.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/source | `BRAND.assets`, `BrandLogo` variant selection, favicon/PWA metadata references. | Extend Vitest source/contract tests in `src/lib/brand*.test.ts`. |
| Integration/source | Desktop sidebar exists at `md+`, mobile nav files remain behaviorally untouched, `*-desktop` tour anchors remain on desktop links. | Source assertions plus manual viewport checks. |
| Visual/manual | Logo/favicon legibility, sidebar contrast, keyboard focus in light/dark modes. | Browser smoke in mobile and desktop widths; inspect tab icons where supported. |

## Migration / Rollout

No data migration, backend change, or dual-currency transaction work. Ship on `feat/dark-branding-sidebar` as one visual-iteration PR for issue #7. Rollback is restoring prior brand asset references and top desktop nav layout.

## Open Questions

None blocking. Implementation only needs the approved dark-safe exported assets before wiring final paths.
