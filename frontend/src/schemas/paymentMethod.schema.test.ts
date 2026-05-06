import { describe, expect, it } from 'vitest';

import { expenseSchema, updateExpenseSchema } from './expense.schema';
import { incomeSchema, updateIncomeSchema } from './income.schema';

const baseExpense = {
  description: 'Supermercado',
  amount: 100,
  currency: 'ARS' as const,
  date: '2026-01-16',
};

const baseIncome = {
  description: 'Sueldo',
  amount: 100,
  currency: 'ARS' as const,
  date: '2026-01-16',
};

const validId = '11111111-1111-4111-8111-111111111111';

describe('payment method zod schemas', () => {
  it('accepts omitted, null, and catalog values for expenses', () => {
    expect(expenseSchema.parse(baseExpense).payment_method).toBeUndefined();
    expect(expenseSchema.parse({ ...baseExpense, payment_method: null }).payment_method).toBeNull();
    expect(expenseSchema.parse({ ...baseExpense, payment_method: 'cash' }).payment_method).toBe('cash');
  });

  it('preprocesses empty expense selector values to omitted', () => {
    expect(expenseSchema.parse({ ...baseExpense, payment_method: '' }).payment_method).toBeUndefined();
    expect(updateExpenseSchema.parse({ id: validId, payment_method: '' }).payment_method).toBeUndefined();
  });

  it('rejects out-of-scope expense values', () => {
    expect(() => expenseSchema.parse({ ...baseExpense, payment_method: 'crypto' })).toThrow();
  });

  it('accepts omitted, null, and catalog values for incomes', () => {
    expect(incomeSchema.parse(baseIncome).payment_method).toBeUndefined();
    expect(incomeSchema.parse({ ...baseIncome, payment_method: null }).payment_method).toBeNull();
    expect(incomeSchema.parse({ ...baseIncome, payment_method: 'bank_transfer' }).payment_method).toBe('bank_transfer');
  });

  it('preprocesses empty income selector values to omitted', () => {
    expect(incomeSchema.parse({ ...baseIncome, payment_method: '' }).payment_method).toBeUndefined();
    expect(updateIncomeSchema.parse({ id: validId, payment_method: '' }).payment_method).toBeUndefined();
  });

  it('rejects out-of-scope income values', () => {
    expect(() => incomeSchema.parse({ ...baseIncome, payment_method: 'crypto' })).toThrow();
  });
});
