import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/axios';
import i18n from '@/i18n';
import type { Account, CreateAccountRequest, UpdateAccountRequest } from '@/types/account';
import { useAccountStore } from '@/stores/account.store';
import { useAuthStore } from '@/stores/auth.store';

type DeleteAccountErrorResponse = {
  error?: string;
  conflicts?: string[];
  suggestion?: string;
};

const CONFLICT_TRANSLATION_KEYS: Record<string, string> = {
  gastos: 'delete.conflicts.expenses',
  expenses: 'delete.conflicts.expenses',
  ingresos: 'delete.conflicts.incomes',
  incomes: 'delete.conflicts.incomes',
  'metas de ahorro': 'delete.conflicts.savingsGoals',
  'savings goals': 'delete.conflicts.savingsGoals',
};

const getDeleteAccountErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: DeleteAccountErrorResponse } })?.response?.data;
  const fallbackDescription = i18n.t('accounts:delete.errorFallback');

  if (!response) {
    return {
      title: i18n.t('accounts:delete.errorTitle'),
      description: fallbackDescription,
    };
  }

  const conflicts = Array.isArray(response.conflicts)
    ? response.conflicts
        .map((conflict) => i18n.t(`accounts:${CONFLICT_TRANSLATION_KEYS[conflict] || 'delete.conflicts.other'}`, { item: conflict }))
        .filter(Boolean)
    : [];

  if (conflicts.length > 0 || response.suggestion) {
    const details: string[] = [i18n.t('accounts:delete.blockedDescription')];

    if (conflicts.length > 0) {
      details.push(i18n.t('accounts:delete.conflictsLabel', { conflicts: conflicts.join(', ') }));
    }

    if (response.suggestion) {
      details.push(i18n.t('accounts:delete.suggestionLabel', { suggestion: response.suggestion }));
    }

    return {
      title: i18n.t('accounts:delete.blockedTitle'),
      description: details.join(' '),
    };
  }

  return {
    title: i18n.t('accounts:delete.errorTitle'),
    description: response.error || fallbackDescription,
  };
};

