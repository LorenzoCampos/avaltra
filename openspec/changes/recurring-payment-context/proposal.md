# Proposal: Recurring Payment Context

## Intent

Add normalized payment context to recurring templates and make payment context management coherent, localized, and app-consistent.

## Scope

### Current PR1 Boundary
- Store optional container/instrument on recurring expense/income templates.
- Copy template context only into future generated expenses/incomes.
- Preserve already-generated transactions when templates are edited.
- Add recurring form selectors with edit hydration.

Payment context management UX/i18n work remains part of the broader change, but is explicitly deferred to PR2 and MUST NOT be packaged as completed PR1 scope.

### Overall Change Scope
- Store optional container/instrument on recurring expense/income templates.
- Copy template context only into future generated expenses/incomes.
- Preserve already-generated transactions when templates are edited.
- Add recurring form selectors with edit hydration.
- Future PR2: refactor payment context management to use create buttons and separate edit surfaces.
- Future PR2: localize remaining English strings using existing i18n conventions.

### Out of Scope
- Retroactive updates/backfills.
- Split payments, transfers, reconciliation, or required context.
- New payment container domain concepts beyond existing container/instrument model.

## Capabilities

### New Capabilities
- `recurring-payment-context`: Templates carry optional normalized payment context; generated occurrences inherit current template context at generation time only.

### Modified Capabilities
- `payment-containers`: Management UX must align with app patterns, use create/edit affordances, and localize visible text, validation, and mutation feedback.

## Approach

Use one SDD change with two review slices. Slice A adds nullable recurring template FKs, handlers, scheduler propagation, and form selectors. Slice B refactors management UX and i18n. Reuse one-time payment-context validation patterns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/013_*`, `016_*` | Modified | Add nullable template context refs. |
| `backend/internal/handlers/recurring_*` | Modified | Accept, persist, return, validate context. |
| `backend/pkg/scheduler/recurring_*` | Modified | Copy context into generated rows. |
| `frontend/src/features/recurring-*` | Modified | Add selectors/hydration. |
| `frontend/src/features/payment-containers` | Future PR2 | Create CTA and separate edit view/modal flow. |
| `frontend/src/hooks/usePayment*`, `frontend/src/i18n/locales/*` | Future PR2 | Localize toasts, validation, UX text. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Historical rows changed | Med | Write only templates/generation inserts; test future-only behavior. |
| Validation drift | Med | Reuse or mirror existing helpers. |
| UX scope creep | Med | Constrain to create/edit separation and localization polish. |

## Rollback Plan

Revert UI/handler/scheduler changes and remove nullable columns via down migration. No backfill means no transaction repair.

## Dependencies

- Existing `payment-containers` capability and normalized transaction columns.
- Existing recurring generation jobs and recurring template forms.

## Success Criteria

- [ ] Recurring templates save optional container/instrument context.
- [ ] Future generated expenses/incomes inherit current template context.
- [ ] Existing generated transactions remain unchanged after template edits.
- [ ] Future PR2: payment context management uses create buttons and separate edit flow.
- [ ] Future PR2: no visible payment context management strings remain hardcoded English.
