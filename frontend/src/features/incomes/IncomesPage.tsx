/**
 * ============================================================================
 * INCOMES PAGE - Con tabs para Incomes y Recurring Incomes
 * ============================================================================
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IncomeList } from './IncomeList';
import { RecurringIncomesList } from '@/features/recurring-incomes/RecurringIncomesList';

export const IncomesPage = () => {
  const { t } = useTranslation('incomes');
  const [activeTab, setActiveTab] = useState<'incomes' | 'recurring'>('incomes');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'incomes'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.incomes')}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'recurring'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.recurring')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'incomes' && <IncomeList />}
      {activeTab === 'recurring' && <RecurringIncomesList />}
    </div>
  );
};
