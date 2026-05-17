# Proposal: Mobile Savings Goal Edit

## Intent

Make savings goal editing discoverable and usable on mobile. The edit route, edit form, and backend update endpoint already exist; the gap is that `SavingsCard` hides actions behind hover, which is unreliable on touch devices.

## Scope

### In Scope
- Show the savings goal edit action by default on mobile/touch layouts.
- Preserve current desktop hover-reveal behavior where practical.
- Add/verify accessible `aria-label`/`title` copy for icon-only edit controls in English and Spanish.
- Validate that tapping edit navigates to `/savings/edit/:goalId` and existing submit flow still updates the goal.

### Out of Scope
- Backend/API/data-model changes.
- Redesigning the savings card layout or adding new edit flows.
- Changing delete behavior beyond avoiding regressions in the shared action area.
- Broad mobile navigation or savings list redesign.

## Capabilities

### New Capabilities
- `savings-goal-editing`: Savings goal edit affordance availability, accessibility, and routing behavior across mobile and desktop cards.

### Modified Capabilities
- None.

## Approach

Use the smallest frontend-only CSS/markup change in `SavingsCard`: action controls are visible on mobile by default, while desktop can keep opacity/hover behavior. Keep routing and mutation logic unchanged because `/savings/edit/:goalId`, `SavingsForm`, `useSavingsGoal`, and `updateSavingsGoal` already support editing.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/savings/components/SavingsCard.tsx` | Modified | Responsive action visibility and accessible edit labels/titles. |
| `frontend/src/features/savings/SavingsList.tsx` | Reviewed | Ensure card usage remains compatible on list layouts. |
| `frontend/src/i18n/locales/en/savings.json` | Modified | Add or reuse edit action label copy. |
| `frontend/src/i18n/locales/es/savings.json` | Modified | Add Spanish label parity. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desktop actions become too visually noisy | Low | Keep desktop hover behavior with responsive classes. |
| Mobile action remains hidden due to CSS ordering | Medium | Validate at mobile viewport/touch-like layout and add focused test coverage if feasible. |
| Icon-only edit remains unclear | Low | Provide accessible label/title; defer text button unless feedback shows it is needed. |

## Rollback Plan

Revert the `SavingsCard` responsive visibility and i18n label changes. Existing edit route/form/API remain untouched, so rollback restores prior card action behavior only.

## Dependencies

- Issue #11 and branch `fix/mobile-savings-goal-edit`.
- Existing edit route/form/API remain available.

## Success Criteria

- [ ] On mobile width, each savings goal card exposes an edit action without hover.
- [ ] Activating edit opens `/savings/edit/:goalId` and existing update flow succeeds.
- [ ] Desktop card action behavior is preserved.
- [ ] Edit action has localized accessible labels/titles.
