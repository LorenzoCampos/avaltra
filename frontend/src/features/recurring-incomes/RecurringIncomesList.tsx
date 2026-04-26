import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useRecurringIncomes, useDeleteRecurringIncome, useUpdateRecurringIncome } from '@/hooks/useRecurringIncomes';
import { useDeleteAnimation } from '@/hooks/useDeleteAnimation';
import { useAccountStore } from '@/stores/account.store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RecurringIncome, RecurrenceFrequency } from '@/types/recurringIncome';

// This will be moved inside component to access t()

export const RecurringIncomesList = () => {
  const { t } = useTranslation(['recurring', 'common']);
  const navigate = useNavigate();
  const { activeAccount } = useAccountStore();
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | 'all'>('true');
  const [frequencyFilter, setFrequencyFilter] = useState<RecurrenceFrequency | 'all'>('all');
  
  // Helper function to format recurrence label
  const formatRecurrenceLabel = (item: RecurringIncome): string => {
    const { recurrence_frequency, recurrence_interval, recurrence_day_of_month, recurrence_day_of_week } = item;
    
    const intervalText = recurrence_interval > 1 ? `${recurrence_interval} ` : '';
    
    switch (recurrence_frequency) {
      case 'daily':
        return t('common:recurrence.everyDay', { interval: intervalText.trim(), count: recurrence_interval });
      case 'weekly': {
        const day = recurrence_day_of_week !== undefined && recurrence_day_of_week !== null 
          ? t(`incomes.daysOfWeek.${recurrence_day_of_week}`) 
          : '';
        return t('common:recurrence.everyWeek', { interval: intervalText.trim(), day, count: recurrence_interval });
      }
      case 'monthly': {
        const dayOfMonth = recurrence_day_of_month || 1;
        return t('common:recurrence.everyMonth', { interval: intervalText.trim(), day: dayOfMonth, count: recurrence_interval });
      }
      case 'yearly': {
        const dayOfMonth = recurrence_day_of_month || 1;
        return t('common:recurrence.everyYear', { interval: intervalText.trim(), day: dayOfMonth, count: recurrence_interval });
      }
      default:
        return recurrence_frequency;
    }
  };
  
  const { data, isLoading, error } = useRecurringIncomes({ 
    is_active: activeFilter,
    frequency: frequencyFilter === 'all' ? undefined : frequencyFilter
  });
  
  const { mutate: deleteRecurringIncome, isPending: isDeleting } = useDeleteRecurringIncome();
  const { mutate: updateRecurringIncome, isPending: isUpdating } = useUpdateRecurringIncome();
  const { handleDelete: handleDeleteWithAnimation, isDeleting: isAnimatingDelete } = useDeleteAnimation();

  const recurringIncomes = data?.recurring_incomes || [];
  const total = data?.total || 0;
  
  // Calculate summary
  const activeExpenses = useMemo(() => recurringIncomes.filter(e => e.is_active), [recurringIncomes]);
  
  // Calculate monthly total with accurate exchange rates
  const monthlyTotal = useMemo(() => {
    if (!activeAccount) return 0;
    
    return activeExpenses.reduce((sum, expense) => {
      // Determine the amount in primary currency
      let amountInPrimary: number;
      
      if (expense.currency === activeAccount.currency) {
        // Same currency, use amount directly
        amountInPrimary = expense.amount;
      } else if (expense.amount_in_primary_currency) {
        // ✅ ACCURATE: Use the real amount_in_primary_currency from backend
        amountInPrimary = expense.amount_in_primary_currency;
      } else if (expense.exchange_rate) {
        // Use exchange_rate if available
        amountInPrimary = expense.amount * expense.exchange_rate;
      } else {
        // Last resort: use original amount (shouldn't happen)
        amountInPrimary = expense.amount;
      }
      
      // Calculate monthly cost based on frequency
      let monthlyCost = amountInPrimary;
      switch (expense.recurrence_frequency) {
        case 'daily':
          monthlyCost = amountInPrimary * 30 / expense.recurrence_interval;
          break;
        case 'weekly':
          monthlyCost = amountInPrimary * 4 / expense.recurrence_interval;
          break;
        case 'monthly':
          monthlyCost = amountInPrimary / expense.recurrence_interval;
          break;
        case 'yearly':
          monthlyCost = amountInPrimary / (12 * expense.recurrence_interval);
          break;
      }
      
      return sum + monthlyCost;
    }, 0);
  }, [activeExpenses, activeAccount]);

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/incomes/recurring/edit/${id}`);
  };

  const handleToggleActive = (e: React.MouseEvent, expense: RecurringIncome) => {
    e.stopPropagation();
    const newStatus = !expense.is_active;
    updateRecurringIncome({
      id: expense.id,
      is_active: newStatus,
    }, {
      onSuccess: () => {
        const action = newStatus ? t('common:messages.activated') : t('common:messages.deactivated');
        toast.success(t('common:messages.success', { entity: t('incomes.title'), action }));
      },
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string, description: string) => {
    e.stopPropagation();
    if (window.confirm(t('common:messages.confirmDelete', { entity: description }))) {
      handleDeleteWithAnimation(id, () => deleteRecurringIncome(id));
    }
  };

  if (!activeAccount) {
    return (
      <div className="text-center py-20">
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('common:errors.noActiveAccount')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('common:errors.selectAccountFirst')}</p>
          <Button onClick={() => navigate('/accounts')}>
            {t('common:buttons.goToAccounts')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('incomes.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('common:labels.account')}: {activeAccount.name}</p>
          </div>
          <Button onClick={() => navigate('/incomes/recurring/new')}>
            + {t('incomes.add')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('incomes.list.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message || t('common:errors.loadFailed');
    return (
      <div className="text-center py-10">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{t('common:errors.errorLoading', { entity: t('incomes.title') })}</h3>
          <p className="text-red-600 dark:text-red-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('incomes.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('common:labels.account')}: {activeAccount.name}</p>
        </div>
        <Button onClick={() => navigate('/incomes/recurring/new')}>
          + {t('incomes.add')}
        </Button>
      </div>

      {/* Summary Card */}
      {activeExpenses.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">{t('common:summary.activeTemplates')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{activeExpenses.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">{t('common:summary.estimatedMonthly')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {activeAccount.currency} {monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">{t('common.generatedTransactions')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {activeExpenses.reduce((sum, e) => sum + (e.current_occurrence || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Active/Inactive Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('true')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'true'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('common.active')}
          </button>
          <button
            onClick={() => setActiveFilter('false')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'false'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('common.inactive')}
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('common:filters.all')}
          </button>
        </div>

        {/* Frequency Filter */}
        <select
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value as RecurrenceFrequency | 'all')}
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('common:filters.allFrequencies')}</option>
          <option value="daily">{t('incomes.frequency.daily')}</option>
          <option value="weekly">{t('incomes.frequency.weekly')}</option>
          <option value="monthly">{t('incomes.frequency.monthly')}</option>
          <option value="yearly">{t('incomes.frequency.yearly')}</option>
        </select>
      </div>

      {recurringIncomes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="💵"
              title={
                activeFilter === 'false'
                  ? t('common:empty.noInactive', { entity: t('incomes.title') })
                  : t('common:emptyState.recurringIncomes.title')
              }
              description={
                activeFilter === 'false'
                  ? t('common:empty.noInactiveDescription', { entity: t('incomes.title') })
                  : t('common:emptyState.recurringIncomes.description')
              }
              action={
                activeFilter !== 'false'
                  ? {
                      label: t('common:emptyState.recurringIncomes.action'),
                      onClick: () => navigate('/incomes/recurring/new'),
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>
                {activeFilter === 'true' ? t('common.active') : activeFilter === 'false' ? t('common.inactive') : t('common:filters.all')} {t('incomes.title')} ({total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.description')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.amount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.frequency')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.category')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.occurrences')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:labels.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {recurringIncomes.map((expense, index) => (
                      <tr 
                        key={expense.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isAnimatingDelete(expense.id) ? 'animate-slide-out-left' : 'animate-slide-up'
                        } ${
                          index < 5 ? `animation-delay-${index * 100}` : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                          {expense.currency} {(expense.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatRecurrenceLabel(expense)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {expense.category_name || t('common:form.noCategory')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expense.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                          }`}>
                            {expense.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {expense.current_occurrence || 0}
                          {expense.total_occurrences ? ` / ${expense.total_occurrences}` : ' / ∞'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={(e) => handleToggleActive(e, expense)}
                            className={`${
                              expense.is_active
                                ? 'text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300'
                                : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                            } transition-colors disabled:opacity-50`}
                            disabled={isUpdating}
                            title={expense.is_active ? t('common:buttons.deactivate') : t('common:buttons.activate')}
                          >
                            {expense.is_active ? t('common:buttons.pause') : t('common:buttons.resume')}
                          </button>
                          <button
                            onClick={(e) => handleEdit(e, expense.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                          >
                            {t('common:buttons.edit')}
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, expense.id, expense.description)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                            disabled={isDeleting}
                          >
                            {t('common:buttons.delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeFilter === 'true' ? t('common.active') : activeFilter === 'false' ? t('common.inactive') : t('common:filters.all')} ({total})
              </h2>
            </div>
            {recurringIncomes.map((expense, index) => (
              <div
                key={expense.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm ${
                  isAnimatingDelete(expense.id) ? 'animate-slide-out-left' : 'animate-slide-up'
                } ${
                  index < 5 ? `animation-delay-${index * 100}` : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {expense.description}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatRecurrenceLabel(expense)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      {expense.currency} {(expense.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    {expense.category_name || t('common:form.noCategory')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    expense.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                  }`}>
                    {expense.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {expense.current_occurrence || 0}
                    {expense.total_occurrences ? ` / ${expense.total_occurrences}` : ' / ∞'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleToggleActive(e, expense)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                      expense.is_active
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                        : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                    }`}
                    disabled={isUpdating}
                  >
                    {expense.is_active ? `⏸ ${t('common:buttons.pause')}` : `▶ ${t('common:buttons.resume')}`}
                  </button>
                  <button
                    onClick={(e) => handleEdit(e, expense.id)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('common:buttons.edit')}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, expense.id, expense.description)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {t('common:buttons.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
