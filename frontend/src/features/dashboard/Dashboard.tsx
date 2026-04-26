import { useTranslation } from 'react-i18next';
import { useDashboard } from '@/hooks/useDashboard';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountStore } from '@/stores/account.store';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardCardSkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { QuickAddExpenseFAB } from '@/components/QuickAddExpenseFAB';
import { InfoTooltip } from '@/components/InfoTooltip';
import { InsightsCard } from './InsightsCard';
import type { Currency } from '@/schemas/account.schema';

export const Dashboard = () => {
  const { t } = useTranslation('dashboard');
  const user = useAuthStore((state) => state.user);
  const { activeAccount, activeAccountId } = useAccountStore();
  const navigate = useNavigate();
  
  // ============================================================================
  // IMPORTANTE: Llamar a useAccounts para que se auto-seleccione default account
  // ============================================================================
  useAccounts();
  
  const { dashboard, isLoading, error } = useDashboard();

  if (!activeAccountId || !activeAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome', { name: user?.name })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('getStarted')}
          </p>
        </div>

        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('noAccount.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('noAccount.description')}</p>
            <Button onClick={() => navigate('/accounts')}>
              {t('noAccount.button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome', { name: user?.name })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('loading')}</p>
        </div>
        
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>

        {/* Expenses by Category Skeleton */}
        <ChartSkeleton />

        {/* Top Expenses Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>{t('topExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSkeleton items={5} />
          </CardContent>
        </Card>

        {/* Recent Transactions Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>{t('recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSkeleton items={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message || t('error.message');
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome', { name: user?.name })}
          </h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{t('error.title')}</h3>
            <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              {t('error.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    period,
    primary_currency,
    total_income,
    total_expenses,
    available_balance,
    expenses_by_category,
    top_expenses,
    recent_transactions,
  } = dashboard || {};

  const primaryCurrency = (primary_currency || activeAccount.currency) as Currency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('welcome', { name: user?.name })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('overview', { period: period || getCurrentMonth() })}
        </p>
      </div>

      {/* Summary Cards - Protected */}
      <FeatureErrorBoundary featureName="Summary Cards">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="animate-slide-up" data-tour="available-balance">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {t('cards.availableBalance.title')}
                <InfoTooltip content={t('tooltips.availableBalance')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(available_balance || 0, primaryCurrency)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('cards.availableBalance.subtitle')}</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up animation-delay-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {t('cards.expenses.title')}
                <InfoTooltip content={t('tooltips.expenses')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(total_expenses || 0, primaryCurrency)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('cards.expenses.subtitle', { count: top_expenses?.length || 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up animation-delay-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {t('cards.income.title')}
                <InfoTooltip content={t('tooltips.income')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(total_income || 0, primaryCurrency)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('cards.income.subtitle')}</p>
            </CardContent>
          </Card>
        </div>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary featureName="Monthly Insights">
        <InsightsCard />
      </FeatureErrorBoundary>

      {/* Quick Actions - Hidden but exists for tour */}
      <div data-tour="quick-actions" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={() => navigate('/expenses/new')}
          size="lg"
          className="w-full"
        >
          💸 {t('common:buttons.addExpense')}
        </Button>
        <Button 
          onClick={() => navigate('/incomes/new')}
          size="lg"
          variant="secondary"
          className="w-full"
        >
          💰 {t('common:buttons.addIncome')}
        </Button>
      </div>

      {/* Reports CTA */}
      <Card className="animate-slide-up animation-delay-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('reportsCta.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('reportsCta.description')}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/reports')}
              className="whitespace-nowrap"
              size="lg"
            >
              {t('reportsCta.button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses by Category - Protected */}
      {expenses_by_category && expenses_by_category.length > 0 && (
        <FeatureErrorBoundary featureName="Expenses by Category">
          <Card className="animate-slide-up animation-delay-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('expensesByCategory')}
                <InfoTooltip content={t('tooltips.expensesByCategory')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses_by_category.map((category) => (
                  <div key={category.category_id || 'no-category'}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {category.category_icon && <span>{category.category_icon}</span>}
                        {category.category_name || t('common:common.noCategory')}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                        {formatCurrency(category.total, primaryCurrency)}
                        <span className="text-gray-500 dark:text-gray-400 ml-2">({category.percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: category.category_color || '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      )}

      {/* Top Expenses - Protected */}
      {top_expenses && top_expenses.length > 0 && (
        <FeatureErrorBoundary featureName="Top Expenses">
          <Card className="animate-slide-up animation-delay-400">
            <CardHeader>
              <CardTitle>{t('topExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top_expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{expense.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {expense.category_name || t('common:common.noCategory')} • {expense.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(expense.amount_in_primary_currency, primaryCurrency)}
                      </p>
                      {expense.currency !== primaryCurrency && (
                        <p className="text-xs text-gray-500">
                          {formatCurrency(expense.amount, expense.currency as Currency)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      )}

      {/* Recent Transactions - Protected */}
      {recent_transactions && recent_transactions.length > 0 && (
        <FeatureErrorBoundary featureName="Recent Transactions">
          <Card className="animate-slide-up animation-delay-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('recentTransactions')}
                <InfoTooltip content={t('tooltips.recentTransactions')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recent_transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.category_name || t('common:common.noCategory')} • {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount_in_primary_currency, primaryCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      )}

      {/* Empty State */}
      {(!recent_transactions || recent_transactions.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('emptyState.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                {t('emptyState.welcome')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>{t('emptyState.tips.trackTransactions')}</li>
                <li>{t('emptyState.tips.setSavings')}</li>
                <li>{t('emptyState.tips.inviteFamily')}</li>
              </ul>
              <div className="flex gap-3 mt-4">
                <Button onClick={() => navigate('/expenses/new')}>
                  {t('common:buttons.addExpense')}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/incomes')}>
                  {t('common:buttons.addIncome')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Add FAB (Mobile only) */}
      <QuickAddExpenseFAB />
    </div>
  );
};
