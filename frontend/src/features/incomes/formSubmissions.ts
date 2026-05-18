import { withIncomePaymentContext } from '@/lib/paymentContext';
import type { CreateIncomeRequest } from '@/types/income';
import type { PaymentInstrument } from '@/types/paymentInstrument';
import {
  normalizePaymentMethodForCreate,
  normalizePaymentMethodForForm,
  normalizePaymentMethodForUpdate,
} from '@/types/paymentMethod';

export const getIncomeFormPaymentMethodValue = normalizePaymentMethodForForm;

export const buildIncomeSubmitPayload = (
  data: CreateIncomeRequest,
  isEditing: boolean,
  existingPaymentMethod?: CreateIncomeRequest['payment_method'],
  instruments?: PaymentInstrument[],
  existingContext?: { containerId?: string | null; instrumentId?: string | null },
): CreateIncomeRequest => withIncomePaymentContext(
  {
    ...data,
    payment_method: isEditing
      ? normalizePaymentMethodForUpdate(data.payment_method, existingPaymentMethod)
      : normalizePaymentMethodForCreate(data.payment_method),
  },
  instruments,
  existingContext,
);
