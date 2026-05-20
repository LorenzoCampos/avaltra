import type { PaymentContainer, PaymentContainerKind } from '@/types/paymentContainer';
import type { PaymentInstrument, PaymentInstrumentKind } from '@/types/paymentInstrument';
import { paymentInstrumentRequiresBackingContainer } from '@/types/paymentInstrument';

type ContainerFormSubmission =
  | { ok: true; values: { name: string; kind: PaymentContainerKind; is_active?: boolean } }
  | { ok: false; errorKey: string };

type InstrumentFormSubmission =
  | { ok: true; values: { name: string; kind: PaymentInstrumentKind; backing_container_id?: string | null; is_active?: boolean } }
  | { ok: false; errorKey: string };

export function getContainerFormSubmission(values: {
  name: string;
  kind: PaymentContainerKind;
  existingContainer?: PaymentContainer | null;
}): ContainerFormSubmission {
  const trimmedName = values.name.trim();

  if (!trimmedName) {
    return { ok: false, errorKey: 'paymentContainersPage.forms.validation.nameRequired' };
  }

  return {
    ok: true,
    values: {
      name: trimmedName,
      kind: values.kind,
    },
  };
}

export function getInstrumentFormSubmission(values: {
  name: string;
  kind: PaymentInstrumentKind;
  backingContainerId: string;
  existingInstrument?: PaymentInstrument | null;
}): InstrumentFormSubmission {
  const trimmedName = values.name.trim();

  if (!trimmedName) {
    return { ok: false, errorKey: 'paymentContainersPage.forms.validation.nameRequired' };
  }
  if (paymentInstrumentRequiresBackingContainer(values.kind) && !values.backingContainerId) {
    return { ok: false, errorKey: 'paymentContainersPage.forms.validation.backingRequired' };
  }

  return {
    ok: true,
    values: {
      name: trimmedName,
      kind: values.kind,
      backing_container_id: values.backingContainerId || null,
    },
  };
}
