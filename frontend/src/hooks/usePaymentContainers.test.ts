import { describe, expect, it } from 'vitest';

import { getPaymentContainersQueryKey, getPaymentContainersRequestConfig } from './usePaymentContainers';

describe('payment containers account scoping', () => {
  it('includes the effective account ID in the query key to avoid cross-account stale data', () => {
    expect(getPaymentContainersQueryKey({ includeInactive: true, accountId: 'account-a' }, 'account-b')).toEqual([
      'payment-containers',
      true,
      'account-a',
    ]);
    expect(getPaymentContainersQueryKey({ includeInactive: true }, 'account-b')).toEqual([
      'payment-containers',
      true,
      'account-b',
    ]);
  });

  it('sends an explicit account header when a caller requests a deterministic account scope', () => {
    expect(getPaymentContainersRequestConfig({ includeInactive: true, accountId: 'account-a' })).toEqual({
      params: { include_inactive: 'true' },
      headers: { 'X-Account-ID': 'account-a' },
    });
    expect(getPaymentContainersRequestConfig({ includeInactive: false, accountId: undefined })).toEqual({
      params: undefined,
      headers: undefined,
    });
  });
});
