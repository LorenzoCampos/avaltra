import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type { CreatePlaceTransferRequest, PlaceTransfer, PlaceTransfersResponse } from '@/types/placeTransfer';

type ApiMutationError = { response?: { data?: { error?: string } } };
type QueryKey = readonly unknown[];

const getMutationErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiMutationError)?.response?.data?.error || fallback;

export const getPlaceTransfersQueryKey = (activeAccountId?: string | null) => [
  'place-transfers',
  activeAccountId ?? null,
] as const;

export const getPlaceTransferInvalidationKeys = (): QueryKey[] => [
  ['place-transfers'],
  ['payment-containers'],
  ['dashboard'],
];

export async function listPlaceTransfers() {
  const response = await api.get<PlaceTransfersResponse>('/place-transfers');
  return response.data;
}

export async function createPlaceTransfer(data: CreatePlaceTransferRequest) {
  const response = await api.post<PlaceTransfer>('/place-transfers', data);
  return response.data;
}

export function usePlaceTransfers() {
  const activeAccountId = useAccountStore((state) => state.activeAccountId);

  return useQuery({
    queryKey: getPlaceTransfersQueryKey(activeAccountId),
    queryFn: listPlaceTransfers,
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePlaceTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlaceTransfer,
    onSuccess: () => {
      for (const queryKey of getPlaceTransferInvalidationKeys()) {
        queryClient.invalidateQueries({ queryKey });
      }
      toast.success('Transfer created');
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Failed to create transfer'));
    },
  });
}
