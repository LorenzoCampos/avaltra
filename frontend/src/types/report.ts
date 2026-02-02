import type { Currency } from './api';

// Date range filter for reports
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Predefined date range options
export type DateRangePreset =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'this-year'
  | 'last-year'
  | 'custom';

// Filters for reports
export interface ReportFilters {
  dateRange: DateRange;
  accountId?: string; // Filter by specific account
  categoryId?: string; // Filter by category
  currency?: Currency | 'all'; // Filter by currency or show all
}

// Summary metrics
export interface ReportMetrics {
  totalIncome: number;
  totalExpenses: number;
  balance: number; // income - expenses
  currency: Currency;
  period: string; // e.g., "Jan 2026" or "Jan - Jun 2026"
}

// Expense by category (for pie chart)
export interface ExpenseByCategory {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number; // 0-100
  color?: string; // Optional color for chart
}

// Income by category (for pie chart)
export interface IncomeByCategory {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number; // 0-100
  color?: string; // Optional color for chart
}

// Monthly comparison data (for bar/line chart)
export interface MonthlyComparison {
  month: string; // YYYY-MM
  monthLabel: string; // "Jan 2026"
  income: number;
  expenses: number;
  balance: number;
}

// Balance evolution over time (for line chart)
export interface BalancePoint {
  date: string; // YYYY-MM-DD
  dateLabel: string; // "Jan 15"
  balance: number;
}

// Complete report data
export interface ReportData {
  metrics: ReportMetrics;
  expensesByCategory: ExpenseByCategory[];
  incomesByCategory: IncomeByCategory[];
  monthlyComparison: MonthlyComparison[];
  balanceEvolution: BalancePoint[];
}

// CSV export data structure
export interface CSVExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}
