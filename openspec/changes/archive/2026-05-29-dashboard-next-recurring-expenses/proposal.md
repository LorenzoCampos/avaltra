# Proposal: Dashboard Next Recurring Expenses

## Intent

Help users plan cash flow by showing the active account's projected recurring expenses for the next calendar month directly on the dashboard.

## Scope

### In Scope
- Add a dashboard insight/card for next-month recurring expenses.
- Extend `GET /api/dashboard/summary` with a backend-computed normalized amount for the active account.
- Define “next month” as the next calendar month, not the next 30 days.
- Render the returned API field in the frontend using existing dashboard/account currency behavior.

### Out of Scope
- Recurring generation scheduler changes, except reusable read-only projection helpers if needed.
- Transfers, places redesign, legacy media/instrument removal, or family/global totals.
- Client-side recurrence math as source of truth.

## Capabilities

### New Capabilities
- `dashboard-recurring-forecast`: Dashboard summary exposes next-calendar-month recurring expense projection for the active account.

### Modified Capabilities
- None.

## Approach

Backend remains source of truth. Add read-only recurrence projection in `backend/internal/handlers/dashboard/summary.go` that sums active account recurring expense occurrences whose projected date falls in the next calendar month. Return the total normalized to the account primary currency, using existing `amount_in_primary_currency` patterns/fallbacks. Frontend updates dashboard types and renders the returned value only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/handlers/dashboard/summary.go` | Modified | Add summary field and server-side projection. |
| `backend/internal/handlers/dashboard/summary_test.go` | Modified | Cover account scope, calendar-month window, currency normalization. |
| `frontend/src/types/dashboard.ts` | Modified | Add typed summary field. |
| `frontend/src/features/dashboard/Dashboard.tsx` | Modified | Render insight/card from API field. |
| `frontend/src/features/dashboard/Dashboard.test.ts` | Modified | Assert card semantics and no client recurrence math. |
| `frontend/src/i18n/locales/*/dashboard.json` | Modified | Add localized dashboard copy. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Recurrence projection differs from scheduler | Med | Reuse/extract recurrence date logic where practical and test month boundaries. |
| Currency fallback inconsistency | Med | Match existing normalized amount calculation patterns. |
| Scope drift to global totals | Low | Preserve `X-Account-ID` active-account behavior in API tests. |

## Rollback Plan

Remove the summary field, projection helper, UI card, translations, and related tests. Existing dashboard summary fields and recurring scheduler behavior remain unchanged.

## Dependencies

- Existing dashboard summary endpoint and active account `X-Account-ID` contract.
- Existing recurring expense template data and normalized currency fields.

## Success Criteria

- [ ] Dashboard shows next calendar month recurring expenses for the active account.
- [ ] API returns an account-primary-currency normalized amount.
- [ ] Tests cover calendar boundary, account isolation, and frontend rendering.
