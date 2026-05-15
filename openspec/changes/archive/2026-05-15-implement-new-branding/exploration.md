## Exploration: implement-new-branding

### Current State
Branding assets exist under `branding/` with complete variants: `Isotipo`, `Imagotipo`, and `Avaltra` in SVG/PNG/PDF. SVGs define an explicit brand palette and gradient: Trust Blue `#003366`, Growth Teal `#008080`, Innovation Aqua `#33CCCC`, Graphite Grey, Cloud Grey, and white.

### Observations
- The app already has a theming system; branding should avoid renaming the persisted theme key unless needed.
- Directly importing from `branding/` is awkward for Vite metadata and PWA icons, so stable public copies are likely needed.
- A broad `blue-*` replacement would be too risky; a token-first migration is safer.

### Risks
- Contrast may regress if brand colors are used as both background and text without semantic separation.
- PWA icon handling can vary by platform; PNG fallbacks are likely necessary.
- Unscoped branding changes could spill into unrelated feature flows.

### Recommendation
Use a narrow rollout: public brand assets, semantic tokens, shared primitives, then key surfaces and export branding. Validate both light and dark contrast before expanding usage.
