import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import savingsEn from '@/i18n/locales/en/savings.json';
import savingsEs from '@/i18n/locales/es/savings.json';

const readSavingsFormSource = () => readFile(new URL('./SavingsForm.tsx', import.meta.url), 'utf8');
const readContributionFormSource = () =>
  readFile(new URL('./components/ContributionForm.tsx', import.meta.url), 'utf8');
const readSavingsCardSource = () =>
  readFile(new URL('./components/SavingsCard.tsx', import.meta.url), 'utf8');

describe('savings place selector frontend wiring', () => {
  it('uses payment containers and saved_container_id instead of a free-text saved_in field in the goal form', async () => {
    const source = await readSavingsFormSource();

    expect(source).toContain("usePaymentContainers({ enabled: !!activeAccountId })");
    expect(source).toContain("register('saved_container_id')");
    expect(source).toContain("buildSavingsGoalStoragePayload(data.saved_container_id");
    expect(source).not.toContain("register('saved_in')");
    expect(source).not.toContain("savedInPlaceholder");
  });

  it('prefills edit mode from saved_container_id and never from legacy saved_in text', async () => {
    const source = await readSavingsFormSource();

    expect(source).toContain('saved_container_id: goalData.saved_container_id ??');
    expect(source).not.toContain('saved_container_id: goalData.saved_in');
  });

  it('lets savings movements choose assigned goal place or explicit unassigned container payloads', async () => {
    const source = await readContributionFormSource();

    expect(source).toContain("usePaymentContainers({ enabled: true })");
    expect(source).toContain("register('container_id')");
    expect(source).toContain('buildSavingsMovementStoragePayload(data.container_id)');
    expect(source).toContain('goal.saved_container_id ??');
  });

  it('renders assigned, unassigned, and legacy savings storage copy from explicit state', async () => {
    const source = await readSavingsCardSource();

    expect(source).toContain('getSavingsStorageDisplay(goal)');
    expect(source).toContain("storageDisplay.labelKey");
    expect(source).not.toContain('{goal.saved_in}');
  });
});

describe('savings place selector copy', () => {
  it('includes English selector, unassigned, and legacy compatibility labels', () => {
    expect(savingsEn.form.savedPlaceLabel).toBe('Savings place (optional)');
    expect(savingsEn.form.unassignedPlaceOption).toBe('Unassigned — do not link this goal to a place yet');
    expect(savingsEn.form.legacySavedInHelp).toContain('Legacy location');
    expect(savingsEn.card.assignedPlace).toBe('Saved place');
    expect(savingsEn.card.unassignedPlace).toBe('Unassigned place');
    expect(savingsEn.card.legacySavedIn).toBe('Legacy location');
  });

  it('includes Spanish selector, unassigned, and legacy compatibility labels', () => {
    expect(savingsEs.form.savedPlaceLabel).toBe('Lugar de ahorro (opcional)');
    expect(savingsEs.form.unassignedPlaceOption).toBe('Sin asignar — no vincular este objetivo a un lugar todavía');
    expect(savingsEs.form.legacySavedInHelp).toContain('Ubicación heredada');
    expect(savingsEs.card.assignedPlace).toBe('Lugar de ahorro');
    expect(savingsEs.card.unassignedPlace).toBe('Lugar sin asignar');
    expect(savingsEs.card.legacySavedIn).toBe('Ubicación heredada');
  });
});
