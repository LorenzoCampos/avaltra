import { describe, expect, it } from 'vitest';

import {
  buildQuickAddExpensePayload,
  createQuickAddSchema,
  resolveQuickAddSourceContainerSelection,
  resolveQuickAddDefaultExpenseContainer,
  shouldShowQuickAddNoActivePlacesWarning,
} from '@/components/quickAddExpense';

const activePlaceId = '22222222-2222-4222-8222-222222222222';
const inactivePlaceId = '33333333-3333-4333-8333-333333333333';

describe('QuickAddExpenseModal required place behavior', () => {
  it('requires a source place before quick-add submit can build a valid payload', () => {
    const schema = createQuickAddSchema(false);

    expect(() => schema.parse({ amount: 10, description: 'Coffee', source_container_id: '' })).toThrow();
    expect(schema.parse({ amount: 10, description: 'Coffee', source_container_id: activePlaceId })).toMatchObject({
      amount: 10,
      description: 'Coffee',
      source_container_id: activePlaceId,
    });
  });

  it('includes the selected source place in the quick-add expense payload', () => {
    expect(
      buildQuickAddExpensePayload(
        { amount: 10, description: 'Coffee', source_container_id: activePlaceId, payment_method: null },
        'ARS',
        '2026-05-25',
      ),
    ).toMatchObject({
      amount: 10,
      description: 'Coffee',
      currency: 'ARS',
      date: '2026-05-25',
      source_container_id: activePlaceId,
    });
  });

  it('preselects only an active account default place', () => {
    const containers = [
      { id: activePlaceId, is_active: true },
      { id: inactivePlaceId, is_active: false },
    ];

    expect(resolveQuickAddDefaultExpenseContainer({ default_expense_container_id: activePlaceId }, containers)).toEqual(containers[0]);
    expect(resolveQuickAddDefaultExpenseContainer({ default_expense_container_id: inactivePlaceId }, containers)).toBeNull();
    expect(resolveQuickAddDefaultExpenseContainer({ default_expense_container_id: null }, containers)).toBeNull();
  });

  it('clears stale source place selections but preserves valid user choices', () => {
    const otherActivePlaceId = '44444444-4444-4444-8444-444444444444';
    const activeContainers = [
      { id: activePlaceId, is_active: true },
      { id: otherActivePlaceId, is_active: true },
    ];

    expect(
      resolveQuickAddSourceContainerSelection({
        currentSourceContainerId: otherActivePlaceId,
        defaultSourceContainerId: activePlaceId,
        activePaymentContainers: activeContainers,
        isLoadingPaymentContainers: false,
      }),
    ).toBe(otherActivePlaceId);

    expect(
      resolveQuickAddSourceContainerSelection({
        currentSourceContainerId: inactivePlaceId,
        defaultSourceContainerId: activePlaceId,
        activePaymentContainers: activeContainers,
        isLoadingPaymentContainers: false,
      }),
    ).toBeUndefined();

    expect(
      resolveQuickAddSourceContainerSelection({
        currentSourceContainerId: '',
        defaultSourceContainerId: activePlaceId,
        activePaymentContainers: activeContainers,
        isLoadingPaymentContainers: false,
      }),
    ).toBe(activePlaceId);
  });

  it('does not clear source place selections or show no-active-place warning while places are loading', () => {
    expect(
      resolveQuickAddSourceContainerSelection({
        currentSourceContainerId: inactivePlaceId,
        defaultSourceContainerId: activePlaceId,
        activePaymentContainers: [],
        isLoadingPaymentContainers: true,
      }),
    ).toBe(inactivePlaceId);

    expect(shouldShowQuickAddNoActivePlacesWarning(true, [])).toBe(false);
    expect(shouldShowQuickAddNoActivePlacesWarning(false, [])).toBe(true);
    expect(shouldShowQuickAddNoActivePlacesWarning(false, [{ id: activePlaceId, is_active: true }])).toBe(false);
  });
});
