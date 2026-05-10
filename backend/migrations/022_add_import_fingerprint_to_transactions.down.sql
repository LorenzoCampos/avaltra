DROP INDEX IF EXISTS idx_incomes_import_fingerprint_unique;
DROP INDEX IF EXISTS idx_expenses_import_fingerprint_unique;

ALTER TABLE incomes
DROP COLUMN IF EXISTS import_fingerprint;

ALTER TABLE expenses
DROP COLUMN IF EXISTS import_fingerprint;
