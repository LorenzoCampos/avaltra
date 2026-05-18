import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/axios';
import type {
  CreatePaymentInstrumentRequest,
  PaymentInstrument,
  PaymentInstrumentsResponse,
  UpdatePaymentInstrumentRequest,
} from '@/types/paymentInstrument';

type ApiMutationError = { response?: { data?: { error?: string } } };

const getMutationErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiMutationError)?.response?.data?.error || fallback;

type PaymentInstrumentsOptions = {
  includeInactive?: boolean;
};

export function usePaymentInstruments(options: PaymentInstrumentsOptions = {}) {
  return useQuery({
    queryKey: ['payment-instruments', options.includeInactive ?? false],
    queryFn: async () => {
      const response = await api.get<PaymentInstrumentsResponse>('/payment-instruments', {
        params: options.includeInactive ? { include_inactive: 'true' } : undefined,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePaymentInstrument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentInstrumentRequest) => {
      const response = await api.post<PaymentInstrument>('/payment-instruments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success('Payment instrument created');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to create payment instrument'));
    },
  });
}

export function useUpdatePaymentInstrument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentInstrumentRequest) => {
      const response = await api.put<PaymentInstrument>(`/payment-instruments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success('Payment instrument updated');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to update payment instrument'));
    },
  });
}

export function useDeactivatePaymentInstrument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<PaymentInstrument>(`/payment-instruments/${id}/deactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success('Payment instrument deactivated');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to deactivate payment instrument'));
    },
  });
}
