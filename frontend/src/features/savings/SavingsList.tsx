import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSavings } from '@/hooks/useSavings';
import { useAccountStore } from '@/stores/account.store';
import { SavingsCard } from './components/SavingsCard';
import { ContributionForm } from './components/ContributionForm';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PlusIcon, TrophyIcon } from 'lucide-react';
import type { SavingsGoal, AddFundsRequest } from '@/types/savings';

export const SavingsList = () => {
  const { t } = useTranslation('savings');
  const navigate = useNavigate();
  const { activeAccount, activeAccountId } = useAccountStore();
  const [filter, setFilter] = useState<'true' | 'false' | 'all'>('true');
  const [contributionModal, setContributionModal] = useState<{
    goal: SavingsGoal;
    type: 'add' | 'withdraw';
  } | null>(null);

  const {
    savingsGoals,
    summary,
    isLoadingSavings,
    savingsError,
    deleteSavingsGoal,
    addFunds,
    withdrawFunds,
    isAddingFunds,
    isWithdrawingFunds,
  } = useSavings(filter);

  if (!activeAccountId || !activeAccount) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('list.title')}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('list.noAccount')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('list.noAccountDescription')}
            </p>
            <Button onClick={() => navigate('/accounts')}>{t('list.goToAccounts')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    if (confirm(t('list.deleteConfirm'))) {
      deleteSavingsGoal(id);
    }
  };

  const handleAddFunds = (goal: SavingsGoal) => {
    setContributionModal({ goal, type: 'add' });
  };

  const handleWithdrawFunds = (goal: SavingsGoal) => {
    setContributionModal({ goal, type: 'withdraw' });
  };

  const handleContributionSubmit = (data: AddFundsRequest) => {
    if (!contributionModal) return;

    if (contributionModal.type === 'add') {
      addFunds({ goalId: contributionModal.goal.id, data });
    } else {
      withdrawFunds({ goalId: contributionModal.goal.id, data });
    }

    setContributionModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('list.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('list.subtitle')}
          </p>
        </div>
        <Button onClick={() => navigate('/savings/new')} className="flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          {t('list.newGoalButton')}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('list.summaryTotalGoals')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.total_goals}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('list.summaryActiveGoals')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.active_goals}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('list.summaryTotalSaved')}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: activeAccount.currency,
                  minimumFractionDigits: 0,
                }).format(summary.total_saved)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('list.summaryOverallProgress')}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summary.overall_progress.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="animate-slide-up animation-delay-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('list.filterShow')}</span>
            <Button
              variant={filter === 'true' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('true')}
            >
              {t('list.filterActive')}
            </Button>
            <Button
              variant={filter === 'false' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('false')}
            >
              {t('list.filterArchived')}
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('list.filterAll')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingSavings && (
        <Card>
          <CardContent className="p-6">
            <ListSkeleton items={3} />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {savingsError && (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
              {t('list.errorTitle')}
            </h3>
            <p className="text-red-600 dark:text-red-400">
              {(savingsError as any)?.response?.data?.error ||
                (savingsError as Error).message ||
                t('list.errorGeneric')}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              {t('list.retryButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Savings Goals List */}
      {!isLoadingSavings && !savingsError && (
        <>
          {savingsGoals.length === 0 ? (
            <Card className="animate-slide-up animation-delay-200">
              <CardContent className="py-16 text-center">
                <TrophyIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {t('list.noGoals')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('list.noGoalsDescription')}
                </p>
                <Button onClick={() => navigate('/savings/new')} className="flex items-center gap-2 mx-auto">
                  <PlusIcon className="w-5 h-5" />
                  {t('list.createFirstGoal')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {savingsGoals.map((goal, index) => (
                <div
                  key={goal.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${(index + 2) * 100}ms` }}
                >
                  <SavingsCard
                    goal={goal}
                    onDelete={handleDelete}
                    onAddFunds={handleAddFunds}
                    onWithdrawFunds={handleWithdrawFunds}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Contribution Modal */}
      {contributionModal && (
        <ContributionForm
          goal={contributionModal.goal}
          type={contributionModal.type}
          onSubmit={handleContributionSubmit}
          onCancel={() => setContributionModal(null)}
          isLoading={isAddingFunds || isWithdrawingFunds}
        />
      )}
    </div>
  );
};
