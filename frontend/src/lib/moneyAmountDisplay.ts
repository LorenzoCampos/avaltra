import type { Currency } from '@/types/api';

export interface MoneyAmountDisplayInput {
  amount: number;
  currency: Currency;
  accountCurrency: Currency;
  amountInAccountCurrency: number;
  formatMoney: (amount: number, currency: Currency) => string;
}

export function resolveMoneyAmountDisplay({
  amount,
  currency,
  accountCurrency,
  amountInAccountCurrency,
  formatMoney,
}: MoneyAmountDisplayInput) {
  const hasCurrencyMismatch = currency !== accountCurrency;

  return {
    primary: formatMoney(hasCurrencyMismatch ? amountInAccountCurrency : amount, hasCurrencyMismatch ? accountCurrency : currency),
    secondary: hasCurrencyMismatch ? formatMoney(amount, currency) : null,
  };
}
