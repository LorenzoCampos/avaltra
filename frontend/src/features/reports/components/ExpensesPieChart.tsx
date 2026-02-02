import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ExpenseByCategory } from '@/types/report';

interface ExpensesPieChartProps {
  data: ExpenseByCategory[];
  currency: string;
}

// Color palette for categories (matching expenses theme - reds/oranges)
const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
];

export const ExpensesPieChart = ({ data, currency }: ExpensesPieChartProps) => {
  const { t } = useTranslation('reports');
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('charts.expensesByCategory')}
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
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
  
  // Prepare data for chart
  const chartData = data.map((item, index) => ({
    name: item.categoryName,
    value: item.total,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length],
  }));
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Custom label
  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(0)}%`;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('charts.expensesByCategory')}
      </h3>
      
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Category breakdown list */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Breakdown
        </h4>
        {chartData.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
        {chartData.length > 5 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            + {chartData.length - 5} more categories
          </p>
        )}
      </div>
    </div>
  );
};
