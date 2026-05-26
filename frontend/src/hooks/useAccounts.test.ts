import { describe, expect, it } from 'vitest';

import type { Account } from '@/types/account';
import { getAccountToActivateFromFreshData } from './useAccounts';

const makeAccount = (overrides: Partial<Account>): Account => ({
  id: 'account-a',
  name: 'Account A',
  type: 'personal',
  currency: 'ARS',
  user_id: 'user-a',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('account selection from fresh data', () => {
  it('returns the fresh account matching the persisted active account id', () => {
    const freshActiveAccount = makeAccount({
      id: 'account-a',
      name: 'Fresh Account A',
      default_expense_container_id: 'container-a',
    });
    const accounts = [freshActiveAccount, makeAccount({ id: 'account-b', name: 'Account B' })];

    expect(getAccountToActivateFromFreshData(accounts, 'account-a', 'account-b')).toBe(freshActiveAccount);
  });

  it('uses the default account only when no active account id is persisted', () => {
    const accounts = [makeAccount({ id: 'account-a' }), makeAccount({ id: 'account-b' })];

    expect(getAccountToActivateFromFreshData(accounts, null, 'account-b')).toBe(accounts[1]);
  });
});
