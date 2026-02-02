import type { TransactionType } from './api'; // Assuming TransactionType is defined here as 'expense' | 'income'

export interface BaseCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_system: boolean; // true = system predefined, false = user created
  created_at?: string;
}

export interface ExpenseCategory extends BaseCategory {}
export interface IncomeCategory extends BaseCategory {}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
  type: TransactionType; // 'expense' or 'income'
}

export interface UpdateCategoryRequest {
  id: string; // Required for update
  name?: string;
  icon?: string | null; // Use null to clear
  color?: string | null; // Use null to clear
}

export interface CategoryListResponse<T> {
  categories: T[];
  count: number;
}
