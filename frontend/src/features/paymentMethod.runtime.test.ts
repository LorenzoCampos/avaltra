import { describe, expect, it } from 'vitest';

import { buildQuickAddExpensePayload } from '@/components/QuickAddExpenseModal';
import {
  buildExpenseSubmitPayload,
  getExpenseFormPaymentMethodValue,
} from '@/features/expenses/ExpenseForm';
import {
  buildIncomeSubmitPayload,
  getIncomeFormPaymentMethodValue,
} from '@/features/incomes/IncomeForm';

const expenseBase = {
  description: 'Supermercado',
  amount: 100,
  currency: 'ARS' as const,
  date: '2026-05-01',
};

const incomeBase = {
  description: 'Sueldo',
  amount: 1000,
  currency: 'ARS' as const,
  date: '2026-05-01',
};

describe('Payment Method Semantics / Distinguish concepts', () => {
  it('keeps expense payment_method independent from account context during submit mapping', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: 'credit_card' }, false)).toMatchObject({
      payment_method: 'credit_card',
      currency: 'ARS',
    });
  });

  it('renders existing form values from stored payment methods only when present', () => {
    expect(getExpenseFormPaymentMethodValue('credit_card')).toBe('credit_card');
    expect(getExpenseFormPaymentMethodValue(null)).toBeUndefined();
    expect(getIncomeFormPaymentMethodValue('bank_transfer')).toBe('bank_transfer');
    expect(getIncomeFormPaymentMethodValue(undefined)).toBeUndefined();
  });
});

describe('Expense Visibility', () => {
  it('omits an empty expense selector on create without forcing null', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: '' as never }, false).payment_method).toBeUndefined();
  });

  it('clears an existing expense payment method with null on update', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: '' as never }, true, 'cash').payment_method).toBeNull();
  });

  it('keeps quick add optional while preserving normalized values when selected', () => {
    expect(
      buildQuickAddExpensePayload(
        { amount: 50, description: 'Taxi', category_id: null, family_member_id: null, payment_method: '' as never },
        'ARS',
        '2026-05-01',
      ).payment_method,
    ).toBeUndefined();

    expect(
      buildQuickAddExpensePayload(
        {
          amount: 50,
          description: 'Taxi',
          category_id: null,
          family_member_id: null,
          payment_method: 'debit_card',
        },
        'ARS',
        '2026-05-01',
      ).payment_method,
    ).toBe('debit_card');
  });
});

describe('MVP Boundaries / Out-of-scope request', () => {
  it('does not normalize unsupported custom values into the MVP payloads', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: 'crypto' as never }, false).payment_method).toBeUndefined();
    expect(buildIncomeSubmitPayload({ ...incomeBase, payment_method: 'wire_card' as never }, false).payment_method).toBeUndefined();
  });
});

describe('IncomeForm runtime behavior', () => {
  it('omits an empty income selector on create and clears it on update when needed', () => {
    expect(buildIncomeSubmitPayload({ ...incomeBase, payment_method: '' as never }, false).payment_method).toBeUndefined();
    expect(buildIncomeSubmitPayload({ ...incomeBase, payment_method: '' as never }, true, 'bank_transfer').payment_method).toBeNull();
  });
});
