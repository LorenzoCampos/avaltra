# Importer Notes

## Excel `MEDIO` → `payment_method`

- Excel column `MEDIO` maps to API field `payment_method`.
- Blank `MEDIO` maps to `null`.
- Supported normalized values for this MVP:
  - `cash`
  - `bank_transfer`
  - `debit_card`
  - `credit_card`
  - `digital_wallet`
  - `other`

## Semantics

- `payment_method` describes how the money moved (`cash`, `credit_card`, etc.).
- `account` still identifies where the transaction belongs.
- Importers and forms may capture `payment_method`, but they MUST NOT infer or rewrite `account` from `MEDIO`.

## MVP limits

- This importer MVP only accepts the normalized catalog documented above.
- Values outside that catalog must be normalized before import or left blank.
- Blank input remains the supported way to omit `payment_method` and persist `null`.

## Visibility

- `payment_method` remains optional for expenses and incomes.
- When present, the normalized value is shown in API responses, transaction UI, and transaction exports.
- When absent, UI surfaces may render an empty state such as `—`.
