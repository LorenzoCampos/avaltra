import { describe, expect, it } from 'vitest';

import { toDateInputValue } from './dateInput';

describe('toDateInputValue', () => {
  it('keeps canonical date input values unchanged', () => {
    expect(toDateInputValue('2026-01-16')).toBe('2026-01-16');
  });

  it('normalizes timestamp-like values to YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-01-16T03:00:00Z')).toBe('2026-01-16');
    expect(toDateInputValue('2026-01-16 00:00:00 +0000 UTC')).toBe('2026-01-16');
  });

  it('keeps optional missing values safe', () => {
    expect(toDateInputValue(null)).toBeNull();
    expect(toDateInputValue(undefined)).toBeNull();
    expect(toDateInputValue('')).toBeNull();
  });
});
