import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type { 
  ReportData, 
  ReportFilters, 
  ReportMetrics, 
  ExpenseByCategory, 
  IncomeByCategory, 
  MonthlyComparison,
  BalancePoint,
  DateRange,
} from '@/types/report';
import type { ExpensesListResponse } from '@/types/expense';
import type { IncomeListResponse } from '@/types/income';
import type { ActivityResponse } from './useActivity';

// Helper: Get month label from YYYY-MM format
const getMonthLabel = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Helper: Get list of months in date range
const getMonthsInRange = (startDate: string, endDate: string): string[] => {
  const months: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
};

// Helper: Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Calculate report data from expenses, incomes and activity
const calculateReportData = (
  expenses: ExpensesListResponse,
  incomes: IncomeListResponse,
  activity: ActivityResponse | null,
  filters: ReportFilters,
  accountCurrency: string
): ReportData => {
  const { dateRange } = filters;
  
  // === METRICS ===
  // Calculate totals from actual data, not summary (more reliable)
  const totalExpenses = expenses.expenses.reduce((sum, exp) => sum + exp.amount_in_primary_currency, 0);
  const totalIncome = incomes.incomes.reduce((sum, inc) => sum + inc.amount_in_primary_currency, 0);
  const totalSavingsDeposits = activity?.summary?.total_savings_deposits || 0;
  const totalSavingsWithdrawals = activity?.summary?.total_savings_withdrawals || 0;
  const netSavings = totalSavingsDeposits - totalSavingsWithdrawals;
  const balance = totalIncome - totalExpenses - netSavings;
  
  const startMonth = getMonthLabel(dateRange.startDate.substring(0, 7));
  const endMonth = getMonthLabel(dateRange.endDate.substring(0, 7));
  const period = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
  
  const metrics: ReportMetrics = {
    totalIncome,
    totalExpenses,
    balance,
    currency: accountCurrency as any,
    period,
  };
  
  // === EXPENSES BY CATEGORY ===
  const expensesByCategory: Map<string, { name: string; total: number }> = new Map();
  
  expenses.expenses.forEach((expense) => {
    const categoryId = expense.category_id || 'uncategorized';
    const categoryName = expense.category_name || 'Uncategorized';
    const current = expensesByCategory.get(categoryId) || { name: categoryName, total: 0 };
    expensesByCategory.set(categoryId, {
      name: categoryName,
      total: current.total + expense.amount_in_primary_currency,
    });
  });
  
  const expensesByCategoryArray: ExpenseByCategory[] = Array.from(expensesByCategory.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
  
  // === INCOMES BY CATEGORY ===
  const incomesByCategory: Map<string, { name: string; total: number }> = new Map();
  
  incomes.incomes.forEach((income) => {
    const categoryId = income.category_id || 'uncategorized';
    const categoryName = income.category_name || 'Uncategorized';
    const current = incomesByCategory.get(categoryId) || { name: categoryName, total: 0 };
    incomesByCategory.set(categoryId, {
      name: categoryName,
      total: current.total + income.amount_in_primary_currency,
    });
  });
  
  const incomesByCategoryArray: IncomeByCategory[] = Array.from(incomesByCategory.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      total: data.total,
      percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
  
  // === MONTHLY COMPARISON ===
  const monthsInRange = getMonthsInRange(dateRange.startDate, dateRange.endDate);
  const monthlyExpenses: Map<string, number> = new Map();
  const monthlyIncomes: Map<string, number> = new Map();
  
  expenses.expenses.forEach((expense) => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + expense.amount_in_primary_currency);
  });
  
  incomes.incomes.forEach((income) => {
    const month = income.date.substring(0, 7); // YYYY-MM
    monthlyIncomes.set(month, (monthlyIncomes.get(month) || 0) + income.amount_in_primary_currency);
  });
  
  const monthlyComparison: MonthlyComparison[] = monthsInRange.map((month) => {
    const incomeAmount = monthlyIncomes.get(month) || 0;
    const expenseAmount = monthlyExpenses.get(month) || 0;
    return {
      month,
      monthLabel: getMonthLabel(month),
      income: incomeAmount,
      expenses: expenseAmount,
      balance: incomeAmount - expenseAmount,
    };
  });
  
  // === BALANCE EVOLUTION ===
  // For simplicity, we'll calculate balance at the end of each month
  let cumulativeBalance = 0;
  const balanceEvolution: BalancePoint[] = monthlyComparison.map((monthData) => {
    cumulativeBalance += monthData.balance;
    // Use last day of month
    const [year, month] = monthData.month.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dateStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    
    return {
      date: dateStr,
      dateLabel: formatDate(dateStr),
      balance: cumulativeBalance,
    };
  });
  
  return {
    metrics,
    expensesByCategory: expensesByCategoryArray,
    incomesByCategory: incomesByCategoryArray,
    monthlyComparison,
    balanceEvolution,
  };
};

