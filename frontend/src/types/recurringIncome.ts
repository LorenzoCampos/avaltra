export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringIncome {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category_id?: string;
  category_name?: string;
  family_member_id?: string;
  family_member_name?: string;
  recurrence_frequency: RecurrenceFrequency;
  recurrence_interval: number;
  recurrence_day_of_month?: number;
  recurrence_day_of_week?: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  total_occurrences?: number;
  current_occurrence: number;
  exchange_rate?: number;
  amount_in_primary_currency?: number;
  is_active: boolean;
  created_at: string;
  generated_incomes_count?: number;
}

export interface RecurringIncomeFormData {
  description: string;
  amount: number;
  currency: string;
  category_id?: string | null;
  family_member_id?: string | null;
  recurrence_frequency: RecurrenceFrequency;
  recurrence_interval: number;
  recurrence_day_of_month?: number | null;
  recurrence_day_of_week?: number | null;
  start_date: string;
  end_date?: string | null;
  total_occurrences?: number | null;
  amount_in_primary_currency?: number | null;
  is_active?: boolean;
}

export interface RecurringIncomesListResponse {
  recurring_incomes: RecurringIncome[];
  count: number;
  total: number;
  page: number;
  limit: number;
}
