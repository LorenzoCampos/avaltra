import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { useExpenses, useFamilyMembers, useExpenseCategories } from '@/hooks/useExpenses';
import { useDeleteAnimation } from '@/hooks/useDeleteAnimation';
import { useAccountStore } from '@/stores/account.store';
import { useFilters } from '@/hooks/useFilters';
import { FilterBar } from '@/components/FilterBar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';

export const ExpenseList = () => {
  const { t } = useTranslation('expenses');
  const navigate = useNavigate();
  const { activeAccount } = useAccountStore();
  const { expenses, isLoadingExpenses, expensesError, deleteExpense, isDeletingExpense } = useExpenses();
  const { data: familyMembers } = useFamilyMembers();
  const { data: categories } = useExpenseCategories();
  const { handleDelete: handleDeleteWithAnimation, isDeleting } = useDeleteAnimation();

  const isFamilyAccount = activeAccount?.type === 'family';

  // Filters
  const {
    filters,
    filteredData: filteredExpenses,
    activeFiltersCount,
    setSearchText,
    setDateRange,
    setAmountRange,
    setCategoryIds,
    setFamilyMemberIds,
    clearFilters,
  } = useFilters(expenses);

  const handleEdit = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    navigate(`/expenses/edit/${expenseId}`);
  };

  const handleDuplicate = (e: React.MouseEvent, expense: any) => {
    e.stopPropagation();
    navigate('/expenses/new', {
      state: {
        duplicateFrom: {
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          category_id: expense.category_id,
          family_member_id: expense.family_member_id,
          // Date is NOT included - will use today's date
        }
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, expenseId: string, description: string) => {
    e.stopPropagation();
    if (window.confirm(t('list.confirmDelete', { description }))) {
      handleDeleteWithAnimation(expenseId, () => deleteExpense(expenseId));
    }
  };

  if (!activeAccount) {
    return (
      <div className="text-center py-20">
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-800 mb-2">{t('list.noAccount.title')}</h3>
          <p className="text-gray-600 mb-4">{t('list.noAccount.description')}</p>
          <Button onClick={() => navigate('/accounts')}>
            {t('list.noAccount.button')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingExpenses) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('list.account')}: {activeAccount.name}</p>
          </div>
          <Button onClick={() => navigate('/expenses/new')}>
            + {t('list.addButton')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('list.allExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expensesError) {
    const errorMessage = (expensesError as any)?.response?.data?.error || (expensesError as any)?.message || t('list.error.loadFailed');
    return (
      <div className="text-center py-10">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 mb-2">{t('list.error.title')}</h3>
          <p className="text-red-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('list.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('list.account')}: {activeAccount.name}</p>
        </div>
        <Button onClick={() => navigate('/expenses/new')}>
          + {t('list.addButton')}
        </Button>
      </div>

      {/* Filter Bar */}
      {expenses.length > 0 && (
        <FilterBar
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onSearchChange={setSearchText}
          onDateRangeChange={setDateRange}
          onAmountRangeChange={setAmountRange}
          onCategoryIdsChange={setCategoryIds}
          onFamilyMemberIdsChange={setFamilyMemberIds}
          onClearFilters={clearFilters}
          categories={categories?.map(c => ({ id: c.id, name: c.name })) || []}
          familyMembers={familyMembers?.map(m => ({ id: m.id, name: m.name })) || []}
          showFamilyMemberFilter={isFamilyAccount}
        />
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('list.empty.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('list.empty.description')}</p>
            <Button onClick={() => navigate('/expenses/new')}>
              {t('list.empty.button')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>
                {activeFiltersCount > 0 ? (
                  <span>{t('list.filteredExpenses', { filtered: filteredExpenses.length, total: expenses.length })}</span>
                ) : (
                  <span>{t('list.allExpenses')} ({expenses.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-gray-500 dark:text-gray-400">{t('list.noMatch')}</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('list.clearFilters')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('list.table.date')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('list.table.description')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('list.table.category')}
                        </th>
                        {isFamilyAccount && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('list.table.member')}
                          </th>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('list.table.amount')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('list.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredExpenses.map((expense, index) => (
                      <tr 
                        key={expense.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isDeleting(expense.id) ? 'animate-slide-out-left' : 'animate-slide-up'
                        } ${
                          index < 5 ? `animation-delay-${index * 100}` : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {expense.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {expense.category_name || t('common:common.noCategory')}
                        </td>
                        {isFamilyAccount && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {familyMembers?.find(m => m.id === expense.family_member_id)?.name || t('list.table.na')}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600 dark:text-red-400">
                          {expense.currency} {(expense.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button
                            onClick={(e) => handleEdit(e, expense.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                          >
                            {t('list.actions.edit')}
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(e, expense)}
                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t('list.actions.duplicate')}
                          >
                            <Copy className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, expense.id, expense.description)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                            disabled={isDeletingExpense}
                          >
                            {t('list.actions.delete')}
                          </button>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeFiltersCount > 0 ? (
                  <span>{t('list.filteredShort', { filtered: filteredExpenses.length, total: expenses.length })}</span>
                ) : (
                  <span>{t('list.allExpenses')} ({expenses.length})</span>
                )}
              </h2>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('list.noMatch')}</p>
                <button
                  onClick={clearFilters}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('list.clearFilters')}
                </button>
              </div>
            ) : (
              filteredExpenses.map((expense, index) => (
              <div
                key={expense.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm ${
                  isDeleting(expense.id) ? 'animate-slide-out-left' : 'animate-slide-up'
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
                      {expense.date}
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
                    {expense.category_name || t('common:common.noCategory')}
                  </span>
                  {isFamilyAccount && expense.family_member_id && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {familyMembers?.find(m => m.id === expense.family_member_id)?.name || t('list.table.na')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleEdit(e, expense.id)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('list.actions.edit')}
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(e, expense)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('list.actions.duplicate')}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, expense.id, expense.description)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    disabled={isDeletingExpense}
                  >
                    {t('list.actions.delete')}
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
