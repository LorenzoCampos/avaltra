import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BalancePoint } from '@/types/report';

interface BalanceLineChartProps {
  data: BalancePoint[];
  currency: string;
}

export const BalanceLineChart = ({ data, currency }: BalanceLineChartProps) => {
  const { t } = useTranslation('reports');
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('charts.balanceEvolution')}
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
      const balance = payload[0].value;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance:</span>
            <span className={`text-sm font-bold ${
              balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Calculate min/max for better Y-axis scaling
  const balances = data.map(d => d.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  
  // Determine line color based on overall trend
  const startBalance = data[0]?.balance || 0;
  const endBalance = data[data.length - 1]?.balance || 0;
  const isPositiveTrend = endBalance >= startBalance;
  const lineColor = isPositiveTrend ? '#22c55e' : '#ef4444'; // green-500 : red-500
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('charts.balanceEvolution')}
      </h3>
      
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fill: '#6b7280' }}
              className="dark:fill-gray-400"
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              className="dark:fill-gray-400"
              tickFormatter={(value) => {
                // Format large numbers (e.g., 1000 -> 1K)
                if (Math.abs(value) >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Zero line reference */}
            <ReferenceLine 
              y={0} 
              stroke="#9ca3af" 
              strokeDasharray="3 3"
              label={{ 
                value: 'Break Even', 
                position: 'insideTopRight',
                fill: '#6b7280',
                fontSize: 12,
              }}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('charts.startingBalance')}
          </p>
          <p className={`text-lg font-bold ${
            startBalance >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(startBalance)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('charts.currentBalance')}
          </p>
          <p className={`text-lg font-bold ${
            endBalance >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(endBalance)}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${
          isPositiveTrend 
            ? 'bg-green-50 dark:bg-green-900/20' 
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            isPositiveTrend
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
          }`}>
            {t('charts.netChange')}
          </p>
          <p className={`text-lg font-bold ${
            isPositiveTrend
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {endBalance >= startBalance ? '+' : ''}
            {formatCurrency(endBalance - startBalance)}
          </p>
        </div>
      </div>
      
      {/* Trend indicator */}
      <div className={`mt-4 p-3 rounded-lg ${
        isPositiveTrend 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        <p className={`text-sm ${
          isPositiveTrend
            ? 'text-green-800 dark:text-green-300'
            : 'text-red-800 dark:text-red-300'
        }`}>
          {isPositiveTrend ? '📈' : '📉'}{' '}
          {isPositiveTrend 
            ? t('charts.trendUpward')
            : t('charts.trendDownward')}
        </p>
      </div>
    </div>
  );
};
