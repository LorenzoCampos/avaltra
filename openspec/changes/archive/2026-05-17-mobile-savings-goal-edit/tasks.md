# Tasks: Mobile Savings Goal Edit

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Mobile-visible card actions + a11y/i18n + tests | PR 1 | Base: `fix/mobile-savings-goal-edit`; include verification commands |

## Phase 1: Foundation / Scope Guard

- [x] 1.1 Review current behavior in `frontend/src/features/savings/components/SavingsCard.tsx`; confirm hover/state classes and note exact selectors to replace without changing callbacks.
- [x] 1.2 Verify no route/form/backend edits are required by checking `frontend/src/App.tsx` and `frontend/src/features/savings/SavingsForm.tsx`; keep these files unchanged unless a blocker is found.

## Phase 2: Core Implementation

- [x] 2.1 Update action-container classes in `frontend/src/features/savings/components/SavingsCard.tsx` to be visible by default on mobile and reveal-on-hover/focus from `md` up (`group`, `md:group-hover:*`, `md:focus-within:*`).
- [x] 2.2 Remove JS-only hover state in `SavingsCard.tsx` if no longer needed (`useState`, `onMouseEnter`, `onMouseLeave`) and keep existing `onClick` handlers for edit/delete/add/withdraw unchanged.
- [x] 2.3 Add localized `aria-label` and `title` for icon-only edit/delete controls in `SavingsCard.tsx`; mark decorative icons as `aria-hidden`.
- [x] 2.4 Add/align i18n keys under `card` in `frontend/src/i18n/locales/en/savings.json` and `frontend/src/i18n/locales/es/savings.json` (`editActionLabel`, `deleteActionLabel`) with parity.

## Phase 3: Integration / Wiring Validation

- [x] 3.1 Confirm `SavingsCard` usage in `frontend/src/features/savings/SavingsList.tsx` still passes required props and layout stays narrow-scope (no card redesign).
- [x] 3.2 Verify edit navigation path remains `navigate(`/savings/edit/${goal.id}`)` in `SavingsCard.tsx` and still targets existing route contract.

## Phase 4: Testing / Verification

- [x] 4.1 Create or update `frontend/src/features/savings/components/SavingsCard.test.ts` to cover: mobile-visible action classes, desktop `md:` hover/focus classes, localized `aria-label`/`title`, and edit route activation.
- [x] 4.2 Run frontend checks from `frontend/`: `npm test` and `npm run typecheck`; capture failures and only adjust files in this change scope.
- [ ] 4.3 Manual verification: mobile viewport shows edit without hover; desktop hover/focus behavior preserved; keyboard tab reaches edit action and activation works.

## Phase 5: Cleanup / Evidence

- [x] 5.1 Reconfirm no backend/domain file changes were introduced (only `frontend/src/features/savings/components/SavingsCard.tsx`, locale JSONs, and test file expected).
- [ ] 5.2 Update this tasks file checkboxes during apply and link execution notes to Issue #11 in PR description.
