import { z } from 'zod';

// Schema for creating a new savings goal
export const createSavingsGoalSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  target_amount: z
    .number({ invalid_type_error: 'Target amount must be a number' })
    .positive('Target amount must be greater than 0')
    .finite('Target amount must be a valid number'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  deadline: z
    .string()
    .optional()
    .refine((date) => {
      if (!date || date === '') return true; // Allow empty
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }, 'Deadline must be in YYYY-MM-DD format')
    .refine((date) => {
      if (!date || date === '') return true; // Allow empty
      const deadlineDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadlineDate >= today;
    }, 'Deadline must be a future date')
    .transform((date) => date === '' ? undefined : date),
  saved_in: z
    .string()
    .max(255, 'Saved in must be less than 255 characters')
    .trim()
    .optional(),
});

export type CreateSavingsGoalSchema = z.infer<typeof createSavingsGoalSchema>;

// Schema for updating an existing savings goal
export const updateSavingsGoalSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim()
    .optional(),
  target_amount: z
    .number({ invalid_type_error: 'Target amount must be a number' })
    .positive('Target amount must be greater than 0')
    .finite('Target amount must be a valid number')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .nullable()
    .optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be in YYYY-MM-DD format')
    .refine((date) => {
      const deadlineDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadlineDate >= today;
    }, 'Deadline must be a future date')
    .nullable()
    .optional(),
  saved_in: z
    .string()
    .max(255, 'Saved in must be less than 255 characters')
    .trim()
    .nullable()
    .optional(),
});

export type UpdateSavingsGoalSchema = z.infer<typeof updateSavingsGoalSchema>;

// Schema for adding funds
export const addFundsSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export type AddFundsSchema = z.infer<typeof addFundsSchema>;

// Schema for withdrawing funds
export const withdrawFundsSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export type WithdrawFundsSchema = z.infer<typeof withdrawFundsSchema>;
