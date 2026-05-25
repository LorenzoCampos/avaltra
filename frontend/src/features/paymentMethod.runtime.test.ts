import { describe, expect, it } from 'vitest';

import { buildQuickAddExpensePayload } from '@/components/quickAddExpense';
import { buildExpenseSubmitPayload } from '@/features/expenses/formSubmissions';
import { buildIncomeSubmitPayload } from '@/features/incomes/formSubmissions';

const expenseBase = {
  description: 'Supermercado',
  amount: 100,
  currency: 'ARS' as const,
  date: '2026-05-01',
  source_container_id: '11111111-1111-4111-8111-111111111111',
};

const incomeBase = {
  description: 'Sueldo',
  amount: 1000,
  currency: 'ARS' as const,
  date: '2026-05-01',
  destination_container_id: '11111111-1111-4111-8111-111111111111',
};

describe('Payment Method Semantics / Distinguish concepts', () => {
  it('keeps primary expense payment context place-only during submit mapping', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: 'credit_card' }, false)).toMatchObject({
      currency: 'ARS',
    });
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: 'credit_card' }, false)).not.toHaveProperty('payment_method');
  });
});

describe('Expense Visibility', () => {
  it('omits expense payment_method in the primary create/edit payload', () => {
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: '' as never }, false).payment_method).toBeUndefined();
    expect(buildExpenseSubmitPayload({ ...expenseBase, payment_method: '' as never }, true).payment_method).toBeUndefined();
  });

  it('keeps quick add optional while preserving normalized values when selected', () => {
    expect(
      buildQuickAddExpensePayload(
        { amount: 50, description: 'Taxi', category_id: null, family_member_id: null, payment_method: '' as never, source_container_id: expenseBase.source_container_id },
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
          source_container_id: expenseBase.source_container_id,
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
  it('omits income payment_method in the primary create/edit payload', () => {
    expect(buildIncomeSubmitPayload({ ...incomeBase, payment_method: '' as never }, false).payment_method).toBeUndefined();
    expect(buildIncomeSubmitPayload({ ...incomeBase, payment_method: '' as never }, true).payment_method).toBeUndefined();
  });
});
