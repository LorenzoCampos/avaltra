ALTER TABLE recurring_incomes
  DROP COLUMN IF EXISTS destination_instrument_id,
  DROP COLUMN IF EXISTS destination_container_id;

ALTER TABLE recurring_expenses
  DROP COLUMN IF EXISTS source_instrument_id,
  DROP COLUMN IF EXISTS source_container_id;
