DROP INDEX IF EXISTS idx_incomes_account_date_active;
DROP INDEX IF EXISTS idx_expenses_account_date_active;

ALTER TABLE incomes
DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE expenses
DROP COLUMN IF EXISTS deleted_at;
