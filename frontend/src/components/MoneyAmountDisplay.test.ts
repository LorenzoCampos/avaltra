import { describe, expect, it } from 'vitest';

import { MoneyAmountDisplay } from './MoneyAmountDisplay';
import { resolveMoneyAmountDisplay } from '@/lib/moneyAmountDisplay';

const formatMoney = (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`;

describe('resolveMoneyAmountDisplay', () => {
  it('returns a single primary amount when transaction currency matches account currency', () => {
    expect(
      resolveMoneyAmountDisplay({
        amount: 100,
        currency: 'ARS',
        accountCurrency: 'ARS',
        amountInAccountCurrency: 100,
        formatMoney,
      }),
    ).toEqual({ primary: 'ARS 100.00', secondary: null });
  });

  it('returns account-currency primary and original-currency secondary on mismatch', () => {
    expect(
      resolveMoneyAmountDisplay({
        amount: 25,
        currency: 'USD',
        accountCurrency: 'ARS',
        amountInAccountCurrency: 25000,
        formatMoney,
      }),
    ).toEqual({ primary: 'ARS 25000.00', secondary: 'USD 25.00' });
  });
});

describe('MoneyAmountDisplay', () => {
  it('renders one text line for same-currency transactions', () => {
    const element = MoneyAmountDisplay({
      amount: 100,
      currency: 'ARS',
      accountCurrency: 'ARS',
      amountInAccountCurrency: 100,
      sign: '-',
      formatMoney,
    });

    expect(element.props.children).toHaveLength(2);
    expect(element.props.children[0].props.children).toEqual(['-', 'ARS 100.00']);
    expect(element.props.children[1]).toBeNull();
  });

  it('renders account primary and original secondary lines for currency mismatch', () => {
    const element = MoneyAmountDisplay({
      amount: 25,
      currency: 'USD',
      accountCurrency: 'ARS',
      amountInAccountCurrency: 25000,
      sign: '+',
      formatMoney,
    });

    expect(element.props.children[0].props.children).toEqual(['+', 'ARS 25000.00']);
    expect(element.props.children[1].props.children).toBe('USD 25.00');
  });
});
