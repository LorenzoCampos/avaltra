import type { DashboardSummary } from '@/types/dashboard';

export interface DashboardCardAmounts {
  currentAvailableBalance: number;
  totalExpenses: number;
  totalIncome: number;
}

export function getDashboardCardAmounts(dashboard?: Partial<DashboardSummary>): DashboardCardAmounts {
  return {
    currentAvailableBalance: dashboard?.current_available_balance ?? dashboard?.available_balance ?? 0,
    totalExpenses: dashboard?.total_expenses ?? 0,
    totalIncome: dashboard?.total_income ?? 0,
  };
}
