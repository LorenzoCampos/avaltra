import { withExpensePaymentContext } from '@/lib/paymentContext';
import type { CreateExpenseRequest } from '@/types/expense';

export const buildExpenseSubmitPayload = (
  data: CreateExpenseRequest,
  isEditing: boolean,
  existingContext?: { containerId?: string | null },
): CreateExpenseRequest => {
  void isEditing;
  void existingContext;

  const placeOnlyData = { ...data };
  delete placeOnlyData.payment_method;

  return withExpensePaymentContext(placeOnlyData);
};
