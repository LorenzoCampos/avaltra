CREATE TABLE payment_institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_institutions_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE payment_containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    institution_id UUID NULL REFERENCES payment_institutions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('bank', 'wallet', 'cash', 'other')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_containers_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE payment_instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    institution_id UUID NULL REFERENCES payment_institutions(id) ON DELETE SET NULL,
    backing_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('debit_card', 'credit_card', 'transfer', 'cash', 'other')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_instruments_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT card_instruments_require_backing_container CHECK (
        kind NOT IN ('debit_card', 'credit_card') OR backing_container_id IS NOT NULL
    )
);

ALTER TABLE expenses
    ADD COLUMN source_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL,
    ADD COLUMN source_instrument_id UUID NULL REFERENCES payment_instruments(id) ON DELETE SET NULL;

ALTER TABLE incomes
    ADD COLUMN destination_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL,
    ADD COLUMN destination_instrument_id UUID NULL REFERENCES payment_instruments(id) ON DELETE SET NULL;

CREATE INDEX idx_payment_institutions_account_active ON payment_institutions(account_id, is_active);
CREATE INDEX idx_payment_containers_account_active ON payment_containers(account_id, is_active);
CREATE INDEX idx_payment_instruments_account_active ON payment_instruments(account_id, is_active);
CREATE INDEX idx_payment_instruments_backing_container ON payment_instruments(backing_container_id);
CREATE INDEX idx_expenses_source_payment_context ON expenses(source_container_id, source_instrument_id);
CREATE INDEX idx_incomes_destination_payment_context ON incomes(destination_container_id, destination_instrument_id);
