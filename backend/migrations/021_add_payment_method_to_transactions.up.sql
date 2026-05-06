ALTER TABLE expenses
ADD COLUMN payment_method TEXT NULL,
ADD CONSTRAINT expenses_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'debit_card', 'credit_card', 'digital_wallet', 'other')
);

ALTER TABLE incomes
ADD COLUMN payment_method TEXT NULL,
ADD CONSTRAINT incomes_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'debit_card', 'credit_card', 'digital_wallet', 'other')
);
