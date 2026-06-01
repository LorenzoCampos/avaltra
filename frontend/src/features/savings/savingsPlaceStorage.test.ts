import { describe, expect, it } from 'vitest';

import type { SavingsGoal } from '@/types/savings';

import {
  buildSavingsGoalStoragePayload,
  buildSavingsMovementStoragePayload,
  getSavingsStorageDisplay,
} from './savingsPlaceStorage';

const baseGoal: SavingsGoal = {
  id: 'goal-1',
  account_id: 'account-1',
  name: 'Emergency fund',
  description: null,
  target_amount: 1000,
  current_amount: 100,
  currency: 'ARS',
  saved_in: null,
  saved_container_id: null,
  saved_container_name: null,
  storage_status: 'unassigned',
  deadline: null,
  progress_percentage: 10,
  required_monthly_savings: null,
  is_active: true,
  created_at: '2026-05-31T00:00:00Z',
  updated_at: '2026-05-31T00:00:00Z',
};

describe('savings place storage contracts', () => {
  it('submits a selected place as saved_container_id and does not map legacy saved_in text', () => {
    expect(buildSavingsGoalStoragePayload('place-1')).toEqual({
      saved_container_id: 'place-1',
      saved_in: undefined,
    });
  });

  it('submits explicit unassigned as null instead of forcing a place assignment', () => {
    expect(buildSavingsGoalStoragePayload('')).toEqual({
      saved_container_id: null,
      saved_in: undefined,
    });
  });

  it('prefills movement attribution from the goal place and allows explicit unassigned overrides', () => {
    expect(buildSavingsMovementStoragePayload('goal-place')).toEqual({ container_id: 'goal-place' });
    expect(buildSavingsMovementStoragePayload('')).toEqual({ container_id: null });
  });
});

describe('savings storage display state', () => {
  it('prefers assigned container names over legacy text', () => {
    expect(
      getSavingsStorageDisplay({
        ...baseGoal,
        saved_in: 'Old bank text',
        saved_container_id: 'place-1',
        saved_container_name: 'Main wallet',
        storage_status: 'assigned',
      }),
    ).toEqual({ status: 'assigned', labelKey: 'card.assignedPlace', value: 'Main wallet' });
  });

  it('surfaces legacy text as legacy context without treating it as a selected place', () => {
    expect(getSavingsStorageDisplay({ ...baseGoal, saved_in: 'Old bank text' })).toEqual({
      status: 'legacy',
      labelKey: 'card.legacySavedIn',
      value: 'Old bank text',
    });
  });

  it('returns explicit unassigned messaging when no validated place or legacy text exists', () => {
    expect(getSavingsStorageDisplay(baseGoal)).toEqual({
      status: 'unassigned',
      labelKey: 'card.unassignedPlace',
      value: null,
    });
  });
});
