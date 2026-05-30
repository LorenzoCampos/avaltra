import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreatePlaceTransferRequest } from '@/types/placeTransfer';
import {
  createPlaceTransfer,
  getPlaceTransferInvalidationKeys,
  getPlaceTransfersQueryKey,
  listPlaceTransfers,
} from './usePlaceTransfers';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/api/axios', () => ({
  api: apiMock,
}));

describe('place transfer API helpers', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
  });

  it('scopes query keys and invalidations to active account data', () => {
    expect(getPlaceTransfersQueryKey('account-a')).toEqual(['place-transfers', 'account-a']);
    expect(getPlaceTransfersQueryKey(null)).toEqual(['place-transfers', null]);
    expect(getPlaceTransferInvalidationKeys()).toEqual([['place-transfers'], ['payment-containers'], ['dashboard']]);
  });

  it('calls the place transfer list endpoint and returns the response payload', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { place_transfers: [], count: 0 } });

    await expect(listPlaceTransfers()).resolves.toEqual({ place_transfers: [], count: 0 });

    expect(apiMock.get).toHaveBeenCalledWith('/place-transfers');
  });

  it('posts a create payload to the transfer endpoint without FX fields', async () => {
    const request: CreatePlaceTransferRequest = { source_container_id: 'source-place', destination_container_id: 'destination-place', amount: 1250.5, date: '2026-05-30', note: 'Rent split' };
    apiMock.post.mockResolvedValueOnce({ data: { id: 'transfer-1', ...request, currency: 'ARS' } });

    await createPlaceTransfer(request);

    expect(apiMock.post).toHaveBeenCalledWith('/place-transfers', request);
    expect(apiMock.post.mock.calls[0]?.[1]).not.toHaveProperty('exchange_rate');
  });
});
