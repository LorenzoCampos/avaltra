import { withIncomePaymentContext } from '@/lib/paymentContext';
import type { CreateIncomeRequest } from '@/types/income';

export const buildIncomeSubmitPayload = (
  data: CreateIncomeRequest,
  _isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateIncomeRequest => {
  const { payment_method: _paymentMethod, ...placeOnlyData } = data;

  return withIncomePaymentContext(placeOnlyData, existingContext);
};
