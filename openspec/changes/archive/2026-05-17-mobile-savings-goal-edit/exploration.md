## Exploration: mobile-savings-goal-edit

### Current State
- The edit route already exists in frontend routing: `/savings/edit/:goalId` is wired to `SavingsForm` (`frontend/src/App.tsx`).
- `SavingsForm` supports edit mode by reading `goalId`, fetching existing goal data (`useSavingsGoal`), populating the form, and submitting update via `updateSavingsGoal` (`frontend/src/features/savings/SavingsForm.tsx`, `frontend/src/hooks/useSavings.ts`).
- Backend update API already exists and is registered: `PUT /api/savings-goals/:id` (`backend/internal/server/server.go`, `backend/internal/handlers/savings_goals/update.go`).
- Savings card edit/delete actions are only shown through hover opacity toggling (`onMouseEnter`/`onMouseLeave` + `opacity-0/100`) in `SavingsCard`.
- On touch/mobile, hover does not reliably exist, so edit action can remain hidden or undiscoverable.

### Affected Areas
- `frontend/src/features/savings/components/SavingsCard.tsx` — root cause location: hover-gated action visibility and icon-only affordance.
- `frontend/src/features/savings/SavingsList.tsx` — list composition context; card reused for both desktop and mobile.
- `frontend/src/i18n/locales/en/savings.json` — likely needs new label(s) for explicit edit affordance.
- `frontend/src/i18n/locales/es/savings.json` — same as above for Spanish locale parity.
- `frontend/src/App.tsx` — confirms route wiring already present and functional path exists.
- `frontend/src/hooks/useSavings.ts` — confirms update API integration and optimistic cache update.
- `backend/internal/server/server.go` — confirms update endpoint registration.
- `backend/internal/handlers/savings_goals/update.go` — confirms backend update behavior already implemented.

### Approaches
1. **Always-visible small edit action inside card header**
   - Pros: minimal code change, no new interaction model, reliable on touch devices, no backend impact.
   - Cons: slightly noisier card header on desktop compared to hover-only style.
   - Effort: Low.

2. **Responsive behavior: always show actions on mobile, keep hover behavior on desktop**
   - Pros: preserves current desktop polish while fixing mobile discoverability; smallest UX delta.
   - Cons: slightly more conditional CSS/logic than option 1.
   - Effort: Low.

3. **Add separate mobile action row/button (e.g., "Edit Goal")**
   - Pros: strongest discoverability and explicit text label.
   - Cons: larger visual/layout change, more i18n impact, higher chance of side effects.
   - Effort: Low-Medium.

### Recommendation
Use **Approach 2**: make edit action visible by default on mobile/touch breakpoints while keeping hover reveal on desktop. This is the smallest safe fix aligned with the request ("keep scope small") and avoids broad redesign. Include accessible labeling (aria-label/title) so icon-only action is understandable to assistive tech and clearer for users.

### Risks
- If CSS conditions are implemented incorrectly, actions could become always hidden/always visible across all breakpoints.
- Icon-only controls can still be low discoverability if spacing/contrast is weak; a minimal text hint may be needed if user feedback persists.

### Ready for Proposal
Yes — frontend-only UX adjustment. No backend/API changes required.
