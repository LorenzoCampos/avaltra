import { withExpensePaymentContext } from '@/lib/paymentContext';
import type { CreateExpenseRequest } from '@/types/expense';

export const buildExpenseSubmitPayload = (
  data: CreateExpenseRequest,
  _isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateExpenseRequest => {
  const placeOnlyData = { ...data };
  delete placeOnlyData.payment_method;

  return withExpensePaymentContext(placeOnlyData, existingContext);
};
