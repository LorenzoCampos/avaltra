DROP INDEX IF EXISTS idx_incomes_destination_payment_context;
DROP INDEX IF EXISTS idx_expenses_source_payment_context;
DROP INDEX IF EXISTS idx_payment_instruments_backing_container;
DROP INDEX IF EXISTS idx_payment_instruments_account_active;
DROP INDEX IF EXISTS idx_payment_containers_account_active;
DROP INDEX IF EXISTS idx_payment_institutions_account_active;

ALTER TABLE incomes
    DROP COLUMN IF EXISTS destination_instrument_id,
    DROP COLUMN IF EXISTS destination_container_id;

ALTER TABLE expenses
    DROP COLUMN IF EXISTS source_instrument_id,
    DROP COLUMN IF EXISTS source_container_id;

DROP TABLE IF EXISTS payment_instruments;
DROP TABLE IF EXISTS payment_containers;
DROP TABLE IF EXISTS payment_institutions;
