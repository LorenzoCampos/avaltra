import { describe, expect, it } from 'vitest';

import { getExpenseListCount, getExpenseListParams, getExpenseListQueryKey } from './useExpenses';
import { getIncomeListCount, getIncomeListParams, getIncomeListQueryKey } from './useIncomes';
import { getListPaginationState } from '@/lib/listPagination';

describe('transaction list params', () => {
  it('maps expense defaults to the backend pagination contract', () => {
    expect(getExpenseListParams()).toEqual({
      page: 1,
      limit: 20,
      sort_by: 'date',
      order: 'desc',
      expense_type: 'one-time',
    });
  });

  it('preserves expense filters while using expense_type instead of legacy type', () => {
    const params = getExpenseListParams({
      page: 3,
      limit: 50,
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      category_id: 'category-a',
      family_member_id: 'member-a',
      sort_by: 'amount',
      order: 'asc',
      expense_type: 'recurring',
    });

    expect(params).toEqual({
      page: 3,
      limit: 50,
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      category_id: 'category-a',
      family_member_id: 'member-a',
      sort_by: 'amount',
      order: 'asc',
      expense_type: 'recurring',
    });
    expect(params).not.toHaveProperty('type');
  });

  it('maps income defaults to the backend pagination contract', () => {
    expect(getIncomeListParams()).toEqual({
      page: 1,
      limit: 20,
      sort_by: 'date',
      order: 'desc',
      income_type: 'one-time',
    });
  });

  it('preserves income filters while using income_type instead of legacy type', () => {
    const params = getIncomeListParams({
      page: 2,
      limit: 25,
      date_from: '2026-02-01',
      date_to: '2026-02-28',
      category_id: 'category-b',
      family_member_id: 'member-b',
      sort_by: 'created_at',
      order: 'desc',
      income_type: 'recurring',
    });

    expect(params).toEqual({
      page: 2,
      limit: 25,
      date_from: '2026-02-01',
      date_to: '2026-02-28',
      category_id: 'category-b',
      family_member_id: 'member-b',
      sort_by: 'created_at',
      order: 'desc',
      income_type: 'recurring',
    });
    expect(params).not.toHaveProperty('type');
  });
});

describe('transaction list metadata helpers', () => {
  it('reads backend total_count before legacy count for expenses', () => {
    expect(getExpenseListCount({ expenses: [], total_count: 42, page: 2, limit: 20, total_pages: 3, count: 7 })).toBe(42);
  });

  it('falls back to legacy count for expenses when old cached data is present', () => {
    expect(getExpenseListCount({ expenses: [], count: 7 } as unknown as Parameters<typeof getExpenseListCount>[0])).toBe(7);
  });

  it('reads backend total_count before legacy count for incomes', () => {
    expect(getIncomeListCount({ incomes: [], total_count: 18, page: 1, limit: 20, total_pages: 1, count: 3 })).toBe(18);
  });

  it('includes defaulted params in query keys to avoid mixing pages', () => {
    expect(getExpenseListQueryKey('account-a', { page: 2 })[2]).toMatchObject({ page: 2, limit: 20, expense_type: 'one-time' });
    expect(getIncomeListQueryKey('account-a', { limit: 50 })[2]).toMatchObject({ page: 1, limit: 50, income_type: 'one-time' });
  });

  it('derives bounded pagination state from backend metadata', () => {
    expect(getListPaginationState({ total_count: 45, page: 2, limit: 20, total_pages: 3 })).toMatchObject({
      from: 21,
      to: 40,
      hasPrevious: true,
      hasNext: true,
    });
  });

  it('does not expose navigation for an empty list', () => {
    expect(getListPaginationState({ total_count: 0, page: 1, limit: 20, total_pages: 0 })).toMatchObject({
      from: 0,
      to: 0,
      hasPrevious: false,
      hasNext: false,
    });
  });
});
