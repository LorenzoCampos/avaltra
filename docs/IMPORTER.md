# Importer Notes

## Workbook scope

- This MVP only imports the workbook family derived from `Planilla de gastos diarios - En blanco 2026.xlsx`.
- Required monthly sheets are `Enero` through `Diciembre`; non-month summary tabs are ignored.
- The importer accepts trimmed month sheet names, so `Enero ` is still valid.
- Preview reads only the expected row-7 headers `FECHA | CONCEPTO | IMPORTE | TIPO | MEDIO | CATEGORIA` and rows `8:109` from columns `B:G`.

## Excel `MEDIO` → `payment_method`

- Excel column `MEDIO` maps to API field `payment_method`.
- Blank `MEDIO` maps to `null`.
- Supported aliases include `efectivo`, `transferencia`, `debito`, `credito`, `mercado pago`, and `mp`.
- Supported normalized values for this MVP:
  - `cash`
  - `bank_transfer`
  - `debit_card`
  - `credit_card`
  - `digital_wallet`

## Semantics

- `payment_method` describes how the money moved (`cash`, `credit_card`, etc.).
- `account` still identifies where the transaction belongs.
- Importers and forms may capture `payment_method`, but they MUST NOT infer or rewrite `account` from `MEDIO`.

## MVP limits

- This importer MVP only accepts the normalized catalog documented above.
- Values outside that catalog must be normalized before import or left blank.
- Blank input remains the supported way to omit `payment_method` and persist `null`.
- `Ahorro` rows are reported as excluded and are never imported in this MVP.
- Each distinct Excel `CATEGORIA` used by importable rows needs an explicit destination category mapping before commit.
- Preview is read-only; commit re-uploads the workbook plus approved row IDs and category decisions.

## Visibility

- `payment_method` remains optional for expenses and incomes.
- When present, the normalized value is shown in API responses, transaction UI, and transaction exports.
- When absent, UI surfaces may render an empty state such as `—`.
