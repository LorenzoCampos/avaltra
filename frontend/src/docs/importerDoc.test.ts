import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const importerDocPath = path.resolve(__dirname, '../../../docs/IMPORTER.md');
const importerDoc = readFileSync(importerDocPath, 'utf8');

describe('Excel MEDIO Mapping and Docs / Documented import mapping', () => {
  it('documents the importer mapping, semantics, and MVP limits in product language', () => {
    expect(importerDoc).toContain('Excel column `MEDIO` maps to API field `payment_method`.');
    expect(importerDoc).toContain('Blank `MEDIO` maps to `null`.');
    expect(importerDoc).toContain('This MVP only imports the workbook family derived from `Planilla de gastos diarios - En blanco 2026.xlsx`.');
    expect(importerDoc).toContain('The importer accepts trimmed month sheet names, so `Enero ` is still valid.');
    expect(importerDoc).toContain('`Ahorro` rows are reported as excluded and are never imported in this MVP.');
    expect(importerDoc).toContain('Each distinct Excel `CATEGORIA` used by importable rows needs an explicit destination category mapping before commit.');
    expect(importerDoc).toContain('Supported aliases include `efectivo`, `transferencia`, `debito`, `credito`, `mercado pago`, and `mp`.');
    expect(importerDoc).toContain('`account` still identifies where the transaction belongs.');
    expect(importerDoc).toContain('This importer MVP only accepts the normalized catalog documented above.');
    expect(importerDoc).toContain('transaction UI, and transaction exports.');
    expect(importerDoc).not.toContain('Expense visibility evidence');
    expect(importerDoc).not.toContain('Payment Method Semantics / Distinguish concepts');
  });
});
