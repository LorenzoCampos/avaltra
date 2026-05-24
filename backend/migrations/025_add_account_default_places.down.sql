DROP INDEX IF EXISTS idx_accounts_default_income_container;
DROP INDEX IF EXISTS idx_accounts_default_expense_container;

ALTER TABLE accounts
    DROP COLUMN IF EXISTS default_income_container_id,
    DROP COLUMN IF EXISTS default_expense_container_id;
