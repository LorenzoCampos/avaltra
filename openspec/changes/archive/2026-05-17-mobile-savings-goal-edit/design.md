# Design: Mobile Savings Goal Edit

## Technical Approach

Apply a narrow frontend-only update to `SavingsCard` so the existing edit button is visible by default on mobile and still hover-revealed on desktop. Keep navigation to the existing `/savings/edit/:goalId` route and the existing `SavingsForm` update flow unchanged. Add localized accessible names/titles for icon-only edit/delete controls where the card action cluster currently lacks labels.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale / tradeoff |
|---|---|---|---|
| Responsive visibility stays inside `SavingsCard` | Change the action wrapper classes to be visible at base/mobile sizes and opacity-gated only from `md` upward, e.g. `opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100`. | Add a separate mobile edit button, move edit into list/header, or create a card action menu. | Smallest scope and preserves the existing component ownership. Avoids duplicated routing controls and avoids a card redesign. |
| Use CSS group/focus instead of JS hover state | Add `group` to `Card` and remove `showActions`/`useState` if no longer needed. | Keep `onMouseEnter`/`onMouseLeave` state with responsive class branching. | CSS handles hover and keyboard focus predictably, reduces React state, and works better across touch devices. Tradeoff: relies on Tailwind responsive/group variants already used by the project style. |
| Reuse existing route/form contracts | Keep `navigate(`/savings/edit/${goal.id}`)`, `App.tsx` route, `SavingsForm`, `useSavingsGoal`, and `updateSavingsGoal` unchanged. | Introduce a new mobile edit route or modal. | Spec explicitly forbids new backend/domain behavior and asks for the existing edit flow. |
| Localize icon-only action names in `savings.card` | Add `editActionLabel` and, optionally, `deleteActionLabel` to English/Spanish savings locale files. Use them for both `aria-label` and `title`. | Hard-code English labels or reuse form title copy. | Locale parity keeps accessibility text consistent. Dedicated card action keys avoid coupling button labels to page titles. |

## Data Flow

```text
SavingsList ──maps goals──> SavingsCard(goal)
SavingsCard edit button ──onClick──> navigate('/savings/edit/' + goal.id)
React Router ──matches──> SavingsForm
SavingsForm ──goalId──> useSavingsGoal(goalId)
submit ──> updateSavingsGoal({ goalId, data }) ──onSuccess──> navigate('/savings')
```

Delete/add/withdraw flows remain owned by `SavingsList` callbacks and should not be structurally changed.

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/src/features/savings/components/SavingsCard.tsx` | Modify | Make the top-right action cluster visible on mobile, preserve desktop hover/focus reveal, add localized `aria-label`/`title`, and mark icons `aria-hidden`. Remove hover state if replaced by CSS. |
| `frontend/src/i18n/locales/en/savings.json` | Modify | Add English card action accessibility copy, e.g. “Edit goal” and “Delete goal”. |
| `frontend/src/i18n/locales/es/savings.json` | Modify | Add Spanish parity copy, e.g. “Editar objetivo” and “Eliminar objetivo”. |
| `frontend/src/features/savings/SavingsList.tsx` | Review only | No expected changes; confirm card props and grid layout still work. |
| `frontend/src/App.tsx` / `frontend/src/features/savings/SavingsForm.tsx` | Review only | No expected changes; existing route and update form already satisfy routing/update requirements. |
| `frontend/src/features/savings/components/SavingsCard.test.ts` | Create if feasible | Source/component-level Vitest coverage for responsive classes, labels/titles, route string, and focus reveal classes. |

## Interfaces / Contracts

No API/domain/type contract changes. `SavingsCardProps` remains unchanged:

```ts
goal: SavingsGoal;
onDelete(id: string): void;
onAddFunds(goal: SavingsGoal): void;
onWithdrawFunds(goal: SavingsGoal): void;
```

New i18n keys under `card`: `editActionLabel`, `deleteActionLabel`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/source | Mobile-visible base class, desktop `md:` hover/focus reveal classes, localized `aria-label`/`title`, edit route string. | Add a focused Vitest source assertion similar to existing lightweight component tests. |
| Integration/manual | Mobile card displays edit without hover; desktop actions still reveal on hover/focus; keyboard tab reaches edit before delete. | Run app locally and inspect mobile/desktop viewport behavior. |
| Regression | Existing edit submit flow unchanged. | Run `npm test` and `npm run typecheck` in `frontend`; rely on unchanged `SavingsForm` path plus manual route check. |

## Migration / Rollout

No migration required. Rollout is a static frontend change on branch `fix/mobile-savings-goal-edit`; rollback reverts `SavingsCard` classes and locale keys.

## Open Questions

None blocking.
