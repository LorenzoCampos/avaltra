import type { Currency } from '@/schemas/account.schema';

export function getDashboardCurrency(summaryCurrency: string | undefined, accountCurrency: Currency): Currency {
  return (summaryCurrency || accountCurrency) as Currency;
}
