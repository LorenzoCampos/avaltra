ALTER TABLE expenses
ADD COLUMN import_fingerprint TEXT NULL;

ALTER TABLE incomes
ADD COLUMN import_fingerprint TEXT NULL;

CREATE UNIQUE INDEX idx_expenses_import_fingerprint_unique
ON expenses(import_fingerprint)
WHERE import_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX idx_incomes_import_fingerprint_unique
ON incomes(import_fingerprint)
WHERE import_fingerprint IS NOT NULL;
