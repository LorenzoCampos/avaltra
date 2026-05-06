import { describe, expect, it } from 'vitest';

import { buildActivityExportRows, buildActivityPDFRows } from './useExport';
import type { ActivityItem } from './useActivity';

const baseActivity = {
  id: 'activity-1',
  description: 'Movimiento',
  amount: 1200,
  currency: 'ARS',
  category_name: null,
  goal_name: null,
  goal_id: null,
  date: '2026-01-20',
  created_at: '2026-01-20T12:00:00Z',
} satisfies Omit<ActivityItem, 'type' | 'payment_method'>;

describe('activity export helpers', () => {
  it('includes raw payment_method for income and expense exports', () => {
    const rows = buildActivityExportRows([
      { ...baseActivity, type: 'income', payment_method: 'bank_transfer', category_name: 'Salario' },
      { ...baseActivity, id: 'activity-2', type: 'expense', payment_method: 'credit_card', category_name: 'Comida' },
    ]);

    expect(rows).toEqual([
      {
        Date: '2026-01-20',
        Type: 'Income',
        Description: 'Movimiento',
        Category: 'Salario',
        payment_method: 'bank_transfer',
        Amount: 1200,
        Currency: 'ARS',
      },
      {
        Date: '2026-01-20',
        Type: 'Expense',
        Description: 'Movimiento',
        Category: 'Comida',
        payment_method: 'credit_card',
        Amount: 1200,
        Currency: 'ARS',
      },
    ]);
  });

  it('leaves payment_method empty or placeholder when not applicable', () => {
    const csvRows = buildActivityExportRows([
      { ...baseActivity, type: 'expense', payment_method: null, category_name: 'Comida' },
      { ...baseActivity, id: 'activity-3', type: 'savings_deposit', payment_method: null, goal_name: 'Vacaciones' },
    ]);
    const pdfRows = buildActivityPDFRows([
      { ...baseActivity, type: 'expense', payment_method: null, category_name: 'Comida' },
      { ...baseActivity, id: 'activity-3', type: 'savings_deposit', payment_method: null, goal_name: 'Vacaciones' },
    ]);

    expect(csvRows[0].payment_method).toBe('');
    expect(csvRows[1].payment_method).toBe('');
    expect(pdfRows[0][4]).toBe('-');
    expect(pdfRows[1][4]).toBe('-');
  });
});
