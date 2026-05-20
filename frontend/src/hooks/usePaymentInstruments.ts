import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentInstrumentRequest) => {
      const response = await api.post<PaymentInstrument>('/payment-instruments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success(t('paymentContainersPage.toasts.instrumentCreated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.instrumentCreateFailed')));
    },
  });
}

export function useUpdatePaymentInstrument() {
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentInstrumentRequest) => {
      const response = await api.put<PaymentInstrument>(`/payment-instruments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success(t('paymentContainersPage.toasts.instrumentUpdated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.instrumentUpdateFailed')));
    },
  });
}

export function useDeactivatePaymentInstrument() {
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<PaymentInstrument>(`/payment-instruments/${id}/deactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success(t('paymentContainersPage.toasts.instrumentDeactivated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.instrumentDeactivateFailed')));
    },
  });
}
