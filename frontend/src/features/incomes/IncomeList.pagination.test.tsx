// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IncomeList } from './IncomeList';

const mocks = vi.hoisted(() => ({ useIncomes: vi.fn(), navigate: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => {
  if (key === 'list.pagination.page') return `Page ${values?.page} of ${values?.totalPages}`;
  if (key === 'list.pagination.showing') return `Showing ${values?.from}-${values?.to} of ${values?.total}`;
  return key;
} }) }));
vi.mock('@/hooks/useIncomes', () => ({ useIncomes: mocks.useIncomes, useFamilyMembers: () => ({ data: [] }), useIncomeCategories: () => ({ data: [] }) }));
vi.mock('@/stores/account.store', () => ({ useAccountStore: () => ({ activeAccount: { id: 'account-1', name: 'Main', currency: 'ARS', type: 'personal' } }) }));
vi.mock('@/hooks/useFilters', () => ({ useFilters: <T,>(items: T[]) => ({
  filters: { searchText: 'salary' }, filteredData: items, activeFiltersCount: 1,
  setSearchText: vi.fn(), setDateRange: vi.fn(), setAmountRange: vi.fn(), setCategoryIds: vi.fn(), setFamilyMemberIds: vi.fn(), clearFilters: vi.fn(),
}) }));
vi.mock('@/hooks/useDeleteAnimation', () => ({ useDeleteAnimation: () => ({ handleDelete: vi.fn(), isDeleting: () => false }) }));
vi.mock('@/hooks/useActionFeedback', () => ({ useActionFeedback: () => ({ getFeedbackClassName: () => '' }) }));
vi.mock('@/hooks/useMoneyFormatter', () => ({ useMoneyFormatter: () => ({ formatMoney: (amount: number) => `$${amount}` }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));

const income = { id: 'income-1', description: 'Salary', amount: 2000, currency: 'ARS', amount_in_primary_currency: 2000, date: '2026-05-27', category_id: 'category-1', category_name: 'Work', family_member_id: null, payment_method: 'bank_transfer', payment_context: null, destination_container_id: null };

const renderList = () => {
  mocks.useIncomes.mockImplementation((options: { page: number; limit: number }) => ({
    incomes: [income], pagination: { total_count: 45, page: options.page, limit: options.limit, total_pages: 3 },
    isLoadingIncomes: false, incomesError: null, deleteIncomeAsync: vi.fn(), restoreIncomeAsync: vi.fn(), isDeletingIncome: false, isRestoringIncome: false,
  }));
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  act(() => root.render(<IncomeList />));
  return { container, root };
};

const button = (container: HTMLElement, text: string) => Array.from(container.querySelectorAll('button')).find((item) => item.textContent === text);

describe('IncomeList pagination wiring', () => {
  beforeEach(() => { mocks.navigate.mockReset(); mocks.useIncomes.mockReset(); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('preserves page-local filter notice while moving next and previous pages', () => {
    const { container, root } = renderList();

    expect(container.textContent).toContain('list.pagination.localFilterNotice');
    expect(container.textContent).toContain('Page 1 of 3');
    act(() => button(container, 'list.pagination.next')?.click());
    expect(mocks.useIncomes).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    act(() => button(container, 'list.pagination.previous')?.click());
    expect(mocks.useIncomes).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    act(() => root.unmount());
  });
});
