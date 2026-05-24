## Exploration: required-default-places

### Current State
- One-time expense/income create flows treat `source_container_id` / `destination_container_id` as optional in both frontend schemas and backend request handlers (`frontend/src/schemas/{expense,income}.schema.ts`, `backend/internal/handlers/{expenses,incomes}/create.go`).
- Backend payment-context validation already enforces that provided places are active and belong to the active account, and rejects inactive/mismatched refs (`backend/internal/transactions/payment_context.go`).
- Recurring expense/income templates also keep container fields optional in API and forms; generation copies template container into generated rows when present, but does not require one (`backend/internal/handlers/recurring_*/create.go`, `frontend/src/features/recurring-*/Recurring*Form.tsx`).
- Importer commit flow can create transactions without place if deterministic mapping is unavailable; this is explicitly compatible behavior today (`backend/internal/handlers/imports/commit.go`, `openspec/specs/payment-containers/spec.md`).
- User-level preferences already exist for `default_account_id` on `users`, exposed in settings and used to preselect account/currency (`backend/migrations/018_add_default_account_to_users.up.sql`, `frontend/src/features/settings/UserSettings.tsx`).
- There is currently no default place setting on user/account, and no place field in quick add expense modal (still payment-method centric) (`frontend/src/components/QuickAddExpenseModal.tsx`).
- Savings goal fund add/withdraw flows do not track place at all, only amount/date/description against goal balance (`backend/internal/handlers/savings_goals/{add_funds,withdraw_funds}.go`).

### Affected Areas
- `backend/internal/handlers/{expenses,incomes}/create.go` — enforce required place for manual create flows.
- `frontend/src/schemas/{expense,income}.schema.ts` + `frontend/src/features/{expenses,incomes}/*Form.tsx` — required validation and UX for place selection.
- `frontend/src/components/QuickAddExpenseModal.tsx` — decide if out-of-scope (recommended) or align to required place to avoid inconsistent create entrypoint.
- `backend/migrations/*` + user/account handlers/types (`backend/internal/handlers/users/*.go`, `frontend/src/types/user.ts`, `frontend/src/hooks/useUser.ts`, settings UI) — add/read/update default place preference.
- `backend/internal/handlers/payment_containers/list.go` + frontend container hooks/forms — resolve empty-state UX when no active places exist.
- `backend/internal/handlers/recurring_*/create.go` and recurring forms — optional vs required behavior decision for recurring templates.
- `backend/internal/handlers/imports/commit.go` — preserve non-blocking importer behavior despite stricter manual create rules.

### Approaches
1. **Account-level default place (recommended)** — store `default_source_container_id` and `default_destination_container_id` on `accounts`.
   - Pros: aligns with account-scoped place entities (`payment_containers.account_id`), supports different defaults per account naturally, works for shared/family account context, and avoids user preference pointing to inaccessible account data.
   - Cons: needs account settings surface and account update/read contract changes.
   - Effort: Medium.

2. **User-level default place** — store one default place on `users`.
   - Pros: mirrors existing `default_account_id` UX pattern.
   - Cons: technically mismatched because places are account-scoped; single user default breaks in multi-account usage; requires brittle cross-account validation and reset logic when account switches.
   - Effort: Medium (with higher correctness risk).

3. **Household/family-level default place** — store default per family/account-member construct.
   - Pros: can model shared household behavior explicitly later.
   - Cons: current model has no true multi-user household principal; `family_members` are labels, not auth principals. Adds complexity without current product need.
   - Effort: High.

### Recommendation
Use **Approach 1 (account-level defaults)** and scope this change to:

1) **Manual one-time expenses/incomes MUST require place** (`source_container_id` / `destination_container_id`) in frontend and backend.
2) Add **account-level default place preferences** with two optional fields:
   - `default_expense_container_id`
   - `default_income_container_id`
   (A single shared default can be a UX shortcut later, but split fields avoid semantic mismatch source vs destination.)
3) Keep importer compatibility: importer stays non-blocking when no deterministic place mapping exists.
4) Keep savings-goal place tracking and transfers out of scope; only reserve future note in proposal/spec.

Recurring decision:
- **Required for recurring now: No.** Keep recurring container optional in this change to avoid scheduler/template migration risk and to keep scope focused on manual balance trust + friction reduction.
- **Default prefill for recurring create: Yes (optional UX).** Reuse account default as initial form value, but allow clearing.

No places exist handling:
- Manual expense/income create should block submit with actionable UX: “Create a place first.”
- Provide inline CTA to `/payment-containers` (or equivalent) and preserve draft form state on return when feasible.

Inactive/archived place handling:
- New creates: only active places selectable.
- Editing existing rows/templates: show linked inactive place as selectable/readable sentinel (“{name} (inactive)”) to avoid data loss; require reselect if user changes away.
- If default place becomes inactive/deleted: ignore prefill at runtime, surface non-blocking warning in settings, and allow user to replace default.

### Risks
- **Entrypoint inconsistency risk:** quick-add expense currently has no place field; if not addressed in scope, users can bypass required-place intent.
- **Validation layering risk:** frontend required checks without backend enforcement can regress via API clients; backend must be source of truth.
- **Default integrity risk:** defaults can become stale when place deactivates; needs defensive nulling/ignore behavior.
- **Scope creep risk:** recurring, savings-goal place accounting, and transfers can balloon this change if not explicitly deferred.

### Ready for Proposal
Yes — ready for proposal with one explicit fork to lock before apply:
- include quick-add in this change (recommended) vs temporarily disable quick-add creation path for expenses until it supports required place.

Suggested delivery slicing (ask-on-risk, 400-line guard):
- **PR1 (backend contract + migration):** required manual place validation, account default place fields + API.
- **PR2 (frontend manual forms + settings):** required selectors, default prefill, no-place CTA, inactive default warning.
- **PR3 (entrypoint consistency + tests):** quick-add alignment/guard + regression tests; recurring default-prefill (optional) if still within budget.
