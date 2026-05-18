export type PaymentInstrumentKind = 'debit_card' | 'credit_card' | 'transfer' | 'cash' | 'other';

export interface PaymentInstrument {
  id: string;
  account_id: string;
  institution_id: string | null;
  backing_container_id: string | null;
  name: string;
  kind: PaymentInstrumentKind;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstrumentsResponse {
  payment_instruments: PaymentInstrument[];
  count: number;
}

export interface CreatePaymentInstrumentRequest {
  name: string;
  kind: PaymentInstrumentKind;
  institution_id?: string | null;
  backing_container_id?: string | null;
}

export interface UpdatePaymentInstrumentRequest {
  id: string;
  name?: string;
  kind?: PaymentInstrumentKind;
  institution_id?: string | null;
  backing_container_id?: string | null;
  is_active?: boolean;
}

export const paymentInstrumentKindLabels: Record<PaymentInstrumentKind, string> = {
  debit_card: 'Debit card',
  credit_card: 'Credit card',
  transfer: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

export const paymentInstrumentKindOptions = Object.entries(paymentInstrumentKindLabels).map(([value, label]) => ({
  value: value as PaymentInstrumentKind,
  label,
}));

export function isCardPaymentInstrumentKind(kind: PaymentInstrumentKind) {
  return kind === 'credit_card' || kind === 'debit_card';
}

export function paymentInstrumentRequiresBackingContainer(kind: PaymentInstrumentKind) {
  return isCardPaymentInstrumentKind(kind);
}
