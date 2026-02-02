import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest, ExpensesListResponse } from '@/types/expense';
import type { FamilyMember } from '@/types/account';
import type { ExpenseCategory } from '@/types/category';

export const useExpenses = () => {
  const queryClient = useQueryClient();
  const { activeAccountId } = useAccountStore();

  const { 
    data: expensesData, 
    isLoading: isLoadingExpenses, 
    error: expensesError 
  } = useQuery<ExpensesListResponse>({ 
    queryKey: ['expenses', activeAccountId],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.get<ExpensesListResponse>('/expenses', {
        headers: { 'X-Account-ID': activeAccountId },
        params: { type: 'one-time' }
      });
      return response.data;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 1,
  });

  const expenses = expensesData?.expenses || [];
  const expensesSummary = expensesData?.summary;

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
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(['expenses', activeAccountId]);
      
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<ExpensesListResponse>(['expenses', activeAccountId], {
          ...previousExpenses,
          expenses: [optimisticExpense, ...previousExpenses.expenses],
          count: previousExpenses.count + 1,
        });
      }
      
      return { previousExpenses };
    },
    onError: (err, _newExpense, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', activeAccountId], context.previousExpenses);
      }
      toast.error('Failed to create expense', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Expense created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
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
      
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(['expenses', activeAccountId]);
      
      if (previousExpenses) {
        queryClient.setQueryData<ExpensesListResponse>(['expenses', activeAccountId], {
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
        queryClient.setQueryData(['expenses', activeAccountId], context.previousExpenses);
      }
      toast.error('Failed to update expense', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Expense updated successfully!');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
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
      
      const previousExpenses = queryClient.getQueryData<ExpensesListResponse>(['expenses', activeAccountId]);
      
      // Optimistically remove
      if (previousExpenses) {
        queryClient.setQueryData<ExpensesListResponse>(['expenses', activeAccountId], {
          ...previousExpenses,
          expenses: previousExpenses.expenses.filter(exp => exp.id !== expenseId),
          count: previousExpenses.count - 1,
        });
      }
      
      return { previousExpenses };
    },
    onError: (err, _expenseId, context) => {
      // Rollback
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', activeAccountId], context.previousExpenses);
      }
      toast.error('Failed to delete expense', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Expense deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
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
    isLoadingExpenses,
    expensesError,
    createExpense: createExpenseMutation.mutate,
    isCreatingExpense: createExpenseMutation.isPending,
    createExpenseError: createExpenseMutation.error,
    createExpenseSuccess: createExpenseMutation.isSuccess,
    updateExpense: updateExpenseMutation.mutate,
    isUpdatingExpense: updateExpenseMutation.isPending,
    updateExpenseError: updateExpenseMutation.error,
    updateExpenseSuccess: updateExpenseMutation.isSuccess,
    deleteExpense: deleteExpenseMutation.mutate,
    isDeletingExpense: deleteExpenseMutation.isPending,
    deleteExpenseError: deleteExpenseMutation.error,
    deleteExpenseSuccess: deleteExpenseMutation.isSuccess,
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
      queryClient.invalidateQueries({ queryKey: ['expenses', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
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
