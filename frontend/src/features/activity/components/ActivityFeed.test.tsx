// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityFeed } from './ActivityFeed';
import { getActivityTransactionRoute, shouldHandleActivityNavigationKey } from '../lib/activityNavigation';
import type { ActivityItem } from '@/hooks/useActivity';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), useActivity: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useActivity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useActivity')>()),
  useActivity: mocks.useActivity,
  formatActivityDate: (date: string) => date,
}));
vi.mock('@/stores/account.store', () => ({ useAccountStore: () => ({ activeAccount: { currency: 'ARS' } }) }));
vi.mock('@/hooks/useMoneyFormatter', () => ({ useMoneyFormatter: () => ({ formatMoney: (amount: number) => `$${amount}` }) }));
vi.mock('@/components/FilterBar', () => ({ FilterBar: () => null }));
vi.mock('@/hooks/useFilters', () => ({
  useFilters: <T,>(items: T[]) => ({
    filters: {}, filteredData: items, activeFiltersCount: 0,
    setSearchText: vi.fn(), setDateRange: vi.fn(), setAmountRange: vi.fn(), setCategoryIds: vi.fn(), clearFilters: vi.fn(),
  }),
}));

const baseActivity: ActivityItem = {
  id: 'expense-123', type: 'expense' as const, description: 'Groceries', amount: 120, currency: 'ARS',
  amount_in_primary_currency: 120, payment_method: 'cash' as const, payment_context: null,
  category_name: 'Food', goal_name: null, goal_id: null, date: '2026-05-27', created_at: '2026-05-27T10:00:00Z',
};

const renderFeed = (activity = baseActivity) => {
  mocks.useActivity.mockReturnValue({
    data: { activities: [activity], total_count: 1, page: 1, limit: 20, total_pages: 1, summary: {
      total_income: 0, total_expenses: 0, total_savings_deposits: 0, total_savings_withdrawals: 0, net_balance: 0,
    } },
    isLoading: false,
    error: null,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  act(() => root.render(<ActivityFeed />));
  return { container, root };
};

describe('activity transaction navigation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mocks.navigate.mockReset();
    mocks.useActivity.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('keeps route and keyboard helper behavior covered', () => {
    expect(getActivityTransactionRoute({ type: 'expense', id: 'expense-123' })).toBe('/expenses/edit/expense-123');
    expect(getActivityTransactionRoute({ type: 'income', id: 'income-456' })).toBe('/incomes/edit/income-456');
    expect(getActivityTransactionRoute({ type: 'savings_deposit', id: 'saving-123' })).toBeNull();
    expect(getActivityTransactionRoute({ type: 'savings_withdrawal', id: 'saving-456' })).toBeNull();
    expect(getActivityTransactionRoute({ type: 'expense', id: '' })).toBeNull();
    expect(['Enter', ' '].map(shouldHandleActivityNavigationKey)).toEqual([true, true]);
    expect(shouldHandleActivityNavigationKey('Escape')).toBe(false);
  });

  it.each([
    ['click', baseActivity, '/expenses/edit/expense-123'],
    ['Enter', { ...baseActivity, id: 'income-456', type: 'income' as const, description: 'Salary' }, '/incomes/edit/income-456'],
    [' ', { ...baseActivity, id: 'income-456', type: 'income' as const, description: 'Salary' }, '/incomes/edit/income-456'],
  ])('navigates a routable row on %s', (activation, activity, route) => {
    const { container, root } = renderFeed(activity);
    const row = container.querySelector<HTMLElement>('[role="button"]');

    expect(row?.textContent).toContain(activity.description);
    expect(row?.textContent).toContain('actions.viewTransaction');
    expect(row?.getAttribute('aria-label')).toBe('actions.viewTransactionFor');
    act(() => activation === 'click'
      ? row?.click()
      : row?.dispatchEvent(new KeyboardEvent('keydown', { key: activation, bubbles: true })));
    expect(mocks.navigate).toHaveBeenCalledWith(route);
    act(() => root.unmount());
  });

  it('ignores click and keyboard activation for non-routable rows', () => {
    const { container, root } = renderFeed({ ...baseActivity, type: 'savings_withdrawal', description: 'Emergency fund', category_name: null, goal_name: 'Emergency' });
    const row = Array.from(container.querySelectorAll<HTMLElement>('div')).find((element) => element.textContent?.includes('Emergency fund'));

    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.textContent).not.toContain('actions.viewTransaction');
    act(() => ['click', 'Enter', ' '].forEach((key) => row?.dispatchEvent(
      key === 'click' ? new MouseEvent('click', { bubbles: true }) : new KeyboardEvent('keydown', { key, bubbles: true }),
    )));
    expect(mocks.navigate).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
