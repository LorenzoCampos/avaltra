import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const importerDocPath = path.resolve(__dirname, '../../../docs/IMPORTER.md');
const importerDoc = readFileSync(importerDocPath, 'utf8');

describe('Excel MEDIO Mapping and Docs / Documented import mapping', () => {
  it('documents the importer mapping, semantics, and MVP limits in product language', () => {
    expect(importerDoc).toContain('Excel column `MEDIO` maps to API field `payment_method`.');
    expect(importerDoc).toContain('Blank `MEDIO` maps to `null`.');
    expect(importerDoc).toContain('`account` still identifies where the transaction belongs.');
    expect(importerDoc).toContain('This importer MVP only accepts the normalized catalog documented above.');
    expect(importerDoc).toContain('transaction UI, and transaction exports.');
    expect(importerDoc).not.toContain('Expense visibility evidence');
    expect(importerDoc).not.toContain('Payment Method Semantics / Distinguish concepts');
  });
});
