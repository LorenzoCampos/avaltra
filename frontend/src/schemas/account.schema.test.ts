import { describe, expect, it } from 'vitest';

import { accountSchema } from './account.schema';
import { buildAccountUpdatePayload } from '@/features/accounts/accountFormMapping';

const validAccountForm = {
  name: 'Household',
  type: 'family' as const,
  currency: 'ARS' as const,
};

const expenseDefaultId = '11111111-1111-4111-8111-111111111111';
const incomeDefaultId = '22222222-2222-4222-8222-222222222222';

describe('account default place validation and submit mapping', () => {
  it('preserves selected default place UUIDs through schema validation and update mapping', () => {
    const parsed = accountSchema.parse({
      ...validAccountForm,
      default_expense_container_id: expenseDefaultId,
      default_income_container_id: incomeDefaultId,
    });

    expect(parsed).toMatchObject({
      default_expense_container_id: expenseDefaultId,
      default_income_container_id: incomeDefaultId,
    });

    expect(buildAccountUpdatePayload('account-1', parsed)).toEqual({
      id: 'account-1',
      name: 'Household',
      currency: 'ARS',
      default_expense_container_id: expenseDefaultId,
      default_income_container_id: incomeDefaultId,
    });
  });

  it('maps explicit empty or null defaults to null so users can clear saved defaults', () => {
    const parsedEmpty = accountSchema.parse({
      ...validAccountForm,
      default_expense_container_id: '',
      default_income_container_id: '',
    });
    const parsedNull = accountSchema.parse({
      ...validAccountForm,
      default_expense_container_id: null,
      default_income_container_id: null,
    });

    expect(buildAccountUpdatePayload('account-1', parsedEmpty)).toMatchObject({
      default_expense_container_id: null,
      default_income_container_id: null,
    });
    expect(buildAccountUpdatePayload('account-1', parsedNull)).toMatchObject({
      default_expense_container_id: null,
      default_income_container_id: null,
    });
  });
});
