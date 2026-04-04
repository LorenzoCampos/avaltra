import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import { toast } from 'sonner';
import type { Income, CreateIncomeRequest, UpdateIncomeRequest, IncomeListResponse, IncomeListParams } from '@/types/income';
import type { IncomeCategory } from '@/types/category';

/**
 * Hook for Incomes with Optimistic Updates
 * 
 * Features:
 * - Instant UI feedback (optimistic updates)
 * - Automatic rollback on error
 * - Toast notifications on success/error
 * - React Query caching and invalidation
 */
export const useIncomes = (params?: IncomeListParams) => {
  const queryClient = useQueryClient();
  const { activeAccountId } = useAccountStore();

  // GET /incomes - List incomes
  const { data, isLoading, error } = useQuery({
    queryKey: ['incomes', activeAccountId, params],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account');
      const response = await api.get<IncomeListResponse>('/incomes', {
        headers: { 'X-Account-ID': activeAccountId },
        params,
      });
      return response.data;
    },
    enabled: !!activeAccountId,
  });

  // CREATE with Optimistic Update
  const createIncomeMutation = useMutation({
    mutationFn: async (data: CreateIncomeRequest) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.post<Income>('/incomes', data, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
    onMutate: async (newIncomeData) => {
      await queryClient.cancelQueries({ queryKey: ['incomes', activeAccountId] });
      
      const previousIncomes = queryClient.getQueryData<IncomeListResponse>(['incomes', activeAccountId]);
      
      // Optimistically add the new income
      if (previousIncomes) {
        const optimisticIncome: Income = {
          id: `temp-${Date.now()}`,
          account_id: activeAccountId!,
          family_member_id: newIncomeData.family_member_id || null,
          category_id: newIncomeData.category_id || null,
          category_name: null,
          description: newIncomeData.description,
          amount: newIncomeData.amount,
          currency: newIncomeData.currency,
          exchange_rate: newIncomeData.exchange_rate || 1,
          amount_in_primary_currency: newIncomeData.amount_in_primary_currency || newIncomeData.amount,
          income_type: 'one-time',
          date: newIncomeData.date,
          end_date: null,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<IncomeListResponse>(['incomes', activeAccountId], {
          ...previousIncomes,
          incomes: [optimisticIncome, ...previousIncomes.incomes],
          count: previousIncomes.count + 1,
        });
      }
      
      return { previousIncomes };
    },
    onError: (err, _newIncome, context) => {
      // Rollback on error
      if (context?.previousIncomes) {
        queryClient.setQueryData(['incomes', activeAccountId], context.previousIncomes);
      }
      toast.error('Failed to create income', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Income created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
    },
  });

  // UPDATE with Optimistic Update
  const updateIncomeMutation = useMutation({
    mutationFn: async (updatedIncome: UpdateIncomeRequest & { id: string }) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const { id, ...data } = updatedIncome;
      const response = await api.put<Income>(`/incomes/${id}`, data, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
    onMutate: async (updatedIncome) => {
      await queryClient.cancelQueries({ queryKey: ['incomes', activeAccountId] });
      
      const previousIncomes = queryClient.getQueryData<IncomeListResponse>(['incomes', activeAccountId]);
      
      if (previousIncomes) {
        queryClient.setQueryData<IncomeListResponse>(['incomes', activeAccountId], {
          ...previousIncomes,
          incomes: previousIncomes.incomes.map(inc =>
            inc.id === updatedIncome.id
              ? { ...inc, ...updatedIncome }
              : inc
          ),
        });
      }
      
      return { previousIncomes };
    },
    onError: (err, _updatedIncome, context) => {
      if (context?.previousIncomes) {
        queryClient.setQueryData(['incomes', activeAccountId], context.previousIncomes);
      }
      toast.error('Failed to update income', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Income updated successfully!');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['income', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
    },
  });

  // DELETE with Optimistic Update
  const deleteIncomeMutation = useMutation({
    mutationFn: async (incomeId: string) => {
      if (!activeAccountId) throw new Error('No active account selected');
      await api.delete(`/incomes/${incomeId}`, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return incomeId;
    },
    onMutate: async (incomeId) => {
      await queryClient.cancelQueries({ queryKey: ['incomes', activeAccountId] });
      
      const previousIncomes = queryClient.getQueryData<IncomeListResponse>(['incomes', activeAccountId]);
      
      // Optimistically remove
      if (previousIncomes) {
        queryClient.setQueryData<IncomeListResponse>(['incomes', activeAccountId], {
          ...previousIncomes,
          incomes: previousIncomes.incomes.filter(inc => inc.id !== incomeId),
          count: previousIncomes.count - 1,
        });
      }
      
      return { previousIncomes };
    },
    onError: (err, _incomeId, context) => {
      // Rollback
      if (context?.previousIncomes) {
        queryClient.setQueryData(['incomes', activeAccountId], context.previousIncomes);
      }
      toast.error('Failed to delete income', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: () => {
      toast.success('Income deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', activeAccountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeAccountId] });
    },
  });

  return {
    // Data
    incomes: data?.incomes || [],
    count: data?.count || 0,
    summary: data?.summary,
    
    // Loading states
    isLoadingIncomes: isLoading,
    incomesError: error,
    
    // Mutations
    createIncome: createIncomeMutation.mutate,
    isCreatingIncome: createIncomeMutation.isPending,
    createIncomeError: createIncomeMutation.error,
    createIncomeSuccess: createIncomeMutation.isSuccess,
    
    updateIncome: updateIncomeMutation.mutate,
    isUpdatingIncome: updateIncomeMutation.isPending,
    updateIncomeError: updateIncomeMutation.error,
    updateIncomeSuccess: updateIncomeMutation.isSuccess,
    
    deleteIncome: deleteIncomeMutation.mutate,
    isDeletingIncome: deleteIncomeMutation.isPending,
    deleteIncomeError: deleteIncomeMutation.error,
    
    // Single income query (for edit)
    useIncome: (incomeId?: string) => {
      return useQuery({
        queryKey: ['income', incomeId],
        queryFn: async () => {
          if (!incomeId || !activeAccountId) throw new Error('No income ID or active account');
          const response = await api.get<Income>(`/incomes/${incomeId}`, {
            headers: { 'X-Account-ID': activeAccountId },
          });
          return response.data;
        },
        enabled: !!incomeId && !!activeAccountId,
      });
    },
  };
};

/**
 * Hook for Income Categories
 */
export const useIncomeCategories = () => {
  const { activeAccountId } = useAccountStore();

  return useQuery<IncomeCategory[]>({
    queryKey: ['income-categories', activeAccountId],
    queryFn: async () => {
      if (!activeAccountId) return [];
      const response = await api.get<{ categories: IncomeCategory[], count: number }>('/income-categories', {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data.categories;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Hook for Family Members (reused from expenses)
 */
export const useFamilyMembers = () => {
  const { activeAccount } = useAccountStore();

  return useQuery({
    queryKey: ['family-members', activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) throw new Error('No active account');
      
      // Family members come from the account itself
      return activeAccount.members || [];
    },
    enabled: !!activeAccount && activeAccount.type === 'family',
  });
};
