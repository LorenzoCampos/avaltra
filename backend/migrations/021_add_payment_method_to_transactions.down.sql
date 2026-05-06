ALTER TABLE incomes
DROP CONSTRAINT IF EXISTS incomes_payment_method_check,
DROP COLUMN IF EXISTS payment_method;

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_payment_method_check,
DROP COLUMN IF EXISTS payment_method;
