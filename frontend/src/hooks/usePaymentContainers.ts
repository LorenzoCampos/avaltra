import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api/axios';
import type {
  CreatePaymentContainerRequest,
  PaymentContainer,
  PaymentContainersResponse,
  UpdatePaymentContainerRequest,
} from '@/types/paymentContainer';

type ApiMutationError = { response?: { data?: { error?: string } } };

const getMutationErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiMutationError)?.response?.data?.error || fallback;

type PaymentContainersOptions = {
  includeInactive?: boolean;
};

export function usePaymentContainers(options: PaymentContainersOptions = {}) {
  return useQuery({
    queryKey: ['payment-containers', options.includeInactive ?? false],
    queryFn: async () => {
      const response = await api.get<PaymentContainersResponse>('/payment-containers', {
        params: options.includeInactive ? { include_inactive: 'true' } : undefined,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePaymentContainer() {
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentContainerRequest) => {
      const response = await api.post<PaymentContainer>('/payment-containers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success(t('paymentContainersPage.toasts.containerCreated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.containerCreateFailed')));
    },
  });
}

export function useUpdatePaymentContainer() {
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentContainerRequest) => {
      const response = await api.put<PaymentContainer>(`/payment-containers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success(t('paymentContainersPage.toasts.containerUpdated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.containerUpdateFailed')));
    },
  });
}

export function useDeactivatePaymentContainer() {
  const { t } = useTranslation('navigation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<PaymentContainer>(`/payment-containers/${id}/deactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success(t('paymentContainersPage.toasts.containerDeactivated'));
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, t('paymentContainersPage.toasts.containerDeactivateFailed')));
    },
  });
}
