# Design: Transaction History Hardening Tests

## Technical Approach

Add the smallest DOM-mounted frontend test slice that proves existing behavior from `transaction-history-test-hardening`: Activity rows navigate by click/keyboard only when routable, and expense/income pagination controls enforce boundaries and local page changes. Runtime components stay unchanged. Test runner support is expanded only because current Vitest discovery is `src/**/*.test.ts` and no DOM environment dependency is declared, which cannot run mounted TSX tests.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Mounted tests in affected feature/component files | More setup than pure helper tests, but verifies real DOM behavior required by the spec | Use DOM-mounted tests with `react-dom/client` and `act`; avoid Testing Library unless later needed |
| Add `*.test.tsx` discovery vs avoid JSX with `React.createElement` in `.test.ts` | Avoiding TSX keeps config stable but makes mounted tests noisy and less representative | Add `src/**/*.test.tsx` to `frontend/vite.config.ts` |
| `happy-dom`/DOM env vs static source assertions | DOM env adds one dev dependency, static checks do not prove mounted behavior | Add a Vitest DOM environment for the new mounted tests |
| Test list pagination through full `ExpenseList`/`IncomeList` pages vs shared control directly | Full pages require many hook/router/i18n mocks; shared control proves boundary/callback contract used by both lists with less churn | Test `ListPaginationControls` once for control mechanics, plus expense/income list tests focused on wiring/local-filter labels if feasible under budget |

## Data Flow

```text
ActivityFeed data -> ActivityCard -> getActivityTransactionRoute -> useNavigate(route)
                         └─ non-routable type/id -> no role/tabIndex/callback

ExpenseList/IncomeList pagination -> getListPaginationState -> ListPaginationControls
                                      Prev/Next -> setPage bounded callback
                                      local filters -> localFilterNotice only
```

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/vite.config.ts` | Modify | Include `src/**/*.test.tsx`; set/use DOM environment for mounted tests. |
| `frontend/package.json` | Modify | Add minimal DOM test dependency if not already available. |
| `frontend/pnpm-lock.yaml` | Modify | Lock the DOM test dependency. |
| `frontend/src/features/activity/components/ActivityFeed.test.tsx` | Create/Modify | Preserve existing helper assertions and add mounted click, Enter, Space, and non-routable no-navigation cases. |
| `frontend/src/components/ListPaginationControls.test.tsx` | Create | Test disabled first/last boundaries, valid previous/next callbacks, and local-filter notice rendering. |
| `frontend/src/features/expenses/ExpenseList.pagination.test.tsx` | Create if budget allows | Verify expense list passes page-local notice labels/wiring without changing list behavior. |
| `frontend/src/features/incomes/IncomeList.pagination.test.tsx` | Create if budget allows | Mirror expense wiring coverage for incomes. |

## Interfaces / Contracts

No runtime API changes. Tests should use existing public contracts:

```ts
getActivityTransactionRoute(activity): string | null
shouldHandleActivityNavigationKey(key): boolean
<ListPaginationControls pagination labels showLocalFilterNotice onPrevious onNext />
```

Mounted tests may mock `useActivity`, `useAccountStore`, `useMoneyFormatter`, `useTranslation`, and `useNavigate`; mocks must assert observable routes/buttons/text, not component internals.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Existing activity route/key helpers | Keep current `ActivityFeed.test.ts` assertions or move them into TSX test. |
| Mounted component | Activity row navigation and non-routable guard | Render `ActivityFeed` in memory, dispatch click/keydown on accessible row, assert mocked navigate calls. |
| Mounted component | Pagination boundaries/callbacks/local-filter notice | Render controls and list wiring with fixture pagination; click enabled controls, assert callbacks/visible disabled state. |
| E2E | Not applicable | No browser workflow change. |

## Migration / Rollout

No migration required. Rollback is removing new tests and reverting Vitest/package DOM-test support.

## Open Questions

- [ ] None blocking. Implementation should confirm whether adding the DOM dependency keeps the final diff near the 400-line review budget; if lockfile churn is high, prefer a follow-up PR or explicit size exception.
