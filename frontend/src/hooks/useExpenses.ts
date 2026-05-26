import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest, ExpensesListResponse, ExpenseListParams } from '@/types/expense';
import type { FamilyMember } from '@/types/account';
import type { ExpenseCategory } from '@/types/category';

const invalidateExpenseQueries = (queryClient: ReturnType<typeof useQueryClient>, activeAccountId: string | null) => {
  queryClient.invalidateQueries({ queryKey: ['expenses', activeAccountId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
  queryClient.invalidateQueries({ queryKey: ['activity', activeAccountId] });
};

const getMutationErrorDescription = (err: unknown) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { error?: unknown } } }).response;
    if (typeof response?.data?.error === 'string') return response.data.error;
  }

  return 'Please try again';
};

const DEFAULT_EXPENSE_LIST_PARAMS = {
  page: 1,
  limit: 20,
  sort_by: 'date',
  order: 'desc',
  expense_type: 'one-time',
} as const satisfies ExpenseListParams;

export const getExpenseListParams = (params?: ExpenseListParams): ExpenseListParams => ({
  ...DEFAULT_EXPENSE_LIST_PARAMS,
  ...params,
});

export const getExpenseListQueryKey = (activeAccountId: string | null, params?: ExpenseListParams) => [
  'expenses',
  activeAccountId,
  getExpenseListParams(params),
] as const;

export const getExpenseListCount = (data?: ExpensesListResponse): number => data?.total_count ?? data?.count ?? 0;

