// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpenseList } from './ExpenseList';

const mocks = vi.hoisted(() => ({ useExpenses: vi.fn(), navigate: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => {
  if (key === 'list.pagination.page') return `Page ${values?.page} of ${values?.totalPages}`;
  if (key === 'list.pagination.showing') return `Showing ${values?.from}-${values?.to} of ${values?.total}`;
  return key;
} }) }));
vi.mock('@/hooks/useExpenses', () => ({ useExpenses: mocks.useExpenses, useFamilyMembers: () => ({ data: [] }), useExpenseCategories: () => ({ data: [] }) }));
vi.mock('@/stores/account.store', () => ({ useAccountStore: () => ({ activeAccount: { id: 'account-1', name: 'Main', currency: 'ARS', type: 'personal' } }) }));
vi.mock('@/hooks/useFilters', () => ({ useFilters: <T,>(items: T[]) => ({
  filters: { searchText: 'rent' }, filteredData: items, activeFiltersCount: 1,
  setSearchText: vi.fn(), setDateRange: vi.fn(), setAmountRange: vi.fn(), setCategoryIds: vi.fn(), setFamilyMemberIds: vi.fn(), clearFilters: vi.fn(),
}) }));
vi.mock('@/hooks/useDeleteAnimation', () => ({ useDeleteAnimation: () => ({ handleDelete: vi.fn(), isDeleting: () => false }) }));
vi.mock('@/hooks/useActionFeedback', () => ({ useActionFeedback: () => ({ getFeedbackClassName: () => '' }) }));
vi.mock('@/hooks/useMoneyFormatter', () => ({ useMoneyFormatter: () => ({ formatMoney: (amount: number) => `$${amount}` }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));

const expense = { id: 'expense-1', description: 'Rent', amount: 1000, currency: 'ARS', amount_in_primary_currency: 1000, date: '2026-05-27', category_id: 'category-1', category_name: 'Home', family_member_id: null, payment_method: 'cash', payment_context: null, source_container_id: null };

const renderList = () => {
  mocks.useExpenses.mockImplementation((options: { page: number; limit: number }) => ({
    expenses: [expense], expensesPagination: { total_count: 45, page: options.page, limit: options.limit, total_pages: 3 },
    isLoadingExpenses: false, expensesError: null, deleteExpenseAsync: vi.fn(), restoreExpenseAsync: vi.fn(), isDeletingExpense: false, isRestoringExpense: false,
  }));
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  act(() => root.render(<ExpenseList />));
  return { container, root };
};

const button = (container: HTMLElement, text: string) => Array.from(container.querySelectorAll('button')).find((item) => item.textContent === text);

describe('ExpenseList pagination wiring', () => {
  beforeEach(() => { mocks.navigate.mockReset(); mocks.useExpenses.mockReset(); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('preserves page-local filter notice while moving next and previous pages', () => {
    const { container, root } = renderList();

    expect(container.textContent).toContain('list.pagination.localFilterNotice');
    expect(container.textContent).toContain('Page 1 of 3');
    act(() => button(container, 'list.pagination.next')?.click());
    expect(mocks.useExpenses).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    act(() => button(container, 'list.pagination.previous')?.click());
    expect(mocks.useExpenses).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    act(() => root.unmount());
  });
});
