import { resolveMoneyAmountDisplay } from '@/lib/moneyAmountDisplay';
import type { MoneyAmountDisplayInput } from '@/lib/moneyAmountDisplay';

export interface MoneyAmountDisplayProps extends MoneyAmountDisplayInput {
  sign?: '+' | '-';
  primaryClassName?: string;
  secondaryClassName?: string;
}

export function MoneyAmountDisplay({
  amount,
  currency,
  accountCurrency,
  amountInAccountCurrency,
  formatMoney,
  sign,
  primaryClassName,
  secondaryClassName = 'text-xs text-gray-500 dark:text-gray-400',
}: MoneyAmountDisplayProps) {
  const display = resolveMoneyAmountDisplay({
    amount,
    currency,
    accountCurrency,
    amountInAccountCurrency,
    formatMoney,
  });

  return (
    <div className="text-right">
      <p className={primaryClassName}>
        {sign}
        {display.primary}
      </p>
      {display.secondary ? <p className={secondaryClassName}>{display.secondary}</p> : null}
    </div>
  );
}
