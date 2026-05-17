import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '@/lib/utils';
import type { Currency } from '@/types/api';

export function useMoneyFormatter() {
  const { i18n } = useTranslation();

  const formatMoney = useCallback(
    (amount: number, currency: Currency) =>
      formatCurrency(amount, currency, { language: i18n.language }),
    [i18n.language],
  );

  return { formatMoney };
}
