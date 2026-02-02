/**
 * ============================================================================
 * EXPENSES PAGE - Con tabs para Expenses y Recurring Expenses
 * ============================================================================
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpenseList } from './ExpenseList';
import { RecurringExpensesList } from '@/features/recurring-expenses/RecurringExpensesList';

export const ExpensesPage = () => {
  const { t } = useTranslation('expenses');
  const [activeTab, setActiveTab] = useState<'expenses' | 'recurring'>('expenses');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.expenses')}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'recurring'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.recurring')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && <ExpenseList />}
      {activeTab === 'recurring' && <RecurringExpensesList />}
    </div>
  );
};
