import { TrendingDown, TrendingUp, Minus, Flame, Target, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/features/savings/components/ProgressBar';
import { useDashboard } from '@/hooks/useDashboard';
import { useSavings } from '@/hooks/useSavings';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { useAccountStore } from '@/stores/account.store';
import type { Currency } from '@/types/api';
import type { UpcomingRecurringItem } from '@/types/dashboard';
import {
  calculateMonthOverMonth,
  getBestSavingsInsight,
  getPreviousMonth,
  getTopSpendingCategory,
} from '@/utils/insights';

const formatAmount = (amount: number, currency: Currency) => formatCurrency(amount, currency);

const getUpcomingLabel = (item: UpcomingRecurringItem, t: (key: string, options?: Record<string, unknown>) => string) => {
  if (item.days_until === 0) return t('insights.today');
  if (item.days_until === 1) return t('insights.tomorrow');
  return t('insights.inDays', { count: item.days_until });
};

const InsightsSkeleton = () => (
  <Card className="animate-slide-up animation-delay-300">
    <CardHeader>
      <CardTitle className="text-xl">📊 <span className="ml-2">Monthly Insights</span></CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-1/2 ml-8" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const InsightsCard = () => {
  const { t } = useTranslation('dashboard');
  const { activeAccount } = useAccountStore();
  const { dashboard, isLoading } = useDashboard();

  const currentMonth = dashboard?.period || getCurrentMonth();
  const previousMonth = getPreviousMonth(currentMonth);

  const { dashboard: previousDashboard, isLoading: isLoadingPrevious } = useDashboard({
    month: previousMonth,
  });
  const { savingsGoals, isLoadingSavings } = useSavings('true');

  if (!activeAccount) return null;

  if (isLoading || isLoadingPrevious || isLoadingSavings) {
    return <InsightsSkeleton />;
  }

  const primaryCurrency = (dashboard?.primary_currency || activeAccount.currency) as Currency;
  const monthComparison = calculateMonthOverMonth(
    dashboard?.total_expenses || 0,
    previousDashboard?.total_expenses || 0
  );
  const topCategory = getTopSpendingCategory(dashboard?.expenses_by_category || []);
  const savingsInsight = getBestSavingsInsight(savingsGoals);
  const upcomingRecurring = dashboard?.upcoming_recurring.items || [];

  const hasInsights =
    !!topCategory ||
    !!savingsInsight ||
    upcomingRecurring.length > 0 ||
    (dashboard?.total_expenses || 0) > 0 ||
    (previousDashboard?.total_expenses || 0) > 0;

  if (!hasInsights) {
    return (
      <Card className="animate-slide-up animation-delay-300">
        <CardHeader>
          <CardTitle className="text-xl">📊 <span className="ml-2">{t('insights.title')}</span></CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('insights.noInsights')}</p>
        </CardContent>
      </Card>
    );
  }

  const comparisonIcon =
    monthComparison.trend === 'up' ? TrendingUp : monthComparison.trend === 'down' ? TrendingDown : Minus;
  const comparisonColor =
    monthComparison.trend === 'up'
      ? 'text-red-600 dark:text-red-400'
      : monthComparison.trend === 'down'
        ? 'text-green-600 dark:text-green-400'
        : 'text-gray-500 dark:text-gray-400';
  const ComparisonIcon = comparisonIcon;

  const comparisonText =
    monthComparison.trend === 'up'
      ? t('insights.spentMore', { percent: monthComparison.percentChange })
      : monthComparison.trend === 'down'
        ? t('insights.spentLess', { percent: monthComparison.percentChange })
        : t('insights.spentSame');

  return (
    <Card className="animate-slide-up animation-delay-300">
      <CardHeader>
        <CardTitle className="text-xl">📊 <span className="ml-2">{t('insights.title')}</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3">
          <ComparisonIcon className={`mt-0.5 h-5 w-5 shrink-0 ${comparisonColor}`} />
          <div>
            <p className={`font-medium ${comparisonColor}`}>{comparisonText}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('insights.versus', {
                current: formatAmount(dashboard?.total_expenses || 0, primaryCurrency),
                previous: formatAmount(previousDashboard?.total_expenses || 0, primaryCurrency),
              })}
            </p>
          </div>
        </div>

        {topCategory && (
          <div className="flex items-start gap-3">
            <Flame className="mt-0.5 h-5 w-5 shrink-0 text-orange-500 dark:text-orange-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {t('insights.topCategory', { name: topCategory.name || t('common:common.noCategory') })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('insights.categoryPercentage', {
                  amount: formatAmount(topCategory.total, primaryCurrency),
                  percent: Math.round(topCategory.percentage),
                })}
              </p>
            </div>
          </div>
        )}

        {savingsInsight && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {t('insights.savingsGoal', { name: savingsInsight.goalName })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('insights.savingsProgress', {
                    current: formatAmount(savingsInsight.current, primaryCurrency),
                    target: formatAmount(savingsInsight.target, primaryCurrency),
                    percent: savingsInsight.progress,
                  })}
                </p>
              </div>
            </div>

            <div className="ml-8 space-y-2">
              <ProgressBar
                current={savingsInsight.current}
                target={savingsInsight.target}
                percentage={savingsInsight.progress}
                currency={primaryCurrency}
                size="sm"
                showLabels={false}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {savingsInsight.progress >= 100
                  ? t('insights.savingsCompleted')
                  : savingsInsight.progress > 80
                    ? t('insights.savingsAlmostThere')
                    : t('insights.savingsRemaining', {
                        amount: formatAmount(savingsInsight.remaining, primaryCurrency),
                      })}
              </p>
            </div>
          </div>
        )}

        {upcomingRecurring.length > 0 && (
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">{t('insights.upcomingTitle')}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {upcomingRecurring.slice(0, 3).map((item) => (
                  <p key={item.id}>
                    • {item.description} ({formatAmount(item.amount, item.currency as Currency)}) —{' '}
                    {getUpcomingLabel(item, t)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
