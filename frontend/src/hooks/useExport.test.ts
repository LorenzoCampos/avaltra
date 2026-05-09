import { describe, expect, it } from 'vitest';

import { buildActivityExportRows, buildActivityPDFHead, buildActivityPDFRows } from './useExport';
import type { ActivityItem } from './useActivity';

const baseActivity = {
  id: 'activity-1',
  description: 'Movimiento',
  amount: 13,
  currency: 'ARS',
  amount_in_primary_currency: 20819,
  category_name: null,
  goal_name: null,
  goal_id: null,
  date: '2026-01-20',
  created_at: '2026-01-20T12:00:00Z',
} satisfies Omit<ActivityItem, 'type' | 'payment_method'>;

const esT = (key: string, options?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'activity:types.income': 'Ingreso',
    'activity:types.expense': 'Gasto',
    'activity:types.savings_deposit': 'Depósito en Ahorro',
    'activity:types.savings_withdrawal': 'Retiro de Ahorro',
    'activity:export.columns.date': 'Fecha',
    'activity:export.columns.type': 'Tipo',
    'activity:export.columns.description': 'Descripción',
    'activity:export.columns.category': 'Categoría / Meta',
    'activity:export.columns.paymentMethod': 'Medio de pago',
    'activity:export.columns.amount': 'Monto',
    'activity:export.columns.currency': 'Moneda',
    'activity:export.noCategory': 'Sin categoría',
    'expenses:form.paymentMethod.options.bank_transfer': 'Transferencia bancaria',
    'expenses:form.paymentMethod.options.credit_card': 'Tarjeta de crédito',
  };

  if (key === 'activity:export.goalLabel') {
    return `Meta: ${options?.goal ?? ''}`;
  }

  return translations[key] ?? key;
};

describe('activity export helpers', () => {
  it('localizes csv headers and preserves the original transaction amount/currency', () => {
    const rows = buildActivityExportRows([
      { ...baseActivity, type: 'income', payment_method: 'bank_transfer', category_name: 'Salario' },
      { ...baseActivity, id: 'activity-2', type: 'expense', payment_method: 'credit_card', category_name: 'Viajes', currency: 'USD' },
    ], { t: esT as never, language: 'es-AR' });

    expect(rows).toEqual([
      {
        Fecha: '2026-01-20',
        Tipo: 'Ingreso',
        Descripción: 'Movimiento',
        'Categoría / Meta': 'Salario',
        'Medio de pago': 'Transferencia bancaria',
        Monto: 13,
        Moneda: 'ARS',
      },
      {
        Fecha: '2026-01-20',
        Tipo: 'Gasto',
        Descripción: 'Movimiento',
        'Categoría / Meta': 'Viajes',
        'Medio de pago': 'Tarjeta de crédito',
        Monto: 13,
        Moneda: 'USD',
      },
    ]);
  });

  it('localizes pdf headers, goal labels and placeholders when payment_method is absent', () => {
    const csvRows = buildActivityExportRows([
      { ...baseActivity, type: 'expense', payment_method: null, category_name: 'Comida' },
      { ...baseActivity, id: 'activity-3', type: 'savings_deposit', payment_method: null, goal_name: 'Vacaciones' },
    ], { t: esT as never, language: 'es-AR' });
    const pdfRows = buildActivityPDFRows([
      { ...baseActivity, type: 'expense', payment_method: null, category_name: 'Comida' },
      { ...baseActivity, id: 'activity-3', type: 'savings_deposit', payment_method: null, goal_name: 'Vacaciones' },
    ], { t: esT as never, language: 'es-AR' });

    expect(buildActivityPDFHead(esT as never)).toEqual([
      'Fecha',
      'Tipo',
      'Descripción',
      'Categoría / Meta',
      'Medio de pago',
      'Monto',
    ]);
    expect(csvRows[0]['Medio de pago']).toBe('');
    expect(csvRows[1]['Categoría / Meta']).toBe('Meta: Vacaciones');
    expect(pdfRows[0][4]).toBe('—');
    expect(pdfRows[1][3]).toBe('Meta: Vacaciones');
    expect(String(pdfRows[1][5])).toMatch(/13,00/);
  });
});
