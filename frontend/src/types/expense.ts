import type { Currency } from '@/schemas/account.schema';
import type { PaymentMethod } from './paymentMethod';
import type { PaymentContainerKind } from './paymentContainer';
import type { PaymentInstrumentKind } from './paymentInstrument';

export interface PaymentContext {
  container_id: string | null;
  container_name: string | null;
  container_type: PaymentContainerKind | null;
  instrument_id: string | null;
  instrument_name: string | null;
  instrument_type: PaymentInstrumentKind | null;
  legacy_payment_method: PaymentMethod | null;
  display_label: string | null;
}

// Base Expense interface
export interface Expense {
  id: string;
  account_id: string;
  family_member_id: string | null;
  category_id: string | null;
  category_name: string | null;
  description: string;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  amount_in_primary_currency: number;
  expense_type: 'one-time' | 'recurring';
  date: string; // YYYY-MM-DD
  end_date: string | null; // Can be present on response, even for one-time if it was generated from recurring
  payment_method: PaymentMethod | null;
  source_container_id?: string | null;
  source_instrument_id?: string | null;
  payment_context?: PaymentContext | null;
  created_at: string;
  updated_at: string;
}

// Request body for creating a new one-time expense
export interface CreateExpenseRequest {
  description: string;
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  category_id?: string | null; // Use null to clear category
  family_member_id?: string | null; // Use null to clear member
  payment_method?: PaymentMethod | null;
  source_container_id?: string | null;
  source_instrument_id?: string | null;
  // For multi-currency Mode 3 (optional)
  exchange_rate?: number;
  amount_in_primary_currency?: number;
}

// Request body for updating an existing expense
export interface UpdateExpenseRequest {
  id: string; // Required for update
  description?: string;
  amount?: number;
  currency?: Currency;
  date?: string; // YYYY-MM-DD
  category_id?: string | null; // Use null to clear category
  family_member_id?: string | null; // Use null to clear member
  payment_method?: PaymentMethod | null;
  source_container_id?: string | null;
  source_instrument_id?: string | null;
  // For multi-currency Mode 3 (optional)
  exchange_rate?: number;
  amount_in_primary_currency?: number;
}

// Response for GET /expenses (list)
export interface ExpensesListResponse {
  expenses: Expense[];
  count: number;
  summary: {
    total: number;
    byType: {
      'one-time': number;
      recurring: number;
    };
  };
}
