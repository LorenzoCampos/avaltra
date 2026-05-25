import type { Currency } from '@/schemas/account.schema';
import type { UpdateAccountRequest } from '@/types/account';

export interface AccountFormData {
  name: string;
  type: 'personal' | 'family';
  currency: Currency;
  default_expense_container_id?: string | null;
  default_income_container_id?: string | null;
}

const normalizeDefaultPlaceId = (value: string | null | undefined) => value || null;

export const buildAccountUpdatePayload = (
  id: string,
  data: AccountFormData,
): UpdateAccountRequest => ({
  id,
  name: data.name,
  currency: data.currency,
  default_expense_container_id: normalizeDefaultPlaceId(data.default_expense_container_id),
  default_income_container_id: normalizeDefaultPlaceId(data.default_income_container_id),
});
