# Design: Recurring Payment Context

## Technical Approach

Add nullable payment-context refs to recurring templates, then thread those refs through recurring create/update/get/list handlers, frontend recurring forms, and scheduler generation. Generated expenses/incomes snapshot the template refs in their existing transaction columns at insert time; later template edits only affect future generated rows. Payment management UX stays in the current page but moves create/edit forms behind explicit buttons and modal-like separate surfaces to match the app's card/list pattern without adding new routes.

## Architecture Decisions

| Decision | Choice | Tradeoff / rationale |
|---|---|---|
| Migration shape | Add a new additive migration, e.g. `024_add_recurring_payment_context.up/down.sql`, instead of editing old `013/016` files. | Safer for existing environments; nullable FKs preserve old templates and require no backfill. |
| Column semantics | Expenses templates use `source_container_id/source_instrument_id`; income templates use `destination_container_id/destination_instrument_id`. | Aligns with one-time transaction naming and keeps direction explicit. |
| Validation | Extract/reuse payment-context ownership/backing checks from one-time handlers into shared transaction/domain helpers, then call them from recurring handlers. | Avoids validation drift; costs a small refactor before adding recurring fields. |
| Snapshot behavior | Scheduler reads template refs and inserts them into generated transaction rows only during generation. No update touches existing generated rows. | Implements future-only behavior and preserves history. |
| Management edit UX | Use create buttons plus modal/dialog-style edit/create panels within `PaymentContainersPage`, not dedicated routes. | Existing page is self-contained management UI; modal keeps context and avoids route churn while removing always-visible inline forms. |
| PR slicing | Two chained slices: recurring domain/forms first, management UX/i18n second. | Keeps review near the 400-line budget and separates data risk from UX polish. |

## Data Flow

Recurring form → recurring API → validate active container/instrument ownership → store nullable refs on template.

Daily scheduler → load active template refs → insert expense/income with current refs → increment occurrence.

Payment context page → click Create/Edit → panel form → hooks mutate → localized toast → list refresh.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/migrations/024_add_recurring_payment_context.up/down.sql` | Create | Add nullable template FKs, indexes, comments, rollback. |
| `backend/internal/transactions/payment_context.go` | Modify | Add reusable active ownership/backing validation helpers. |
| `backend/internal/handlers/recurring_expenses/{create,update,get,list}.go` | Modify | Accept, clear-on-null, validate, persist, and return source refs. |
| `backend/internal/handlers/recurring_incomes/{create,update,get,list}.go` | Modify | Same for destination refs. |
| `backend/pkg/scheduler/{recurring_expenses,recurring_incomes}.go` | Modify | Include refs in template structs, SELECTs, scans, and INSERTs. |
| `frontend/src/types/{recurringExpense,recurringIncome}.ts` | Modify | Add optional recurring payment-context fields. |
| `frontend/src/features/recurring-{expenses,incomes}/*Form.tsx` | Modify | Add selectors, defaults, edit hydration, submit cleanup. |
| `frontend/src/lib/paymentContext.ts` | Modify | Generalize selection helper for recurring requests. |
| `frontend/src/features/payment-containers/*` | Modify | Replace always-visible inline forms with create buttons and modal/panel edit flow. |
| `frontend/src/hooks/usePayment{Containers,Instruments}.ts`, `frontend/src/i18n/locales/{en,es}/*.json` | Modify | Localize toasts, validation, CTA/edit copy. |

## Interfaces / Contracts

```ts
type RecurringExpensePaymentContext = {
  source_container_id?: string | null;
  source_instrument_id?: string | null;
};
type RecurringIncomePaymentContext = {
  destination_container_id?: string | null;
  destination_instrument_id?: string | null;
};
```

Update must distinguish omitted fields from explicit `null` so users can clear saved refs. Generated transactions keep their existing one-time API contract.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend handler | create/update accepts, rejects inactive/foreign refs, clears refs, list/get returns refs | Add focused recurring handler tests or package-level tests mirroring one-time validation. |
| Scheduler | generated rows copy current template refs; old rows remain unchanged after template edit | Add scheduler tests around `generate*FromTemplate`/generation flow with template ref changes. |
| Frontend unit/runtime | recurring selector payload/hydration and generalized resolver | Extend payment context runtime tests and recurring form tests if harness exists. |
| UX/i18n | create buttons, edit panel behavior, no hardcoded English toasts/errors | Extend `paymentContainerManagement.test.ts` and locale key assertions/manual grep. |

## Migration / Rollout

Additive nullable migration; no backfill. Roll out Slice A backend before frontend selectors. Rollback uses down migration and UI revert; generated rows already copied into transaction columns remain valid.

## Open Questions

- [ ] Should inactive but already-selected template refs remain visible/editable on recurring edit screens, matching management inactive edit behavior?
