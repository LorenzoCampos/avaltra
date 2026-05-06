export const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'debit_card',
  'credit_card',
  'digital_wallet',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const isPaymentMethod = (value: string | null | undefined): value is PaymentMethod => {
  return PAYMENT_METHODS.includes((value ?? '') as PaymentMethod);
};

export const normalizePaymentMethodForCreate = (value: string | null | undefined): PaymentMethod | undefined => {
  return isPaymentMethod(value) ? value : undefined;
};

export const normalizePaymentMethodForForm = (
  value: PaymentMethod | null | undefined,
): PaymentMethod | undefined => {
  return value ?? undefined;
};

export const normalizePaymentMethodForUpdate = (
  value: string | null | undefined,
  existingValue?: PaymentMethod | null,
): PaymentMethod | null | undefined => {
  if (isPaymentMethod(value)) {
    return value;
  }

  if (existingValue === undefined) {
    return undefined;
  }

  return null;
};
