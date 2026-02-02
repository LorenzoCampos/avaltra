import { z } from 'zod';
import { CURRENCIES } from './account.schema';

export const expenseSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }).max(200, { message: "Description must be less than 200 characters" }),
  amount: z.number().min(0.01, { message: "Amount must be greater than 0" }),
  currency: z.enum(CURRENCIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }),
  category_id: z.string().uuid("Invalid category ID").nullable().optional(), // Nullable for 'Other' or no category
  family_member_id: z.string().uuid("Invalid family member ID").nullable().optional(), // Nullable for no specific member
  exchange_rate: z.number().min(0.01, { message: "Exchange rate must be greater than 0" }).optional(),
  amount_in_primary_currency: z.number().min(0.01, { message: "Amount in primary currency must be greater than 0" }).optional(),
});

export const updateExpenseSchema = expenseSchema.partial().extend({
  id: z.string().uuid({ message: "Expense ID is required for update" }),
  // Special handling for clearing fields with empty string for update
  category_id: z.string().uuid("Invalid category ID").nullable().or(z.literal("")).optional(),
  family_member_id: z.string().uuid("Invalid family member ID").nullable().or(z.literal("")).optional(),
  // Do not allow updating expense_type or end_date for one-time expenses
  expense_type: z.any().optional(),
  end_date: z.any().optional(),
});
