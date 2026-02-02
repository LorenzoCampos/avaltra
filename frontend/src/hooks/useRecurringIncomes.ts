import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { api } from '@/api/axios';
import type {
  RecurringIncome,
  RecurringIncomeFormData,
  RecurringIncomesListResponse,
} from '@/types/recurringIncome';
import { toast } from 'sonner';

// List recurring incomes
export function useRecurringIncomes(params?: {
  is_active?: 'true' | 'false' | 'all';
  frequency?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['recurring-incomes', params],
    queryFn: async () => {
      const response = await api.get<RecurringIncomesListResponse>('/recurring-incomes', {
        params,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Get single recurring income
export function useRecurringIncome(id: string) {
  return useQuery({
    queryKey: ['recurring-income', id],
    queryFn: async () => {
      const response = await api.get<RecurringIncome>(`/recurring-incomes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create recurring income
export function useCreateRecurringIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecurringIncomeFormData) => {
      const response = await api.post<{ recurring_income: RecurringIncome }>(
        '/recurring-incomes',
        data
      );
      return response.data.recurring_income;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
      toast.success('Ingreso recurrente creado exitosamente');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al crear ingreso recurrente';
      toast.error(message);
    },
  });
}

// Update recurring income
export function useUpdateRecurringIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringIncomeFormData> & { id: string }) => {
      const response = await api.put(`/recurring-incomes/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-income', variables.id] });
      toast.success('Ingreso recurrente actualizado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al actualizar ingreso recurrente';
      toast.error(message);
    },
  });
}

// Delete recurring income
export function useDeleteRecurringIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/recurring-incomes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
      toast.success('Ingreso recurrente eliminado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Error al eliminar ingreso recurrente';
      toast.error(message);
    },
  });
}

// Fetch details for multiple recurring incomes (for multi-currency calculations)
export function useRecurringIncomesDetails(ids: string[]) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['recurring-income', id],
      queryFn: async () => {
        const response = await api.get<RecurringIncome>(`/recurring-incomes/${id}`);
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes cache to avoid unnecessary API calls
      enabled: !!id,
    })),
  });
}
