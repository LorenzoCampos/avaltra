import { describe, expect, it } from 'vitest';

import { expenseSchema } from './expense.schema';
import { incomeSchema } from './income.schema';

const validExpense = {
  description: 'Groceries',
  amount: 10,
  currency: 'ARS' as const,
  date: '2026-05-24',
  source_container_id: '11111111-1111-4111-8111-111111111111',
};

const validIncome = {
  description: 'Salary',
  amount: 100,
  currency: 'ARS' as const,
  date: '2026-05-24',
  destination_container_id: '22222222-2222-4222-8222-222222222222',
};

describe('manual transaction place validation', () => {
  it('requires an expense source place', () => {
    expect(expenseSchema.safeParse({ ...validExpense, source_container_id: '' }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...validExpense, source_container_id: undefined }).success).toBe(false);
    expect(expenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it('requires an income destination place', () => {
    expect(incomeSchema.safeParse({ ...validIncome, destination_container_id: '' }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...validIncome, destination_container_id: undefined }).success).toBe(false);
    expect(incomeSchema.safeParse(validIncome).success).toBe(true);
  });
});