export const useReports = (filters: ReportFilters) => {
  const { activeAccountId, activeAccount } = useAccountStore();
  
  // Fetch expenses
  const { 
    data: expensesData, 
    isLoading: isLoadingExpenses,
    error: expensesError,
  } = useQuery<ExpensesListResponse>({
    queryKey: ['reports-expenses', activeAccountId, filters],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      
      const response = await api.get<ExpensesListResponse>('/expenses', {
        headers: { 'X-Account-ID': activeAccountId },
        params: {
          type: 'one-time',
          start_date: filters.dateRange.startDate,
          end_date: filters.dateRange.endDate,
          ...(filters.categoryId && { category_id: filters.categoryId }),
        },
      });
      return response.data;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch incomes
  const { 
    data: incomesData, 
    isLoading: isLoadingIncomes,
    error: incomesError,
  } = useQuery<IncomeListResponse>({
    queryKey: ['reports-incomes', activeAccountId, filters],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      
      const response = await api.get<IncomeListResponse>('/incomes', {
        headers: { 'X-Account-ID': activeAccountId },
        params: {
          type: 'one-time',
          start_date: filters.dateRange.startDate,
          end_date: filters.dateRange.endDate,
          ...(filters.categoryId && { category_id: filters.categoryId }),
        },
      });
      return response.data;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch activity (for savings goals data)
  const { 
    data: activityData, 
    isLoading: isLoadingActivity,
    error: activityError,
  } = useQuery<ActivityResponse>({
    queryKey: ['reports-activity', activeAccountId, filters],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      
      const response = await api.get<ActivityResponse>('/activity', {
        headers: { 'X-Account-ID': activeAccountId },
        params: {
          date_from: filters.dateRange.startDate,
          date_to: filters.dateRange.endDate,
          limit: 1, // We only need the summary, not the activities
        },
      });
      return response.data;
    },
    enabled: !!activeAccountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const isLoading = isLoadingExpenses || isLoadingIncomes || isLoadingActivity;
  const error = expensesError || incomesError || activityError;
  
  // Calculate report data
  const reportData: ReportData | null = 
    expensesData && incomesData && activeAccount
      ? calculateReportData(expensesData, incomesData, activityData || null, filters, activeAccount.currency)
      : null;
  
  return {
    reportData,
    isLoading,
    error,
  };
};

// Helper hook for date range presets
export const useDateRangePreset = (preset: string): DateRange => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  
  switch (preset) {
    case 'this-month': {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    case 'last-month': {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    case 'last-3-months': {
      const startDate = new Date(year, month - 2, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    case 'last-6-months': {
      const startDate = new Date(year, month - 5, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    case 'this-year': {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    case 'last-year': {
      const startDate = new Date(year - 1, 0, 1);
      const endDate = new Date(year - 1, 11, 31);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
    default: {
      // Default: this month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    }
  }
};
