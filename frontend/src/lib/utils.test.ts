import { describe, expect, it } from 'vitest';

import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats Spanish money with Spanish separators and exactly two decimals', () => {
    expect(formatCurrency(500000.4, 'ARS', { language: 'es' })).toContain('500.000,40');
  });

  it('formats English money with English separators and exactly two decimals', () => {
    expect(formatCurrency(500000.4, 'USD', { language: 'en' })).toContain('500,000.40');
  });

  it('falls back to English separators for unsupported language variants', () => {
    expect(formatCurrency(1234, 'EUR', { language: 'fr' })).toContain('1,234.00');
  });
});
