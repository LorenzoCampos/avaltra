import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/hooks/useAccounts';
import { useDeleteAnimation } from '@/hooks/useDeleteAnimation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useAccountStore } from '@/stores/account.store';
import type { Account } from '@/types/account';

export const AccountList = () => {
  const { t } = useTranslation('accounts');
  const navigate = useNavigate();
  const { accounts, isLoading, error, deleteAccount, isDeletingAccount } = useAccounts();
  const { setActiveAccount, activeAccountId } = useAccountStore();
  const { deletingId, handleDelete, isDeleting } = useDeleteAnimation();

  const handleSetActiveAccount = (account: Account) => {
    setActiveAccount(account.id, account);
  };

  const handleDeleteAccount = (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation();
    if (window.confirm(t('list.deleteConfirm', { name: accountName }))) {
      handleDelete(accountId, () => deleteAccount(accountId));
    }
  };

  const handleEditAccount = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    navigate(`/accounts/edit/${accountId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
          <Button onClick={() => navigate('/accounts/new')}>
            {t('list.addButton')}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.status === 401
      ? t('list.errorAuth')
      : (error as any)?.response?.data?.error || (error as any)?.message || t('list.errorGeneric');

    return (
      <div className="text-center py-10">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 mb-2">{t('list.errorTitle')}</h3>
          <p className="text-red-600">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('list.refreshButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
        <Button onClick={() => navigate('/accounts/new')}>
          {t('list.addButton')}
        </Button>
      </div>

      {!Array.isArray(accounts) || accounts.length === 0 ? (
        <div className="text-center py-10">
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">{t('list.empty')}</h3>
            <p className="text-gray-600 mb-4">{t('list.emptyMessage')}</p>
            <Button onClick={() => navigate('/accounts/new')}>
              {t('list.createButton')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account, index) => (
            <Card 
              key={account.id} 
              padding="md" 
              className={`cursor-pointer transition-all border-2 ${
                isDeleting(account.id) ? 'animate-slide-out-left' : 'animate-slide-up'
              } ${
                index === 0 ? '' : 
                index === 1 ? 'animation-delay-100' :
                index === 2 ? 'animation-delay-200' :
                index === 3 ? 'animation-delay-300' : 'animation-delay-400'
              } ${
                activeAccountId === account.id 
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30' 
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-lg hover:scale-[1.02]'
              }`}
              onClick={() => handleSetActiveAccount(account)}
            >
              <CardHeader className="flex justify-between items-start mb-0 pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    {activeAccountId === account.id && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {t('list.activeLabel')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {account.type === 'personal' ? t('list.personalType') : t('list.familyType')} • {account.currency}
                    {account.memberCount && account.memberCount > 0 && ` • ${t('list.memberCount', { count: account.memberCount })}`}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={(e) => handleEditAccount(e, account.id)}
                  >
                    {t('common:buttons.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50"
                    onClick={(e) => handleDeleteAccount(e, account.id, account.name)}
                    isLoading={isDeletingAccount}
                  >
                    {t('common:buttons.delete')}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
