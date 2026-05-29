CREATE TABLE IF NOT EXISTS place_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source_container_id UUID NOT NULL REFERENCES payment_containers(id) ON DELETE RESTRICT,
    destination_container_id UUID NOT NULL REFERENCES payment_containers(id) ON DELETE RESTRICT,
    amount NUMERIC(15,2) NOT NULL,
    currency currency NOT NULL DEFAULT 'ARS',
    date DATE NOT NULL,
    note TEXT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT place_transfers_amount_positive CHECK (amount > 0),
    CONSTRAINT place_transfers_distinct_containers CHECK (source_container_id <> destination_container_id)
);

CREATE INDEX IF NOT EXISTS idx_place_transfers_account_date ON place_transfers(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_place_transfers_source_container ON place_transfers(source_container_id);
CREATE INDEX IF NOT EXISTS idx_place_transfers_destination_container ON place_transfers(destination_container_id);
