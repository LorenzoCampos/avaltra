import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActivity,
  formatCurrency,
  formatActivityDate,
  getActivityIcon,
  getActivityColor,
  getActivityLabel,
  type ActivityItem,
} from '@/hooks/useActivity';
import { useFilters } from '@/hooks/useFilters';
import { FilterBar } from '@/components/FilterBar';
import { Loader2 } from 'lucide-react';

export function ActivityFeed() {
  const { t } = useTranslation('activity');
  const { data, isLoading, error } = useActivity({});

  console.log('ActivityFeed state:', { isLoading, error: error?.toString(), dataLength: data?.activities?.length });

  // Adaptar ActivityItem para que funcione con useFilters
  // ActivityItem tiene: { type, description, amount, date, category_name, goal_name }
  // FilterableItem necesita: { description, date, amount, amount_in_primary_currency, category_id }
  const adaptedActivities = useMemo(() => {
    if (!data?.activities) return [];
    
    return data.activities.map(activity => ({
      ...activity,
      // Para filtros: usar category_name como "pseudo category_id" 
      // (no es ideal pero funciona para filtrado por texto)
      category_id: activity.category_name || activity.goal_name || null,
      // Activity ya viene en moneda primaria (ARS) desde el backend
      amount_in_primary_currency: activity.amount,
    }));
  }, [data?.activities]);

  // Filters
  const {
    filters,
    filteredData: filteredActivities,
    activeFiltersCount,
    setSearchText,
    setDateRange,
    setAmountRange,
    setCategoryIds,
    clearFilters,
  } = useFilters(adaptedActivities);

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = activity.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message || t('error.unknown');
    console.error('Activity error:', error);
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-semibold mb-2">{t('error.title')}</p>
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      {adaptedActivities.length > 0 && (
        <FilterBar
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onSearchChange={setSearchText}
          onDateRangeChange={setDateRange}
          onAmountRangeChange={setAmountRange}
          onCategoryIdsChange={setCategoryIds}
          onFamilyMemberIdsChange={() => {}} // Activity no tiene family members
          onClearFilters={clearFilters}
          categories={[]} // Activity no tiene categories separadas (mezcla expenses/incomes/savings)
          familyMembers={[]}
          showFamilyMemberFilter={false}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-900 dark:text-green-300">{t('summary.income')}</p>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(data.summary.total_income, 'ARS')}
          </p>
        </div>

        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-300">{t('summary.expenses')}</p>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data.summary.total_expenses, 'ARS')}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('summary.saved')}</p>
          <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(data.summary.total_savings_deposits - data.summary.total_savings_withdrawals, 'ARS')}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-300">{t('summary.balance')}</p>
          <p className={`mt-1 text-xl font-bold ${data.summary.net_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(data.summary.net_balance, 'ARS')}
          </p>
        </div>
      </div>

      {/* Activity timeline */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('noResults')}
          </p>
          <button
            onClick={clearFilters}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedActivities && Object.entries(groupedActivities)
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([date, activities]) => (
              <div key={date}>
                <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {formatActivityDate(date)}
                </div>
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Pagination info */}
      {data.total_pages > 1 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Mostrando {data.activities.length} de {data.total_count} actividades
        </div>
      )}
    </div>
  );
}

// Activity card component
function ActivityCard({ activity }: { activity: ActivityItem }) {
  const icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);
  const label = getActivityLabel(activity.type);
  const isNegative = activity.type === 'expense' || activity.type === 'savings_deposit';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750">
      {/* Left side: icon + info */}
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            {activity.description}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activity.category_name || activity.goal_name || label}
          </p>
        </div>
      </div>

      {/* Right side: amount */}
      <div className="text-right">
        <p className={`text-lg font-semibold ${color}`}>
          {isNegative && '-'}
          {formatCurrency(activity.amount, activity.currency)}
        </p>
        {activity.currency !== 'ARS' && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activity.currency}
          </p>
        )}
      </div>
    </div>
  );
}