export const useAccounts = () => {
  const queryClient = useQueryClient();
  const { setActiveAccount, activeAccountId } = useAccountStore();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, error } = useQuery<{ accounts: Account[], count: number }>({ 
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get<{ accounts: Account[], count: number }>('/accounts');
      console.log('[useAccounts] Accounts fetched:', response.data);
      return response.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  // ============================================================================
  // AUTO-SELECCIONAR DEFAULT ACCOUNT al cargar cuentas
  // ============================================================================
  useEffect(() => {
    console.log('[useAccounts] useEffect triggered:', {
      hasData: !!data,
      accountsCount: data?.accounts.length,
      activeAccountId,
      userDefaultAccountId: user?.default_account_id
    });

    // Solo ejecutar si hay cuentas cargadas y NO hay cuenta activa
    if (!data || data.accounts.length === 0) {
      console.log('[useAccounts] Skipping: No data or no accounts');
      return;
    }

    if (activeAccountId) {
      console.log('[useAccounts] Skipping: Account already active');
      return;
    }

    // Buscar default account del usuario
    const defaultAccount = user?.default_account_id 
      ? data.accounts.find(acc => acc.id === user.default_account_id)
      : null;
    
    // Prioridad: Default Account → Primera cuenta
    const accountToActivate = defaultAccount || data.accounts[0];
    
    console.log('[useAccounts] Auto-selecting account:', {
      defaultAccountId: user?.default_account_id,
      foundDefaultAccount: !!defaultAccount,
      selectedAccount: accountToActivate.name,
      accountId: accountToActivate.id
    });
    
    setActiveAccount(accountToActivate.id, accountToActivate);
  }, [data, activeAccountId, user?.default_account_id, setActiveAccount]);

  const accounts = data?.accounts || [];

  // CREATE with Optimistic Update
  const createAccountMutation = useMutation({
    mutationFn: async (newAccount: CreateAccountRequest) => {
      const response = await api.post<Account>('/accounts', newAccount);
      return response.data;
    },
    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      
      const previousAccounts = queryClient.getQueryData<{ accounts: Account[], count: number }>(['accounts']);
      
      if (previousAccounts) {
        const optimisticAccount: Account = {
          id: `temp-${Date.now()}`,
          user_id: 'temp',
          name: newAccount.name,
          type: newAccount.type,
          currency: newAccount.currency,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(['accounts'], {
          accounts: [...previousAccounts.accounts, optimisticAccount],
          count: previousAccounts.count + 1,
        });
      }
      
      return { previousAccounts };
    },
    onError: (err, _newAccount, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(['accounts'], context.previousAccounts);
      }
      toast.error('Failed to create account', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setActiveAccount(newAccount.id, newAccount);
    },
  });

  // UPDATE with Optimistic Update
  const updateAccountMutation = useMutation({
    mutationFn: async (updatedAccountData: UpdateAccountRequest) => {
      const response = await api.put<{ message: string, account: Account }>(
        `/accounts/${updatedAccountData.id}`,
        updatedAccountData
      );
      return response.data.account;
    },
    onMutate: async (updatedAccountData) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      
      const previousAccounts = queryClient.getQueryData<{ accounts: Account[], count: number }>(['accounts']);
      
      if (previousAccounts) {
        queryClient.setQueryData(['accounts'], {
          ...previousAccounts,
          accounts: previousAccounts.accounts.map(acc =>
            acc.id === updatedAccountData.id
              ? { ...acc, ...updatedAccountData }
              : acc
          ),
        });
      }
      
      return { previousAccounts };
    },
    onError: (err, _updatedAccountData, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(['accounts'], context.previousAccounts);
      }
      toast.error('Failed to update account', {
        description: (err as any).response?.data?.error || 'Please try again',
      });
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      if (activeAccountId === updatedAccount.id) {
        setActiveAccount(updatedAccount.id, updatedAccount);
      }
    },
  });

  // DELETE with Optimistic Update
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await api.delete(`/accounts/${accountId}`);
      return accountId;
    },
    onMutate: async (accountId) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      
      const previousAccounts = queryClient.getQueryData<{ accounts: Account[], count: number }>(['accounts']);
      
      if (previousAccounts) {
        queryClient.setQueryData(['accounts'], {
          accounts: previousAccounts.accounts.filter(acc => acc.id !== accountId),
          count: previousAccounts.count - 1,
        });
      }
      
      return { previousAccounts };
    },
    onError: (err, _accountId, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(['accounts'], context.previousAccounts);
      }
      const message = getDeleteAccountErrorMessage(err);
      toast.error(message.title, {
        description: message.description,
      });
    },
    onSuccess: (accountId) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      if (activeAccountId === accountId) {
        setActiveAccount(null, null);
      }
      toast.success(i18n.t('accounts:delete.success'));
    },
  });

  const fetchAccount = async (id: string) => {
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  };

  return {
    accounts: Array.isArray(accounts) ? accounts : [],
    isLoading,
    error,
    fetchAccount,
    createAccount: createAccountMutation.mutate,
    createAccountAsync: createAccountMutation.mutateAsync,
    isCreatingAccount: createAccountMutation.isPending,
    createAccountError: createAccountMutation.error,
    createAccountSuccess: createAccountMutation.isSuccess,
    updateAccount: updateAccountMutation.mutate,
    updateAccountAsync: updateAccountMutation.mutateAsync,
    isUpdatingAccount: updateAccountMutation.isPending,
    updateAccountError: updateAccountMutation.error,
    updateAccountSuccess: updateAccountMutation.isSuccess,
    deleteAccount: deleteAccountMutation.mutate,
    isDeletingAccount: deleteAccountMutation.isPending,
    deleteAccountError: deleteAccountMutation.error,
    deleteAccountSuccess: deleteAccountMutation.isSuccess,
  };
};

/**
 * Hook separado para crear cuentas (útil para onboarding)
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAccount: CreateAccountRequest) => {
      const response = await api.post<{ message: string; account: Account }>('/accounts', newAccount);
      console.log('📦 Backend response:', response.data);
      // Backend retorna { message, account }, necesitamos solo account
      return response.data.account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
