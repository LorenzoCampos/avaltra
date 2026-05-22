import { withIncomePaymentContext } from '@/lib/paymentContext';
import type { CreateIncomeRequest } from '@/types/income';

export const buildIncomeSubmitPayload = (
  data: CreateIncomeRequest,
  _isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateIncomeRequest => {
  const placeOnlyData = { ...data };
  delete placeOnlyData.payment_method;

  return withIncomePaymentContext(placeOnlyData, existingContext);
};
