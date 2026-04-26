import type { Expense } from './expense';

export interface ExpenseByCategory {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  description: string;
  amount: number;
  currency: string;
  amount_in_primary_currency: number;
  category_id?: string | null;
  category_name?: string | null;
  date: string;
  created_at: string;
}

export interface UpcomingRecurringItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  next_occurrence: string;
  days_until: number;
}

export interface UpcomingRecurringSummary {
  count: number;
  items: UpcomingRecurringItem[];
}

export interface DashboardSummary {
  period: string; // YYYY-MM
  primary_currency: string;
  total_income: number;
  total_expenses: number;
  total_assigned_to_goals: number;
  available_balance: number;
  expenses_by_category: ExpenseByCategory[];
  top_expenses: Expense[];
  recent_transactions: Transaction[];
  upcoming_recurring: UpcomingRecurringSummary;
}
