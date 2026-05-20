ALTER TABLE recurring_expenses
  ADD COLUMN source_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL,
  ADD COLUMN source_instrument_id UUID NULL REFERENCES payment_instruments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_source_container_id ON recurring_expenses(source_container_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_source_instrument_id ON recurring_expenses(source_instrument_id);

ALTER TABLE recurring_incomes
  ADD COLUMN destination_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL,
  ADD COLUMN destination_instrument_id UUID NULL REFERENCES payment_instruments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_incomes_destination_container_id ON recurring_incomes(destination_container_id);
CREATE INDEX IF NOT EXISTS idx_recurring_incomes_destination_instrument_id ON recurring_incomes(destination_instrument_id);

COMMENT ON COLUMN recurring_expenses.source_container_id IS 'Optional payment container snapshot source for future generated expenses';
COMMENT ON COLUMN recurring_expenses.source_instrument_id IS 'Optional payment instrument snapshot source for future generated expenses';
COMMENT ON COLUMN recurring_incomes.destination_container_id IS 'Optional payment container snapshot destination for future generated incomes';
COMMENT ON COLUMN recurring_incomes.destination_instrument_id IS 'Optional payment instrument snapshot destination for future generated incomes';
