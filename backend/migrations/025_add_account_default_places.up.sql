ALTER TABLE accounts
    ADD COLUMN default_expense_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL,
    ADD COLUMN default_income_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL;

CREATE INDEX idx_accounts_default_expense_container ON accounts(default_expense_container_id);
CREATE INDEX idx_accounts_default_income_container ON accounts(default_income_container_id);
