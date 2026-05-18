export type PaymentContainerKind = 'bank' | 'wallet' | 'cash' | 'other';

export interface PaymentContainer {
  id: string;
  account_id: string;
  institution_id: string | null;
  name: string;
  kind: PaymentContainerKind;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentContainersResponse {
  payment_containers: PaymentContainer[];
  count: number;
}

export interface CreatePaymentContainerRequest {
  name: string;
  kind: PaymentContainerKind;
  institution_id?: string | null;
}

export interface UpdatePaymentContainerRequest {
  id: string;
  name?: string;
  kind?: PaymentContainerKind;
  institution_id?: string | null;
  is_active?: boolean;
}

export const paymentContainerKindLabels: Record<PaymentContainerKind, string> = {
  bank: 'Bank account',
  wallet: 'Wallet',
  cash: 'Cash',
  other: 'Other',
};

export const paymentContainerKindOptions = Object.entries(paymentContainerKindLabels).map(([value, label]) => ({
  value: value as PaymentContainerKind,
  label,
}));
