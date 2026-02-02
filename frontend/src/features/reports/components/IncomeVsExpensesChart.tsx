import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyComparison } from '@/types/report';

interface IncomeVsExpensesChartProps {
  data: MonthlyComparison[];
  currency: string;
}

export const IncomeVsExpensesChart = ({ data, currency }: IncomeVsExpensesChartProps) => {
  const { t } = useTranslation('reports');
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('charts.monthlyComparison')}
        </h3>
        <div className="flex items-center justify-center h-80 text-gray-500 dark:text-gray-400">
          {t('charts.noExpenseData')}
        </div>
      </div>
    );
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
      const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
      const balance = income - expenses;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-green-600 dark:text-green-400">{t('charts.income')}:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(income)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-red-600 dark:text-red-400">{t('charts.expenses')}:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(expenses)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('charts.balance')}:</span>
              <span className={`text-sm font-bold ${
                balance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('charts.monthlyComparison')}
      </h3>
      
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fill: '#6b7280' }}
              className="dark:fill-gray-400"
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              className="dark:fill-gray-400"
              tickFormatter={(value) => {
                // Format large numbers (e.g., 1000 -> 1K)
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {value}
                </span>
              )}
            />
            <Bar 
              dataKey="income" 
              fill="#22c55e" 
              name={t('charts.income')}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="expenses" 
              fill="#ef4444" 
              name={t('charts.expenses')}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
            {t('charts.avgMonthlyIncome')}
          </p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            {formatCurrency(
              data.reduce((sum, item) => sum + item.income, 0) / data.length
            )}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
            {t('charts.avgMonthlyExpenses')}
          </p>
          <p className="text-lg font-bold text-red-900 dark:text-red-100">
            {formatCurrency(
              data.reduce((sum, item) => sum + item.expenses, 0) / data.length
            )}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
            {t('charts.avgMonthlyBalance')}
          </p>
          <p className={`text-lg font-bold ${
            data.reduce((sum, item) => sum + item.balance, 0) / data.length >= 0
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {formatCurrency(
              data.reduce((sum, item) => sum + item.balance, 0) / data.length
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
