import { describe, expect, it } from 'vitest';

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

  it('backs an instrument with its container before submitting expense and income payloads', () => {
    const instruments = [instrument()];

    expect(resolvePaymentContextSelection({ instrumentId: instruments[0].id, instruments })).toEqual({
      containerId: instruments[0].backing_container_id,
      instrumentId: instruments[0].id,
    });

    expect(buildExpenseSubmitPayload({ ...expenseBase, source_instrument_id: instruments[0].id }, false, undefined, instruments)).toMatchObject({
      source_container_id: instruments[0].backing_container_id,
      source_instrument_id: instruments[0].id,
    });

    expect(buildIncomeSubmitPayload({ ...incomeBase, destination_instrument_id: instruments[0].id }, false, undefined, instruments)).toMatchObject({
      destination_container_id: instruments[0].backing_container_id,
      destination_instrument_id: instruments[0].id,
    });
  });

  it('clears existing normalized selectors on edit when users submit blank selections', () => {
    expect(
      buildExpenseSubmitPayload({ ...expenseBase }, true, null, [], {
        containerId: '22222222-2222-4222-8222-222222222222',
        instrumentId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toMatchObject({ source_container_id: null, source_instrument_id: null });

    expect(
      buildIncomeSubmitPayload({ ...incomeBase }, true, null, [], {
        containerId: '22222222-2222-4222-8222-222222222222',
        instrumentId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toMatchObject({ destination_container_id: null, destination_instrument_id: null });
  });

  it('builds recurring expense and income context payloads with edit clearing', () => {
    const instruments = [instrument()];

    expect(withRecurringExpensePaymentContext({ description: 'Rent', source_instrument_id: instruments[0].id }, instruments)).toMatchObject({
      source_container_id: instruments[0].backing_container_id,
      source_instrument_id: instruments[0].id,
    });
    expect(withRecurringIncomePaymentContext({ description: 'Salary' }, [], { containerId: '22222222-2222-4222-8222-222222222222', instrumentId: instruments[0].id })).toMatchObject({
      destination_container_id: null,
      destination_instrument_id: null,
    });
  });
});

describe('payment context display labels', () => {
  it('prefers normalized labels and falls back to legacy payment method labels', () => {
    expect(getPaymentContextLabel(t as never, { display_label: 'Visa debit', instrument_name: null, container_name: 'Bank', legacy_payment_method: 'cash', container_id: null, container_type: null, instrument_id: null, instrument_type: null }, 'cash')).toBe('Visa debit');
    expect(getPaymentContextLabel(t as never, null, 'bank_transfer')).toBe('Bank transfer');
    expect(getPaymentContextLabel(t as never, null, null)).toBeNull();
  });
});
