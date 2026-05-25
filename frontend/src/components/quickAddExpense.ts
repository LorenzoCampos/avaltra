import { z } from 'zod';

import type { Currency } from '@/schemas/account.schema';
import { PAYMENT_METHODS, normalizePaymentMethodForCreate } from '@/types/paymentMethod';
import type { Account } from '@/types/account';
import type { PaymentContainer } from '@/types/paymentContainer';

const optionalPaymentMethodSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.enum(PAYMENT_METHODS).nullable().optional(),
);

const requiredSourceContainerSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string({ error: 'Source place is required' }).uuid('Invalid payment context ID'),
);

const quickAddSchemaBase = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().nullable().optional(),
  family_member_id: z.string().nullable().optional(),
  payment_method: optionalPaymentMethodSchema,
  source_container_id: requiredSourceContainerSchema,
});

export const createQuickAddSchema = (hasFamilyMembers: boolean) => quickAddSchemaBase.superRefine((data, ctx) => {
  if (hasFamilyMembers && !data.family_member_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['family_member_id'],
      message: 'Family member is required for family accounts',
    });
  }
});

export type QuickAddFormInput = z.input<typeof quickAddSchemaBase>;
export type QuickAddFormData = z.output<typeof quickAddSchemaBase>;

export const buildQuickAddExpensePayload = (
  data: QuickAddFormData,
  defaultCurrency: Currency,
  defaultDate: string,
) => ({
  ...data,
  currency: defaultCurrency,
  date: defaultDate,
  payment_method: normalizePaymentMethodForCreate(data.payment_method),
  source_container_id: data.source_container_id,
});

export const resolveQuickAddDefaultExpenseContainer = (
  account: Pick<Account, 'default_expense_container_id'> | null | undefined,
  containers: Pick<PaymentContainer, 'id' | 'is_active'>[],
) => {
  if (!account?.default_expense_container_id) {
    return null;
  }

  const defaultContainer = containers.find((container) => container.id === account.default_expense_container_id);
  return defaultContainer?.is_active ? defaultContainer : null;
};

export const resolveQuickAddSourceContainerSelection = ({
  currentSourceContainerId,
  defaultSourceContainerId,
  activePaymentContainers,
  isLoadingPaymentContainers,
}: {
  currentSourceContainerId: string | null | undefined;
  defaultSourceContainerId: string | null | undefined;
  activePaymentContainers: Pick<PaymentContainer, 'id' | 'is_active'>[];
  isLoadingPaymentContainers: boolean;
}) => {
  if (isLoadingPaymentContainers) {
    return currentSourceContainerId || undefined;
  }

  const activeContainerIds = new Set(activePaymentContainers.map((container) => container.id));

  if (currentSourceContainerId) {
    return activeContainerIds.has(currentSourceContainerId) ? currentSourceContainerId : undefined;
  }

  return defaultSourceContainerId && activeContainerIds.has(defaultSourceContainerId) ? defaultSourceContainerId : undefined;
};

export const shouldShowQuickAddNoActivePlacesWarning = (
  isLoadingPaymentContainers: boolean,
  activePaymentContainers: Pick<PaymentContainer, 'id' | 'is_active'>[],
) => !isLoadingPaymentContainers && activePaymentContainers.length === 0;
