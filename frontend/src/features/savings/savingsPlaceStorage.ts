import type { SavingsGoal } from '@/types/savings';

export type SavingsStorageDisplay =
  | { status: 'assigned'; labelKey: 'card.assignedPlace'; value: string }
  | { status: 'legacy'; labelKey: 'card.legacySavedIn'; value: string }
  | { status: 'unassigned'; labelKey: 'card.unassignedPlace'; value: null };

const normalizeSelectedPlaceId = (selectedPlaceId: string | null | undefined) => {
  const trimmed = selectedPlaceId?.trim();
  return trimmed ? trimmed : null;
};

export const buildSavingsGoalStoragePayload = (selectedPlaceId: string | null | undefined) => ({
  saved_container_id: normalizeSelectedPlaceId(selectedPlaceId),
  saved_in: undefined,
});

export const buildSavingsMovementStoragePayload = (selectedPlaceId: string | null | undefined) => ({
  container_id: normalizeSelectedPlaceId(selectedPlaceId),
});

export const getSavingsStorageDisplay = (goal: SavingsGoal): SavingsStorageDisplay => {
  if (goal.saved_container_id && goal.saved_container_name) {
    return { status: 'assigned', labelKey: 'card.assignedPlace', value: goal.saved_container_name };
  }

  if (goal.saved_in) {
    return { status: 'legacy', labelKey: 'card.legacySavedIn', value: goal.saved_in };
  }

  return { status: 'unassigned', labelKey: 'card.unassignedPlace', value: null };
};
