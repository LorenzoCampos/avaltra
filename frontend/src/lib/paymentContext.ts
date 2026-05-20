import type { TFunction } from 'i18next';

import { getPaymentMethodLabel } from '@/lib/paymentMethods';
import type { PaymentContext, CreateExpenseRequest } from '@/types/expense';
import type { CreateIncomeRequest } from '@/types/income';
import type { PaymentInstrument } from '@/types/paymentInstrument';
import type { PaymentMethod } from '@/types/paymentMethod';
import type { RecurringExpenseFormData } from '@/types/recurringExpense';
import type { RecurringIncomeFormData } from '@/types/recurringIncome';

export const normalizeOptionalUuid = (value: unknown) => (value === '' ? undefined : value);

type PaymentContextFields = {
  containerId?: string | null;
  instrumentId?: string | null;
  instruments?: PaymentInstrument[];
};

export function resolvePaymentContextSelection({
  containerId,
  instrumentId,
  instruments = [],
}: PaymentContextFields) {
  const selectedInstrument = instruments.find((instrument) => instrument.id === instrumentId);
  const resolvedInstrumentId = instrumentId === '' ? undefined : instrumentId;
  const normalizedContainerId = containerId === '' ? undefined : containerId;
  const resolvedContainerId = selectedInstrument?.backing_container_id || normalizedContainerId;

  return {
    containerId: resolvedContainerId,
    instrumentId: resolvedInstrumentId,
  };
}

type ExistingPaymentContextIds = {
  containerId?: string | null;
  instrumentId?: string | null;
};

function withEditClearing<T extends { source_container_id?: string | null; source_instrument_id?: string | null }>(
  data: T,
  existing?: ExistingPaymentContextIds,
) {
  return {
    ...data,
    source_container_id: data.source_container_id === undefined && existing?.containerId ? null : data.source_container_id,
    source_instrument_id: data.source_instrument_id === undefined && existing?.instrumentId ? null : data.source_instrument_id,
  };
}

function withIncomeEditClearing<T extends { destination_container_id?: string | null; destination_instrument_id?: string | null }>(
  data: T,
  existing?: ExistingPaymentContextIds,
) {
  return {
    ...data,
    destination_container_id: data.destination_container_id === undefined && existing?.containerId ? null : data.destination_container_id,
    destination_instrument_id: data.destination_instrument_id === undefined && existing?.instrumentId ? null : data.destination_instrument_id,
  };
}

export function withExpensePaymentContext(
  data: CreateExpenseRequest,
  instruments?: PaymentInstrument[],
  existing?: ExistingPaymentContextIds,
): CreateExpenseRequest {
  const editableData = withEditClearing(data, existing);
  const { containerId, instrumentId } = resolvePaymentContextSelection({
    containerId: editableData.source_container_id,
    instrumentId: editableData.source_instrument_id,
    instruments,
  });

  return {
    ...editableData,
    source_container_id: containerId,
    source_instrument_id: instrumentId,
  };
}

export function withIncomePaymentContext(
  data: CreateIncomeRequest,
  instruments?: PaymentInstrument[],
  existing?: ExistingPaymentContextIds,
): CreateIncomeRequest {
  const editableData = withIncomeEditClearing(data, existing);
  const { containerId, instrumentId } = resolvePaymentContextSelection({
    containerId: editableData.destination_container_id,
    instrumentId: editableData.destination_instrument_id,
    instruments,
  });

  return {
    ...editableData,
    destination_container_id: containerId,
    destination_instrument_id: instrumentId,
  };
}

type RecurringExpensePaymentContext = Partial<Pick<RecurringExpenseFormData, 'source_container_id' | 'source_instrument_id'>>;
type RecurringIncomePaymentContext = Partial<Pick<RecurringIncomeFormData, 'destination_container_id' | 'destination_instrument_id'>>;

export function withRecurringExpensePaymentContext<T extends RecurringExpensePaymentContext & Record<string, unknown>>(
  data: T,
  instruments?: PaymentInstrument[],
  existing?: ExistingPaymentContextIds,
): T {
  const editableData = withEditClearing(data, existing);
  const { containerId, instrumentId } = resolvePaymentContextSelection({
    containerId: editableData.source_container_id,
    instrumentId: editableData.source_instrument_id,
    instruments,
  });

  return {
    ...editableData,
    source_container_id: containerId,
    source_instrument_id: instrumentId,
  };
}

export function withRecurringIncomePaymentContext<T extends RecurringIncomePaymentContext & Record<string, unknown>>(
  data: T,
  instruments?: PaymentInstrument[],
  existing?: ExistingPaymentContextIds,
): T {
  const editableData = withIncomeEditClearing(data, existing);
  const { containerId, instrumentId } = resolvePaymentContextSelection({
    containerId: editableData.destination_container_id,
    instrumentId: editableData.destination_instrument_id,
    instruments,
  });

  return {
    ...editableData,
    destination_container_id: containerId,
    destination_instrument_id: instrumentId,
  };
}

export function getPaymentContextLabel(
  t: TFunction,
  context?: PaymentContext | null,
  legacyPaymentMethod?: PaymentMethod | null,
  legacyNamespace?: 'expenses' | 'incomes',
) {
  if (context?.display_label) return context.display_label;
  if (context?.instrument_name) return context.instrument_name;
  if (context?.container_name) return context.container_name;

  const legacy = legacyPaymentMethod ?? context?.legacy_payment_method;
  if (legacy && legacyNamespace) return t(`${legacyNamespace}:form.paymentMethod.options.${legacy}`);
  return legacy ? getPaymentMethodLabel(t, legacy) : null;
}
