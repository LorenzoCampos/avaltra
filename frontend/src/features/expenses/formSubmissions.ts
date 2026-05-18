import { withExpensePaymentContext } from '@/lib/paymentContext';
import type { CreateExpenseRequest } from '@/types/expense';
import type { PaymentInstrument } from '@/types/paymentInstrument';
import {
  normalizePaymentMethodForCreate,
  normalizePaymentMethodForForm,
  normalizePaymentMethodForUpdate,
} from '@/types/paymentMethod';

export const getExpenseFormPaymentMethodValue = normalizePaymentMethodForForm;

export const buildExpenseSubmitPayload = (
  data: CreateExpenseRequest,
  isEditing: boolean,
  existingPaymentMethod?: CreateExpenseRequest['payment_method'],
  instruments?: PaymentInstrument[],
  existingContext?: { containerId?: string | null; instrumentId?: string | null },
): CreateExpenseRequest => withExpensePaymentContext(
  {
    ...data,
    payment_method: isEditing
      ? normalizePaymentMethodForUpdate(data.payment_method, existingPaymentMethod)
      : normalizePaymentMethodForCreate(data.payment_method),
  },
  instruments,
  existingContext,
);
