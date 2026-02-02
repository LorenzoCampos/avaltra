import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReports, useDateRangePreset } from '@/hooks/useReports';
import { useAccountStore } from '@/stores/account.store';
import { MetricsCards } from './components/MetricsCards';
import { ExpensesPieChart } from './components/ExpensesPieChart';
import { IncomeVsExpensesChart } from './components/IncomeVsExpensesChart';
import { BalanceLineChart } from './components/BalanceLineChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { exportFullReportCSV } from './utils/exportCSV';
import type { DateRangePreset } from '@/types/report';
import { DownloadIcon } from 'lucide-react';

export const ReportsPage = () => {
  const { t } = useTranslation('reports');
  const { activeAccount, activeAccountId } = useAccountStore();
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last-6-months');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  
  // Get date range based on preset
  const presetDateRange = useDateRangePreset(selectedPreset);
  const dateRange = selectedPreset === 'custom' && customDateRange.startDate && customDateRange.endDate
    ? customDateRange
    : presetDateRange;
  
  // Fetch reports data
  const { reportData, isLoading, error } = useReports({ dateRange });
  
  if (!activeAccountId || !activeAccount) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('page.title')}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('page.noAccount')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('page.noAccountDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const presetOptions: { value: DateRangePreset; label: string }[] = [
    { value: 'this-month', label: t('filters.thisMonth') },
    { value: 'last-month', label: t('filters.lastMonth') },
    { value: 'last-3-months', label: t('filters.last3Months') },
    { value: 'last-6-months', label: t('filters.last6Months') },
    { value: 'this-year', label: t('filters.thisYear') },
    { value: 'last-year', label: t('filters.lastYear') },
    { value: 'custom', label: t('filters.customRange') },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('page.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('page.subtitle')}
          </p>
        </div>
        
        {/* Export Button */}
        {reportData && (
          <Button
            variant="secondary"
            onClick={() => exportFullReportCSV(reportData, activeAccount.currency)}
            className="flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            {t('page.exportButton')}
          </Button>
        )}
      </div>
      
      {/* Filters */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>{t('filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedPreset === option.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedPreset(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            
            {/* Custom date range inputs */}
            {selectedPreset === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('filters.startDate')}
                  </label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('filters.endDate')}
                  </label>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            )}
            
            {/* Current range display */}
            <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
              <span className="font-medium">{t('filters.selectedPeriod')}</span>{' '}
              {dateRange.startDate} {t('filters.to')} {dateRange.endDate}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <ChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{t('page.errorTitle')}</h3>
            <p className="text-red-600 dark:text-red-400">
              {(error as any)?.response?.data?.error || (error as any)?.message || t('page.errorGeneric')}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              {t('page.retryButton')}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Reports Content */}
      {!isLoading && !error && reportData && (
        <div className="space-y-6">
          {/* Metrics Summary */}
          <FeatureErrorBoundary featureName="Metrics Summary">
            <div className="animate-slide-up">
              <MetricsCards metrics={reportData.metrics} />
            </div>
          </FeatureErrorBoundary>
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses by Category */}
            <FeatureErrorBoundary featureName="Expenses Chart">
              <div className="animate-slide-up animation-delay-100">
                <ExpensesPieChart 
                  data={reportData.expensesByCategory} 
                  currency={activeAccount.currency}
                />
              </div>
            </FeatureErrorBoundary>
            
            {/* Income by Category */}
            <FeatureErrorBoundary featureName="Income Chart">
              <div className="animate-slide-up animation-delay-200">
                <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('charts.incomeByCategory')}
                  </h3>
                  {reportData.incomesByCategory.length > 0 ? (
                    <div className="space-y-2">
                      {reportData.incomesByCategory.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.categoryName}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: activeAccount.currency,
                              }).format(item.total)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
                      {t('charts.noIncomeData')}
                    </div>
                  )}
                </Card>
              </div>
            </FeatureErrorBoundary>
          </div>
          
          {/* Monthly Comparison - Full Width */}
          <FeatureErrorBoundary featureName="Monthly Comparison">
            <div className="animate-slide-up animation-delay-300">
              <IncomeVsExpensesChart 
                data={reportData.monthlyComparison} 
                currency={activeAccount.currency}
              />
            </div>
          </FeatureErrorBoundary>
          
          {/* Balance Evolution - Full Width */}
          <FeatureErrorBoundary featureName="Balance Evolution">
            <div className="animate-slide-up animation-delay-400">
              <BalanceLineChart 
                data={reportData.balanceEvolution} 
                currency={activeAccount.currency}
              />
            </div>
          </FeatureErrorBoundary>
        </div>
      )}
    </div>
  );
};
