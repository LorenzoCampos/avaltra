import type { Currency } from './api';

// Base Savings Goal interface (as returned by API)
export interface SavingsGoal {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency: Currency;
  saved_in: string | null;
  deadline: string | null; // YYYY-MM-DD
  progress_percentage: number; // 0-100
  required_monthly_savings: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Request body for creating a new savings goal
export interface CreateSavingsGoalRequest {
  name: string;
  target_amount: number;
  description?: string;
  deadline?: string; // YYYY-MM-DD
  saved_in?: string;
}

// Request body for updating an existing savings goal
export interface UpdateSavingsGoalRequest {
  name?: string;
  target_amount?: number;
  description?: string;
  deadline?: string | null; // YYYY-MM-DD, null to remove
  saved_in?: string | null; // null to remove
}

// Request body for adding funds to a goal
export interface AddFundsRequest {
  amount: number;
  description?: string;
  date?: string; // YYYY-MM-DD, default: today
}

// Request body for withdrawing funds from a goal
export interface WithdrawFundsRequest {
  amount: number;
  description?: string;
  date?: string; // YYYY-MM-DD, default: today
}

// Response for GET /savings-goals (list)
export interface SavingsGoalsListResponse {
  goals: SavingsGoal[];
  count: number;
  summary?: {
    total_goals: number;
    active_goals: number;
    archived_goals: number;
    total_saved: number;
    total_target: number;
    overall_progress: number; // 0-100
  };
}

// Response for single goal operations (POST, PUT, GET /:id)
export interface SavingsGoalResponse {
  message?: string;
  savings_goal: SavingsGoal;
}

// Response for add/withdraw funds
export interface FundsOperationResponse {
  message: string;
  savings_goal: SavingsGoal;
  transaction: {
    amount: number;
    description: string;
    date: string;
    type: 'add' | 'withdraw';
  };
}

// Query params for GET /savings-goals
export interface SavingsGoalsListParams {
  is_active?: 'true' | 'false' | 'all';
}
