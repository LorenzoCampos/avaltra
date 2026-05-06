import { describe, expect, it } from 'vitest';

import {
  isPaymentMethod,
  normalizePaymentMethodForCreate,
  normalizePaymentMethodForForm,
  normalizePaymentMethodForUpdate,
} from './paymentMethod';

describe('payment method normalization', () => {
  it('omits empty selector values on create', () => {
    expect(normalizePaymentMethodForCreate('')).toBeUndefined();
    expect(normalizePaymentMethodForCreate(undefined)).toBeUndefined();
  });

  it('maps valid selector values on create', () => {
    expect(normalizePaymentMethodForCreate('cash')).toBe('cash');
    expect(normalizePaymentMethodForCreate('bank_transfer')).toBe('bank_transfer');
  });

  it('clears existing values with null on update', () => {
    expect(normalizePaymentMethodForUpdate('', 'credit_card')).toBeNull();
    expect(normalizePaymentMethodForUpdate(undefined, 'credit_card')).toBeNull();
  });

  it('keeps empty selector omitted on update when there is no existing value', () => {
    expect(normalizePaymentMethodForUpdate('', undefined)).toBeUndefined();
    expect(normalizePaymentMethodForUpdate(undefined, undefined)).toBeUndefined();
  });

  it('preserves valid values on update', () => {
    expect(normalizePaymentMethodForUpdate('debit_card', 'cash')).toBe('debit_card');
  });

  it('normalizes existing API values for selector rendering', () => {
    expect(normalizePaymentMethodForForm('digital_wallet')).toBe('digital_wallet');
    expect(normalizePaymentMethodForForm(null)).toBeUndefined();
    expect(normalizePaymentMethodForForm(undefined)).toBeUndefined();
  });

  it('distinguishes supported methods from out-of-scope values', () => {
    expect(isPaymentMethod('cash')).toBe(true);
    expect(isPaymentMethod('account')).toBe(false);
    expect(isPaymentMethod('crypto')).toBe(false);
  });
});
