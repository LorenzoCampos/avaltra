import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useExpenseCategories,
  useIncomeCategories,
  useDeleteExpenseCategory,
  useDeleteIncomeCategory,
} from '@/hooks/useCategories';
import { useDeleteAnimation } from '@/hooks/useDeleteAnimation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import type { ExpenseCategory, IncomeCategory } from '@/types/category';

export const CategoriesList = () => {
  const { t } = useTranslation('categories');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes'>('expenses');

  // Expense categories
  const { data: expenseData, isLoading: isLoadingExpenses, error: expensesError } = useExpenseCategories();
  const { mutate: deleteExpenseCategory, isPending: isDeletingExpense } = useDeleteExpenseCategory();
  
  // Income categories
  const { data: incomeData, isLoading: isLoadingIncomes, error: incomesError } = useIncomeCategories();
  const { mutate: deleteIncomeCategory, isPending: isDeletingIncome } = useDeleteIncomeCategory();

  const { deletingId, handleDelete: handleDeleteWithAnimation, isDeleting } = useDeleteAnimation();

  const expenseCategories = expenseData?.expense_categories || [];
  const incomeCategories = incomeData?.income_categories || [];

  const handleEdit = (e: React.MouseEvent, type: 'expense' | 'income', id: string) => {
    e.stopPropagation();
    navigate(`/categories/edit/${type}/${id}`);
  };

  const handleDelete = (e: React.MouseEvent, type: 'expense' | 'income', id: string, name: string, isSystem: boolean) => {
    e.stopPropagation();
    
    if (isSystem) {
      toast.error(t('list.deleteSystemError'));
      return;
    }

    if (window.confirm(t('list.deleteConfirm', { name }))) {
      const deleteFn = type === 'expense' ? deleteExpenseCategory : deleteIncomeCategory;
      handleDeleteWithAnimation(id, () => deleteFn(id));
    }
  };

  const isLoading = isLoadingExpenses || isLoadingIncomes;
  const error = activeTab === 'expenses' ? expensesError : incomesError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('list.title')}</h1>
          <Button onClick={() => navigate(`/categories/new/${activeTab === 'expenses' ? 'expense' : 'income'}`)}>
            {t('list.addButton')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('list.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message || t('list.errorGeneric');
    return (
      <div className="text-center py-10">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{t('list.errorTitle')}</h3>
          <p className="text-red-600 dark:text-red-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const currentCategories = activeTab === 'expenses' ? expenseCategories : incomeCategories;
  const customCategories = currentCategories.filter(cat => !cat.is_system); // is_system = false means custom
  const predefinedCategories = currentCategories.filter(cat => cat.is_system); // is_system = true means predefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('list.title')}</h1>
        <Button onClick={() => navigate(`/categories/new/${activeTab === 'expenses' ? 'expense' : 'income'}`)}>
          {activeTab === 'expenses' ? t('list.addExpenseButton') : t('list.addIncomeButton')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'expenses'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('list.tabExpenses')} ({expenseCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'incomes'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('list.tabIncomes')} ({incomeCategories.length})
        </button>
      </div>

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('list.sectionCustom')} ({customCategories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCategories.map((category, index) => (
                <div
                  key={category.id}
                  className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow ${
                    isDeleting(category.id) ? 'animate-slide-out-left' : 'animate-slide-up'
                  } ${index < 5 ? `animation-delay-${index * 100}` : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon || '📁'}</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                    </div>
                    {category.color && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => handleEdit(e, activeTab === 'expenses' ? 'expense' : 'income', category.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {t('common:buttons.edit')}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, activeTab === 'expenses' ? 'expense' : 'income', category.id, category.name, category.is_system)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                      disabled={isDeletingExpense || isDeletingIncome}
                    >
                      {t('common:buttons.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predefined Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t('list.sectionSystem')} ({predefinedCategories.length})</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('list.systemDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predefinedCategories.map((category, index) => (
              <div
                key={category.id}
                className={`p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 ${
                  index < 5 ? `animation-delay-${index * 100}` : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon || '📁'}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                  </div>
                  {category.color && (
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    {t('list.systemBadge')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentCategories.length === 0 && (
        <Card>
          <CardContent className="py-20 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('list.noCategories')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('list.noCategoriesDescription', { type: t(`types.${activeTab}`) })}
            </p>
            <Button onClick={() => navigate(`/categories/new/${activeTab === 'expenses' ? 'expense' : 'income'}`)}>
              {t('list.addFirstButton')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
