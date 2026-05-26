import { describe, expect, it } from 'vitest';

import {
  getActivityTransactionRoute,
  shouldHandleActivityNavigationKey,
} from '../lib/activityNavigation';

describe('activity transaction navigation', () => {
  it('routes expense and income activity items to their existing edit forms', () => {
    expect(getActivityTransactionRoute({ type: 'expense', id: 'expense-123' })).toBe('/expenses/edit/expense-123');
    expect(getActivityTransactionRoute({ type: 'income', id: 'income-456' })).toBe('/incomes/edit/income-456');
  });

  it('does not route savings or activity items without an id', () => {
    expect(getActivityTransactionRoute({ type: 'savings_deposit', id: 'saving-123' })).toBeNull();
    expect(getActivityTransactionRoute({ type: 'savings_withdrawal', id: 'saving-456' })).toBeNull();
    expect(getActivityTransactionRoute({ type: 'expense', id: '' })).toBeNull();
  });

  it('handles only keyboard activation keys for navigable activity rows', () => {
    expect(shouldHandleActivityNavigationKey('Enter')).toBe(true);
    expect(shouldHandleActivityNavigationKey(' ')).toBe(true);
    expect(shouldHandleActivityNavigationKey('Escape')).toBe(false);
  });
});
