import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
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
  accountId?: string;
  enabled?: boolean;
};

export const getPaymentContainersQueryKey = (
  options: PaymentContainersOptions,
  activeAccountId?: string | null,
) => [
  'payment-containers',
  options.includeInactive ?? false,
  options.accountId ?? activeAccountId ?? null,
] as const;

export const getPaymentContainersRequestConfig = (options: PaymentContainersOptions) => ({
  params: options.includeInactive ? { include_inactive: 'true' } : undefined,
  headers: options.accountId ? { 'X-Account-ID': options.accountId } : undefined,
});

export function usePaymentContainers(options: PaymentContainersOptions = {}) {
  const activeAccountId = useAccountStore((state) => state.activeAccountId);

  return useQuery({
    queryKey: getPaymentContainersQueryKey(options, activeAccountId),
    queryFn: async () => {
      const response = await api.get<PaymentContainersResponse>(
        '/payment-containers',
        getPaymentContainersRequestConfig(options),
      );
      return response.data;
    },
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePaymentContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentContainerRequest) => {
      const response = await api.post<PaymentContainer>('/payment-containers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success('Payment container created');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to create payment container'));
    },
  });
}

export function useUpdatePaymentContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentContainerRequest) => {
      const response = await api.put<PaymentContainer>(`/payment-containers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success('Payment container updated');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to update payment container'));
    },
  });
}

export function useDeactivatePaymentContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<PaymentContainer>(`/payment-containers/${id}/deactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-containers'] });
      toast.success('Payment container deactivated');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to deactivate payment container'));
    },
  });
}