export const useExpenses = (params?: ExpenseListParams) => {
  const queryClient = useQueryClient();
  const { activeAccountId } = useAccountStore();
  const listParams = getExpenseListParams(params);
  const expensesQueryKey = getExpenseListQueryKey(activeAccountId, params);

  const { 
    data: expensesData, 
    isLoading: isLoadingExpenses, 
    error: expensesError 
  } = useQuery<ExpensesListResponse>({ 
    queryKey: expensesQueryKey,
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.get<ExpensesListResponse>('/expenses', {
        headers: { 'X-Account-ID': activeAccountId },
        params: listParams,
      });
      return response.data;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 1,
  });

  const expenses = expensesData?.expenses || [];
  const expensesSummary = expensesData?.summary;
  const expensesTotalCount = getExpenseListCount(expensesData);
  const expensesPagination = expensesData
    ? {
        total_count: expensesTotalCount,
        page: expensesData.page,
        limit: expensesData.limit,
        total_pages: expensesData.total_pages,
      }
    : {
        total_count: 0,
        page: listParams.page ?? DEFAULT_EXPENSE_LIST_PARAMS.page,
        limit: listParams.limit ?? DEFAULT_EXPENSE_LIST_PARAMS.limit,
        total_pages: 0,
      };

  // CREATE with Optimistic Update
  const createExpenseMutation = useMutation({
    mutationFn: async (newExpense: CreateExpenseRequest) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.post<Expense>('/expenses', newExpense, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
    onMutate: async (newExpense) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['expenses', activeAccountId] });
      
      // Snapshot current state
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(expensesQueryKey);
      
      // Optimistically update
      if (previousExpenses) {
        const optimisticExpense: Expense = {
          id: `temp-${Date.now()}`, // Temporary ID
          account_id: activeAccountId!,
          family_member_id: newExpense.family_member_id || null,
          category_id: newExpense.category_id || null,
            category_name: null,
            description: newExpense.description,
            amount: newExpense.amount,
            currency: newExpense.currency,
            exchange_rate: 1,
            amount_in_primary_currency: newExpense.amount,
            expense_type: 'one-time',
            date: newExpense.date,
            end_date: null,
            payment_method: newExpense.payment_method ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

        queryClient.setQueryData<ExpensesListResponse>(expensesQueryKey, {
          ...previousExpenses,
          expenses: [optimisticExpense, ...previousExpenses.expenses],
          total_count: previousExpenses.total_count + 1,
          count: previousExpenses.count === undefined ? undefined : previousExpenses.count + 1,
        });
      }
      
      return { previousExpenses };
    },
    onError: (err, _newExpense, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(expensesQueryKey, context.previousExpenses);
      }
      toast.error('Failed to create expense', {
        description: getMutationErrorDescription(err),
      });
    },
    onSettled: () => {
      invalidateExpenseQueries(queryClient, activeAccountId);
    },
  });

  // UPDATE with Optimistic Update
  const updateExpenseMutation = useMutation({
    mutationFn: async (updatedExpense: UpdateExpenseRequest) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const { id, ...data } = updatedExpense;
      const response = await api.put<Expense>(`/expenses/${id}`, data, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
    onMutate: async (updatedExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', activeAccountId] });
      
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(expensesQueryKey);
      
      if (previousExpenses) {
        queryClient.setQueryData<ExpensesListResponse>(expensesQueryKey, {
          ...previousExpenses,
          expenses: previousExpenses.expenses.map(exp =>
            exp.id === updatedExpense.id
              ? { ...exp, ...updatedExpense }
              : exp
          ),
        });
      }
      
      return { previousExpenses };
    },
    onError: (err, _updatedExpense, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(expensesQueryKey, context.previousExpenses);
      }
      toast.error('Failed to update expense', {
        description: getMutationErrorDescription(err),
      });
    },
    onSettled: (_, __, variables) => {
      invalidateExpenseQueries(queryClient, activeAccountId);
      queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
    },
  });

  // DELETE with Optimistic Update
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!activeAccountId) throw new Error('No active account selected');
      await api.delete(`/expenses/${expenseId}`, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return expenseId;
    },
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', activeAccountId] });
      
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(expensesQueryKey);
      
      // Optimistically remove
      if (previousExpenses) {
        queryClient.setQueryData<ExpensesListResponse>(expensesQueryKey, {
          ...previousExpenses,
          expenses: previousExpenses.expenses.filter(exp => exp.id !== expenseId),
          total_count: Math.max(0, previousExpenses.total_count - 1),
          count: previousExpenses.count === undefined ? undefined : Math.max(0, previousExpenses.count - 1),
        });
      }
      
      return { previousExpenses };
    },
    onError: (err, _expenseId, context) => {
      // Rollback
      if (context?.previousExpenses) {
        queryClient.setQueryData(expensesQueryKey, context.previousExpenses);
      }
      toast.error('Failed to delete expense', {
        description: getMutationErrorDescription(err),
      });
    },
    onSettled: () => {
      invalidateExpenseQueries(queryClient, activeAccountId);
    },
  });

  const restoreExpenseMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      if (!activeAccountId) throw new Error('No active account selected');
      await api.patch(`/expenses/${expense.id}/restore`, undefined, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return expense;
    },
    onMutate: async (expense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', activeAccountId] });

      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(expensesQueryKey);

      if (previousExpenses && !previousExpenses.expenses.some((item) => item.id === expense.id)) {
        queryClient.setQueryData<ExpensesListResponse>(expensesQueryKey, {
          ...previousExpenses,
          expenses: [expense, ...previousExpenses.expenses],
          total_count: previousExpenses.total_count + 1,
          count: previousExpenses.count === undefined ? undefined : previousExpenses.count + 1,
        });
      }

      return { previousExpenses };
    },
    onError: (_err, _expense, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(expensesQueryKey, context.previousExpenses);
      }
    },
    onSettled: (_, __, expense) => {
      invalidateExpenseQueries(queryClient, activeAccountId);
      queryClient.invalidateQueries({ queryKey: ['expense', expense.id] });
    },
  });

  const useExpense = (id?: string) => {
    return useQuery<Expense>({
      queryKey: ['expense', id, activeAccountId],
      queryFn: async () => {
        if (!id || !activeAccountId) throw new Error('Expense ID or active account missing');
        const response = await api.get<Expense>(`/expenses/${id}`, {
          headers: { 'X-Account-ID': activeAccountId },
        });
        return response.data;
      },
      enabled: !!id && !!activeAccountId,
    });
  };

  return {
    expenses,
    expensesSummary,
    expensesTotalCount,
    expensesPagination,
    isLoadingExpenses,
    expensesError,
    createExpense: createExpenseMutation.mutate,
    createExpenseAsync: createExpenseMutation.mutateAsync,
    isCreatingExpense: createExpenseMutation.isPending,
    createExpenseError: createExpenseMutation.error,
    createExpenseSuccess: createExpenseMutation.isSuccess,
    updateExpense: updateExpenseMutation.mutate,
    updateExpenseAsync: updateExpenseMutation.mutateAsync,
    isUpdatingExpense: updateExpenseMutation.isPending,
    updateExpenseError: updateExpenseMutation.error,
    updateExpenseSuccess: updateExpenseMutation.isSuccess,
    deleteExpense: deleteExpenseMutation.mutate,
    deleteExpenseAsync: deleteExpenseMutation.mutateAsync,
    isDeletingExpense: deleteExpenseMutation.isPending,
    deleteExpenseError: deleteExpenseMutation.error,
    deleteExpenseSuccess: deleteExpenseMutation.isSuccess,
    restoreExpense: restoreExpenseMutation.mutate,
    restoreExpenseAsync: restoreExpenseMutation.mutateAsync,
    isRestoringExpense: restoreExpenseMutation.isPending,
    useExpense,
  };
};

// Export individual hook for onboarding
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseRequest) => {
      // Read activeAccountId at execution time, not mount time
      const activeAccountId = useAccountStore.getState().activeAccountId;
      
      console.log('🔍 useCreateExpense mutation - activeAccountId:', activeAccountId);
      
      if (!activeAccountId) {
        console.error('❌ No active account selected');
        throw new Error('No active account selected');
      }
      
      const response = await api.post<Expense>('/expenses', newExpense, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
    onSuccess: () => {
      const activeAccountId = useAccountStore.getState().activeAccountId;
      invalidateExpenseQueries(queryClient, activeAccountId);
    },
  });
};

export const useExpenseCategories = () => {
  const { activeAccountId } = useAccountStore();
  return useQuery<ExpenseCategory[]>({
    queryKey: ['expenseCategories', activeAccountId],
    queryFn: async () => {
      if (!activeAccountId) return [];
      const response = await api.get<{ categories: ExpenseCategory[], count: number }>('/expense-categories', {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data.categories;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5,
  });
};

import type { Account } from '@/types/account';

export const useFamilyMembers = () => {
  const { activeAccountId } = useAccountStore();
  return useQuery<FamilyMember[]>({
    queryKey: ['familyMembers', activeAccountId],
    queryFn: async () => {
      if (!activeAccountId) return [];
      const response = await api.get<Account>(`/accounts/${activeAccountId}`, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data.members || [];
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5,
  });
};
