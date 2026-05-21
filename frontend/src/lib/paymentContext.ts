import type { TFunction } from 'i18next';

import { getPaymentMethodLabel } from '@/lib/paymentMethods';
import type { PaymentContext, CreateExpenseRequest } from '@/types/expense';
import type { CreateIncomeRequest } from '@/types/income';
import type { PaymentMethod } from '@/types/paymentMethod';
import type { RecurringExpenseFormData } from '@/types/recurringExpense';
import type { RecurringIncomeFormData } from '@/types/recurringIncome';

export const normalizeOptionalUuid = (value: unknown) => (value === '' ? undefined : value);

type PaymentContextFields = {
  containerId?: string | null;
};

export function resolvePaymentContextSelection({
  containerId,
}: PaymentContextFields) {
  const normalizedContainerId = containerId === '' ? undefined : containerId;

  return {
    containerId: normalizedContainerId,
  };
}

type ExistingPaymentContextIds = {
  containerId?: string | null;
};

function withEditClearing<T extends { source_container_id?: string | null; source_instrument_id?: string | null }>(
  data: T,
  existing?: ExistingPaymentContextIds,
) {
  return {
    ...data,
    source_container_id: data.source_container_id === undefined && existing?.containerId ? null : data.source_container_id,
  };
}

function withIncomeEditClearing<T extends { destination_container_id?: string | null; destination_instrument_id?: string | null }>(
  data: T,
  existing?: ExistingPaymentContextIds,
) {
  return {
    ...data,
    destination_container_id: data.destination_container_id === undefined && existing?.containerId ? null : data.destination_container_id,
  };
}

function withoutExpenseInstrument<T extends { source_instrument_id?: string | null }>(data: T): Omit<T, 'source_instrument_id'> {
  const { source_instrument_id: _sourceInstrumentId, ...placeOnlyData } = data;
  return placeOnlyData;
}

function withoutIncomeInstrument<T extends { destination_instrument_id?: string | null }>(data: T): Omit<T, 'destination_instrument_id'> {
  const { destination_instrument_id: _destinationInstrumentId, ...placeOnlyData } = data;
  return placeOnlyData;
}

export function withExpensePaymentContext(
  data: CreateExpenseRequest,
  existing?: ExistingPaymentContextIds,
): CreateExpenseRequest {
  const editableData = withEditClearing(data, existing);
  const { containerId } = resolvePaymentContextSelection({
    containerId: editableData.source_container_id,
  });

  return withoutExpenseInstrument({
    ...editableData,
    source_container_id: containerId,
  }) as CreateExpenseRequest;
}

export function withIncomePaymentContext(
  data: CreateIncomeRequest,
  existing?: ExistingPaymentContextIds,
): CreateIncomeRequest {
  const editableData = withIncomeEditClearing(data, existing);
  const { containerId } = resolvePaymentContextSelection({
    containerId: editableData.destination_container_id,
  });

  return withoutIncomeInstrument({
    ...editableData,
    destination_container_id: containerId,
  }) as CreateIncomeRequest;
}

type RecurringExpensePaymentContext = Partial<Pick<RecurringExpenseFormData, 'source_container_id' | 'source_instrument_id'>>;
type RecurringIncomePaymentContext = Partial<Pick<RecurringIncomeFormData, 'destination_container_id' | 'destination_instrument_id'>>;

export function withRecurringExpensePaymentContext<T extends RecurringExpensePaymentContext & Record<string, unknown>>(
  data: T,
  existing?: ExistingPaymentContextIds,
): T {
  const editableData = withEditClearing(data, existing);
  const { containerId } = resolvePaymentContextSelection({
    containerId: editableData.source_container_id,
  });

  return withoutExpenseInstrument({
    ...editableData,
    source_container_id: containerId,
  }) as T;
}

export function withRecurringIncomePaymentContext<T extends RecurringIncomePaymentContext & Record<string, unknown>>(
  data: T,
  existing?: ExistingPaymentContextIds,
): T {
  const editableData = withIncomeEditClearing(data, existing);
  const { containerId } = resolvePaymentContextSelection({
    containerId: editableData.destination_container_id,
  });

  return withoutIncomeInstrument({
    ...editableData,
    destination_container_id: containerId,
  }) as T;
}

export function getPaymentContextLabel(
  t: TFunction,
  context?: PaymentContext | null,
  legacyPaymentMethod?: PaymentMethod | null,
  legacyNamespace?: 'expenses' | 'incomes',
) {
  if (context?.container_name) return context.container_name;
  if (context?.instrument_name) return context.instrument_name;
  if (context?.display_label) return context.display_label;

  const legacy = legacyPaymentMethod ?? context?.legacy_payment_method;
  if (legacy && legacyNamespace) return t(`${legacyNamespace}:form.paymentMethod.options.${legacy}`);
  return legacy ? getPaymentMethodLabel(t, legacy) : null;
}
