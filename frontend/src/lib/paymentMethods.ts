import type { TFunction } from 'i18next';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/paymentMethod';

export const getPaymentMethodOptions = (t: TFunction) => {
  return PAYMENT_METHODS.map((value) => ({
    value,
    label: t(`form.paymentMethod.options.${value}`),
  }));
};

export const getPaymentMethodLabel = (t: TFunction, value: PaymentMethod) => {
  return t(`form.paymentMethod.options.${value}`);
};
