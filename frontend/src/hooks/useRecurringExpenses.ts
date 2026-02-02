import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { api } from '@/api/axios';
import type {
  RecurringExpense,
  RecurringExpenseFormData,
  RecurringExpensesListResponse,
} from '@/types/recurringExpense';
import { toast } from 'sonner';

// List recurring expenses
export function useRecurringExpenses(params?: {
  is_active?: 'true' | 'false' | 'all';
  frequency?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['recurring-expenses', params],
    queryFn: async () => {
      const response = await api.get<RecurringExpensesListResponse>('/recurring-expenses', {
        params,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Get single recurring expense
export function useRecurringExpense(id: string) {
  return useQuery({
    queryKey: ['recurring-expense', id],
    queryFn: async () => {
      const response = await api.get<RecurringExpense>(`/recurring-expenses/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create recurring expense
export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecurringExpenseFormData) => {
      const response = await api.post<{ recurring_expense: RecurringExpense }>(
        '/recurring-expenses',
        data
      );
      return response.data.recurring_expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Gasto recurrente creado exitosamente');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al crear gasto recurrente';
      toast.error(message);
    },
  });
}

// Update recurring expense
export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringExpenseFormData> & { id: string }) => {
      const response = await api.put(`/recurring-expenses/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-expense', variables.id] });
      toast.success('Gasto recurrente actualizado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al actualizar gasto recurrente';
      toast.error(message);
    },
  });
}

// Delete recurring expense
export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/recurring-expenses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Gasto recurrente eliminado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al eliminar gasto recurrente';
      toast.error(message);
    },
  });
}

// Fetch details for multiple recurring expenses (for multi-currency calculations)
export function useRecurringExpensesDetails(ids: string[]) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['recurring-expense', id],
      queryFn: async () => {
        const response = await api.get<RecurringExpense>(`/recurring-expenses/${id}`);
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes cache to avoid unnecessary API calls
      enabled: !!id,
    })),
  });
}
