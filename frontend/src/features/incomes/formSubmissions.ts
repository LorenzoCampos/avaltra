import { withIncomePaymentContext } from '@/lib/paymentContext';
import type { CreateIncomeRequest } from '@/types/income';

export const buildIncomeSubmitPayload = (
  data: CreateIncomeRequest,
  isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateIncomeRequest => {
  void isEditing;
  void existingContext;

  const placeOnlyData = { ...data };
  delete placeOnlyData.payment_method;

  return withIncomePaymentContext(placeOnlyData);
};
