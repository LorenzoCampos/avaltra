import { describe, expect, it } from 'vitest';

import { getPaymentMethodLabel, getPaymentMethodOptions } from './paymentMethods';

describe('payment method labels', () => {
  const t = (key: string) => `translated:${key}`;

  it('renders deterministic labels for visible expense and income values', () => {
    expect(getPaymentMethodLabel(t as never, 'cash')).toBe('translated:form.paymentMethod.options.cash');
    expect(getPaymentMethodLabel(t as never, 'credit_card')).toBe('translated:form.paymentMethod.options.credit_card');
  });

  it('builds options from the normalized MVP catalog only', () => {
    expect(getPaymentMethodOptions(t as never)).toEqual([
      { value: 'cash', label: 'translated:form.paymentMethod.options.cash' },
      { value: 'bank_transfer', label: 'translated:form.paymentMethod.options.bank_transfer' },
      { value: 'debit_card', label: 'translated:form.paymentMethod.options.debit_card' },
      { value: 'credit_card', label: 'translated:form.paymentMethod.options.credit_card' },
      { value: 'digital_wallet', label: 'translated:form.paymentMethod.options.digital_wallet' },
      { value: 'other', label: 'translated:form.paymentMethod.options.other' },
    ]);
  });
});
