import { z } from 'zod';

export const ACCOUNT_TYPES = ['personal', 'family'] as const;
export const CURRENCIES = ['ARS', 'USD', 'EUR'] as const;

const optionalDefaultPlaceSchema = z.string()
  .uuid('Invalid default place ID')
  .nullable()
  .or(z.literal(''))
  .optional();

export const accountSchema = z.object({
  name: z.string().min(1, { message: "Account name is required" }).max(100, { message: "Account name must be less than 100 characters" }),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  default_expense_container_id: optionalDefaultPlaceSchema,
  default_income_container_id: optionalDefaultPlaceSchema,
});

export const familyMemberSchema = z.object({
  name: z.string().min(1, { message: "Member name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }).optional().or(z.literal("")),
});

export type AccountType = typeof ACCOUNT_TYPES[number];
export type Currency = typeof CURRENCIES[number];
