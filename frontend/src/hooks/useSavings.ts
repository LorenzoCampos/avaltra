import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type {
  SavingsGoal,
  SavingsGoalsListResponse,
  SavingsGoalResponse,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  AddFundsRequest,
  WithdrawFundsRequest,
  FundsOperationResponse,
} from '@/types/savings';

export const useSavings = (isActive: 'true' | 'false' | 'all' = 'true') => {
  const queryClient = useQueryClient();
  const { activeAccountId } = useAccountStore();

  // FETCH ALL SAVINGS GOALS
  const {
    data: savingsData,
    isLoading: isLoadingSavings,
    error: savingsError,
  } = useQuery<SavingsGoalsListResponse>({
    queryKey: ['savings-goals', activeAccountId, isActive],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.get<SavingsGoalsListResponse>('/savings-goals', {
        headers: { 'X-Account-ID': activeAccountId },
        params: { is_active: isActive },
      });
      // Normalize response: backend returns snake_case, we need camelCase
      console.log('🔍 Savings API Response:', response.data);
      const backendData = response.data as any;
      const normalized = {
        goals: backendData.savings_goals || backendData.goals || [],
        count: backendData.total_count || backendData.count || 0,
        summary: backendData.summary,
      };
      console.log('🔍 Normalized data:', normalized);
      return normalized;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  const savingsGoals = savingsData?.goals || [];
  const summary = savingsData?.summary;
  
  console.log('🎯 useSavings hook state:', {
    isActive,
    activeAccountId,
    enabled: !!activeAccountId,
    savingsData,
    savingsGoals,
    savingsGoalsLength: savingsGoals.length,
    isLoadingSavings,
    savingsError: savingsError ? String(savingsError) : null,
  });

  // FETCH SINGLE SAVINGS GOAL
  const useSavingsGoal = (goalId: string | undefined) => {
    return useQuery<SavingsGoal>({
      queryKey: ['savings-goal', activeAccountId, goalId],
      queryFn: async () => {
        if (!activeAccountId) throw new Error('No active account selected');
        if (!goalId) throw new Error('Goal ID is required');
        const response = await api.get<SavingsGoal>(`/savings-goals/${goalId}`, {
          headers: { 'X-Account-ID': activeAccountId },
        });
        // Backend returns the goal directly, not wrapped
        return response.data;
      },
      enabled: !!activeAccountId && !!goalId,
      staleTime: 1000 * 60 * 1, // 1 minute
    });
  };

  // CREATE SAVINGS GOAL with Optimistic Update
  const createSavingsGoalMutation = useMutation({
    mutationFn: async (newGoal: CreateSavingsGoalRequest) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.post<SavingsGoalResponse>('/savings-goals', newGoal, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data.savings_goal;
    },
    onMutate: async (newGoal) => {
      await queryClient.cancelQueries({ queryKey: ['savings-goals', activeAccountId] });

      const previousSavings = queryClient.getQueryData<SavingsGoalsListResponse>([
        'savings-goals',
        activeAccountId,
        isActive,
      ]);

      // Optimistically add new goal
      if (previousSavings && previousSavings.goals) {
        const optimisticGoal: SavingsGoal = {
          id: 'temp-' + Date.now(),
          account_id: activeAccountId!,
          name: newGoal.name,
          description: newGoal.description || null,
          target_amount: newGoal.target_amount,
          current_amount: 0,
          currency: 'ARS', // Will be corrected by server response
          saved_in: newGoal.saved_in || null,
          deadline: newGoal.deadline || null,
          progress_percentage: 0,
          required_monthly_savings: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<SavingsGoalsListResponse>(
          ['savings-goals', activeAccountId, isActive],
          {
            ...previousSavings,
            goals: [optimisticGoal, ...previousSavings.goals],
            count: (previousSavings.count || 0) + 1,
          }
        );
      }

      return { previousSavings };
    },
    onError: (err, _newGoal, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(
          ['savings-goals', activeAccountId, isActive],
          context.previousSavings
        );
      }
      toast.error('Failed to create savings goal', {
        description: (err as any)?.response?.data?.error || (err as Error).message,
      });
    },
    onSuccess: () => {
      toast.success('Savings goal created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', activeAccountId] });
    },
  });

  // UPDATE SAVINGS GOAL with Optimistic Update
  const updateSavingsGoalMutation = useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: UpdateSavingsGoalRequest }) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.put<SavingsGoalResponse>(`/savings-goals/${goalId}`, data, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data.savings_goal;
    },
    onMutate: async ({ goalId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['savings-goals', activeAccountId] });

      const previousSavings = queryClient.getQueryData<SavingsGoalsListResponse>([
        'savings-goals',
        activeAccountId,
        isActive,
      ]);

      // Optimistically update the goal
      if (previousSavings && previousSavings.goals) {
        queryClient.setQueryData<SavingsGoalsListResponse>(
          ['savings-goals', activeAccountId, isActive],
          {
            ...previousSavings,
            goals: previousSavings.goals.map((goal) =>
              goal.id === goalId ? { ...goal, ...data, updated_at: new Date().toISOString() } : goal
            ),
          }
        );
      }

      return { previousSavings };
    },
    onError: (err, _variables, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(
          ['savings-goals', activeAccountId, isActive],
          context.previousSavings
        );
      }
      toast.error('Failed to update savings goal', {
        description: (err as any)?.response?.data?.error || (err as Error).message,
      });
    },
    onSuccess: () => {
      toast.success('Savings goal updated successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', activeAccountId] });
    },
  });

  // DELETE SAVINGS GOAL with Optimistic Update
  const deleteSavingsGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      if (!activeAccountId) throw new Error('No active account selected');
      await api.delete(`/savings-goals/${goalId}`, {
        headers: { 'X-Account-ID': activeAccountId },
      });
      return goalId;
    },
    onMutate: async (goalId) => {
      await queryClient.cancelQueries({ queryKey: ['savings-goals', activeAccountId] });

      const previousSavings = queryClient.getQueryData<SavingsGoalsListResponse>([
        'savings-goals',
        activeAccountId,
        isActive,
      ]);

      // Optimistically remove the goal
      if (previousSavings && previousSavings.goals) {
        queryClient.setQueryData<SavingsGoalsListResponse>(
          ['savings-goals', activeAccountId, isActive],
          {
            ...previousSavings,
            goals: previousSavings.goals.filter((goal) => goal.id !== goalId),
            count: (previousSavings.count || 0) - 1,
          }
        );
      }

      return { previousSavings };
    },
    onError: (err, _goalId, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(
          ['savings-goals', activeAccountId, isActive],
          context.previousSavings
        );
      }
      toast.error('Failed to delete savings goal', {
        description: (err as any)?.response?.data?.error || (err as Error).message,
      });
    },
    onSuccess: () => {
      toast.success('Savings goal deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', activeAccountId] });
    },
  });

  // ADD FUNDS with Optimistic Update
  const addFundsMutation = useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: AddFundsRequest }) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.post<FundsOperationResponse>(
        `/savings-goals/${goalId}/add-funds`,
        data,
        {
          headers: { 'X-Account-ID': activeAccountId },
        }
      );
      return response.data;
    },
    onMutate: async ({ goalId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['savings-goals', activeAccountId] });

      const previousSavings = queryClient.getQueryData<SavingsGoalsListResponse>([
        'savings-goals',
        activeAccountId,
        isActive,
      ]);

      // Optimistically update current_amount and progress
      if (previousSavings && previousSavings.goals) {
        queryClient.setQueryData<SavingsGoalsListResponse>(
          ['savings-goals', activeAccountId, isActive],
          {
            ...previousSavings,
            goals: previousSavings.goals.map((goal) => {
              if (goal.id === goalId) {
                const newCurrentAmount = goal.current_amount + data.amount;
                const newProgress = (newCurrentAmount / goal.target_amount) * 100;
                return {
                  ...goal,
                  current_amount: newCurrentAmount,
                  progress_percentage: Math.min(newProgress, 100),
                  updated_at: new Date().toISOString(),
                };
              }
              return goal;
            }),
          }
        );
      }

      return { previousSavings };
    },
    onError: (err, _variables, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(
          ['savings-goals', activeAccountId, isActive],
          context.previousSavings
        );
      }
      toast.error('Failed to add funds', {
        description: (err as any)?.response?.data?.error || (err as Error).message,
      });
    },
    onSuccess: (data) => {
      toast.success('Funds added successfully!', {
        description: `Added ${data.transaction.amount} to ${data.savings_goal.name}`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', activeAccountId] });
    },
  });

  // WITHDRAW FUNDS with Optimistic Update
  const withdrawFundsMutation = useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: WithdrawFundsRequest }) => {
      if (!activeAccountId) throw new Error('No active account selected');
      const response = await api.post<FundsOperationResponse>(
        `/savings-goals/${goalId}/withdraw-funds`,
        data,
        {
          headers: { 'X-Account-ID': activeAccountId },
        }
      );
      return response.data;
    },
    onMutate: async ({ goalId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['savings-goals', activeAccountId] });

      const previousSavings = queryClient.getQueryData<SavingsGoalsListResponse>([
        'savings-goals',
        activeAccountId,
        isActive,
      ]);

      // Optimistically update current_amount and progress
      if (previousSavings && previousSavings.goals) {
        queryClient.setQueryData<SavingsGoalsListResponse>(
          ['savings-goals', activeAccountId, isActive],
          {
            ...previousSavings,
            goals: previousSavings.goals.map((goal) => {
              if (goal.id === goalId) {
                const newCurrentAmount = Math.max(goal.current_amount - data.amount, 0);
                const newProgress = (newCurrentAmount / goal.target_amount) * 100;
                return {
                  ...goal,
                  current_amount: newCurrentAmount,
                  progress_percentage: Math.min(newProgress, 100),
                  updated_at: new Date().toISOString(),
                };
              }
              return goal;
            }),
          }
        );
      }

      return { previousSavings };
    },
    onError: (err, _variables, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(
          ['savings-goals', activeAccountId, isActive],
          context.previousSavings
        );
      }
      toast.error('Failed to withdraw funds', {
        description: (err as any)?.response?.data?.error || (err as Error).message,
      });
    },
    onSuccess: (data) => {
      toast.success('Funds withdrawn successfully!', {
        description: `Withdrew ${data.transaction.amount} from ${data.savings_goal.name}`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', activeAccountId] });
    },
  });

  return {
    savingsGoals,
    summary,
    isLoadingSavings,
    savingsError,
    useSavingsGoal,
    createSavingsGoal: createSavingsGoalMutation.mutate,
    updateSavingsGoal: updateSavingsGoalMutation.mutate,
    deleteSavingsGoal: deleteSavingsGoalMutation.mutate,
    addFunds: addFundsMutation.mutate,
    withdrawFunds: withdrawFundsMutation.mutate,
    isCreating: createSavingsGoalMutation.isPending,
    isUpdating: updateSavingsGoalMutation.isPending,
    isDeleting: deleteSavingsGoalMutation.isPending,
    isAddingFunds: addFundsMutation.isPending,
    isWithdrawingFunds: withdrawFundsMutation.isPending,
  };
};
