import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expenseSchema } from '@/schemas/expense.schema';
import { incomeSchema } from '@/schemas/income.schema';
import { buildExpenseSubmitPayload } from '@/features/expenses/formSubmissions';
import { buildIncomeSubmitPayload } from '@/features/incomes/formSubmissions';
import { getPaymentContextLabel, resolvePaymentContextSelection, withRecurringExpensePaymentContext, withRecurringIncomePaymentContext } from '@/lib/paymentContext';
import type { PaymentInstrument } from '@/types/paymentInstrument';

const instrument = (overrides: Partial<PaymentInstrument> = {}): PaymentInstrument => ({
  id: '11111111-1111-4111-8111-111111111111',
  account_id: 'account-1',
  institution_id: null,
  backing_container_id: '22222222-2222-4222-8222-222222222222',
  name: 'Visa debit',
  kind: 'debit_card',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

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

const t = (key: string) => ({
  'form.paymentMethod.options.bank_transfer': 'Bank transfer',
  'form.paymentMethod.options.cash': 'Cash',
}[key] ?? key);

describe('transaction payment context form behavior', () => {
  it('keeps normalized selectors optional in expense and income schemas', () => {
    expect(expenseSchema.parse({ ...expenseBase, source_container_id: '', source_instrument_id: '' })).toMatchObject(expenseBase);
    expect(incomeSchema.parse({ ...incomeBase, destination_container_id: '', destination_instrument_id: '' })).toMatchObject(incomeBase);
  });

  it('submits expense and income payloads with place IDs only', () => {
    const instruments = [instrument()];

    expect(resolvePaymentContextSelection({ containerId: instruments[0].backing_container_id })).toEqual({
      containerId: instruments[0].backing_container_id,
    });

    const expensePayload = buildExpenseSubmitPayload({ ...expenseBase, source_container_id: instruments[0].backing_container_id, source_instrument_id: instruments[0].id }, false);
    expect(expensePayload).toMatchObject({
      source_container_id: instruments[0].backing_container_id,
    });
    expect(expensePayload).not.toHaveProperty('source_instrument_id');
    expect(expensePayload).not.toHaveProperty('payment_method');

    const incomePayload = buildIncomeSubmitPayload({ ...incomeBase, destination_container_id: instruments[0].backing_container_id, destination_instrument_id: instruments[0].id }, false);
    expect(incomePayload).toMatchObject({
      destination_container_id: instruments[0].backing_container_id,
    });
    expect(incomePayload).not.toHaveProperty('destination_instrument_id');
    expect(incomePayload).not.toHaveProperty('payment_method');
  });

  it('clears existing normalized selectors on edit when users submit blank selections', () => {
    expect(
      buildExpenseSubmitPayload({ ...expenseBase }, true, {
        containerId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toEqual(expect.objectContaining({ source_container_id: null }));

    expect(
      buildIncomeSubmitPayload({ ...incomeBase }, true, {
        containerId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toEqual(expect.objectContaining({ destination_container_id: null }));
  });

  it('builds recurring expense and income context payloads without primary instrument IDs', () => {
    const instruments = [instrument()];

    const expensePayload = withRecurringExpensePaymentContext({ description: 'Rent', source_container_id: instruments[0].backing_container_id, source_instrument_id: instruments[0].id });
    expect(expensePayload).toMatchObject({
      source_container_id: instruments[0].backing_container_id,
    });
    expect(expensePayload).not.toHaveProperty('source_instrument_id');

    const incomePayload = withRecurringIncomePaymentContext({ description: 'Salary' }, { containerId: '22222222-2222-4222-8222-222222222222' });
    expect(incomePayload).toMatchObject({
      destination_container_id: null,
    });
    expect(incomePayload).not.toHaveProperty('destination_instrument_id');
  });
});

describe('payment context display labels', () => {
  it('prefers normalized labels and falls back to legacy payment method labels', () => {
    expect(getPaymentContextLabel(t as never, { display_label: 'Visa debit', instrument_name: 'Visa debit', container_name: 'Bank', legacy_payment_method: 'cash', container_id: null, container_type: null, instrument_id: null, instrument_type: null }, 'cash')).toBe('Bank');
    expect(getPaymentContextLabel(t as never, { display_label: null, instrument_name: 'Visa debit', container_name: 'Bank', legacy_payment_method: 'cash', container_id: null, container_type: null, instrument_id: null, instrument_type: null }, 'cash')).toBe('Bank');
    expect(getPaymentContextLabel(t as never, { display_label: null, instrument_name: 'Visa debit', container_name: null, legacy_payment_method: 'cash', container_id: null, container_type: null, instrument_id: null, instrument_type: null }, 'cash')).toBe('Visa debit');
    expect(getPaymentContextLabel(t as never, null, 'bank_transfer')).toBe('Bank transfer');
    expect(getPaymentContextLabel(t as never, null, null)).toBeNull();
  });
});

describe('primary payment context UI source', () => {
  const projectRoot = resolve(__dirname, '..');
  const primaryFormSources = [
    'features/expenses/ExpenseForm.tsx',
    'features/incomes/IncomeForm.tsx',
    'features/recurring-expenses/RecurringExpenseForm.tsx',
    'features/recurring-incomes/RecurringIncomeForm.tsx',
  ].map((path) => readFileSync(resolve(projectRoot, path), 'utf8'));
  const primaryListSources = [
    'features/expenses/ExpenseList.tsx',
    'features/incomes/IncomeList.tsx',
  ].map((path) => readFileSync(resolve(projectRoot, path), 'utf8'));

  it('does not import payment-instrument hooks in primary transaction forms', () => {
    expect(primaryFormSources).toHaveLength(4);
    for (const source of primaryFormSources) {
      expect(source).not.toContain('usePaymentInstruments');
    }
  });

  it('does not render primary instrument selectors in transaction or recurring forms', () => {
    expect(primaryFormSources).toHaveLength(4);
    for (const source of primaryFormSources) {
      expect(source).not.toContain("register('source_instrument_id')");
      expect(source).not.toContain("register('destination_instrument_id')");
      expect(source).not.toContain('Payment instrument');
    }
  });

  it('does not render primary legacy payment method selectors in one-time transaction forms', () => {
    const oneTimeFormSources = primaryFormSources.slice(0, 2);

    expect(oneTimeFormSources).toHaveLength(2);
    for (const source of oneTimeFormSources) {
      expect(source).not.toContain("register('payment_method')");
      expect(source).not.toContain('paymentMethodOptions');
      expect(source).not.toContain('setValue(\'payment_method\'');
    }
  });

  it('does not copy legacy instrument IDs into duplicate transaction drafts', () => {
    expect(primaryListSources).toHaveLength(2);
    for (const source of primaryListSources) {
      expect(source).not.toContain('source_instrument_id:');
      expect(source).not.toContain('destination_instrument_id:');
    }
  });
});
