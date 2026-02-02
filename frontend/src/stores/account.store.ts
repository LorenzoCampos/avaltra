import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types/account';

interface AccountState {
  activeAccountId: string | null;
  activeAccount: Account | null;
  
  // Actions
  setActiveAccount: (accountId: string | null, account: Account | null) => void;
  clearActiveAccount: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      activeAccountId: null,
      activeAccount: null,

      setActiveAccount: (accountId, account) => {
        // Also save to localStorage for interceptors
        if (accountId) {
          localStorage.setItem('active_account_id', accountId);
        } else {
          localStorage.removeItem('active_account_id');
        }
        
        set({
          activeAccountId: accountId,
          activeAccount: account,
        });
      },

      clearActiveAccount: () => {
        localStorage.removeItem('active_account_id');
        
        set({
          activeAccountId: null,
          activeAccount: null,
        });
      },
    }),
    {
      name: 'account-storage',
    }
  )
);
