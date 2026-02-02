import { useTranslation } from 'react-i18next';
import type { ReportMetrics } from '@/types/report';
import { ArrowUpIcon, ArrowDownIcon, WalletIcon } from 'lucide-react';

interface MetricsCardsProps {
  metrics: ReportMetrics;
}

export const MetricsCards = ({ metrics }: MetricsCardsProps) => {
  const { t } = useTranslation('reports');
  const { totalIncome, totalExpenses, balance, currency, period } = metrics;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const balanceColor = balance >= 0 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';
  
  return (
    <div className="space-y-4">
      {/* Period indicator */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('metrics.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{period}</p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('metrics.totalIncome')}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <ArrowUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        {/* Total Expenses Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('metrics.totalExpenses')}
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <ArrowDownIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        
        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('metrics.netBalance')}
              </p>
              <p className={`text-2xl font-bold mt-2 ${balanceColor}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              balance >= 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              <WalletIcon className={`w-6 h-6 ${balanceColor}`} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Info */}
      {balance < 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">
            {t('metrics.warningNegative')}
          </p>
        </div>
      )}
      
      {balance >= 0 && totalIncome > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-300">
            {t('metrics.successPositive')}{' '}
            <span className="font-semibold">
              {((balance / totalIncome) * 100).toFixed(1)}%
            </span>
            {' '}{t('metrics.ofYourIncome')}
          </p>
        </div>
      )}
    </div>
  );
};
