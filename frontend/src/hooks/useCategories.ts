import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { toast } from 'sonner';
import type {
  ExpenseCategory,
  IncomeCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/types/category';

// ============================================
// EXPENSE CATEGORIES
// ============================================

// GET /expense-categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const response = await api.get<{ categories: ExpenseCategory[]; count: number }>('/expense-categories');
      return { expense_categories: response.data.categories, count: response.data.count };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// POST /expense-categories
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const response = await api.post<{ category: ExpenseCategory }>('/expense-categories', data);
      return response.data.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create expense category';
      toast.error(message);
    },
  });
}

// PUT /expense-categories/:id
export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCategoryRequest & { id: string }) => {
      const response = await api.put<{ category: ExpenseCategory }>(`/expense-categories/${id}`, data);
      return response.data.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to update expense category';
      toast.error(message);
    },
  });
}

// DELETE /expense-categories/:id
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/expense-categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to delete expense category';
      toast.error(message);
    },
  });
}

// ============================================
// INCOME CATEGORIES
// ============================================

// GET /income-categories
export function useIncomeCategories() {
  return useQuery({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const response = await api.get<{ categories: IncomeCategory[]; count: number }>('/income-categories');
      return { income_categories: response.data.categories, count: response.data.count };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// POST /income-categories
export function useCreateIncomeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const response = await api.post<{ category: IncomeCategory }>('/income-categories', data);
      return response.data.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create income category';
      toast.error(message);
    },
  });
}

// PUT /income-categories/:id
export function useUpdateIncomeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCategoryRequest & { id: string }) => {
      const response = await api.put<{ category: IncomeCategory }>(`/income-categories/${id}`, data);
      return response.data.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to update income category';
      toast.error(message);
    },
  });
}

// DELETE /income-categories/:id
export function useDeleteIncomeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/income-categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to delete income category';
      toast.error(message);
    },
  });
}
