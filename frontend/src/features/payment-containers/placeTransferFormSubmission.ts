import type { CreatePlaceTransferRequest } from '@/types/placeTransfer';

type PlaceTransferFormSubmission =
  | { ok: true; values: CreatePlaceTransferRequest }
  | { ok: false; error: string };

type PlaceTransferFormErrorMessages = {
  sourceRequired?: string;
  destinationRequired?: string;
  samePlace?: string;
  amountPositive?: string;
  dateRequired?: string;
};

export function getPlaceTransferFormSubmission(values: {
  sourceContainerId: string;
  destinationContainerId: string;
  amount: string;
  date: string;
  note: string;
}, errorMessages: PlaceTransferFormErrorMessages = {}): PlaceTransferFormSubmission {
  const sourceContainerId = values.sourceContainerId.trim();
  const destinationContainerId = values.destinationContainerId.trim();
  const date = values.date.trim();
  const amount = Number(values.amount);
  const note = values.note.trim();

  if (!sourceContainerId) return { ok: false, error: errorMessages.sourceRequired ?? 'Source place is required' };
  if (!destinationContainerId) return { ok: false, error: errorMessages.destinationRequired ?? 'Destination place is required' };
  if (sourceContainerId === destinationContainerId) {
    return { ok: false, error: errorMessages.samePlace ?? 'Source and destination places must be different' };
  }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: errorMessages.amountPositive ?? 'Amount must be greater than zero' };
  if (!date) return { ok: false, error: errorMessages.dateRequired ?? 'Date is required' };

  return {
    ok: true,
    values: {
      source_container_id: sourceContainerId,
      destination_container_id: destinationContainerId,
      amount,
      date,
      ...(note ? { note } : {}),
      currency: 'ARS',
    },
  };
}
