ALTER TABLE expenses
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE incomes
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX idx_expenses_account_date_active
ON expenses (account_id, date DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_incomes_account_date_active
ON incomes (account_id, date DESC)
WHERE deleted_at IS NULL;
