import { withExpensePaymentContext } from '@/lib/paymentContext';
import type { CreateExpenseRequest } from '@/types/expense';

export const buildExpenseSubmitPayload = (
  data: CreateExpenseRequest,
  _isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateExpenseRequest => {
  const { payment_method: _paymentMethod, ...placeOnlyData } = data;

  return withExpensePaymentContext(placeOnlyData, existingContext);
};
