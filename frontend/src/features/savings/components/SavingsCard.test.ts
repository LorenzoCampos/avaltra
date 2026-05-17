import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import savingsEn from '@/i18n/locales/en/savings.json';
import savingsEs from '@/i18n/locales/es/savings.json';

const readSavingsCardSource = () => readFile(new URL('./SavingsCard.tsx', import.meta.url), 'utf8');

describe('SavingsCard mobile edit discoverability', () => {
  it('keeps card actions visible on mobile and hover/focus revealed from desktop', async () => {
    const source = await readSavingsCardSource();

    expect(source).toContain('group animate-slide-up');
    expect(source).toContain('opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100');
    expect(source).not.toContain('showActions');
    expect(source).not.toContain('onMouseEnter');
    expect(source).not.toContain('onMouseLeave');
  });

  it('routes the edit action to the existing savings edit form', async () => {
    const source = await readSavingsCardSource();

    expect(source).toContain('navigate(`/savings/edit/${goal.id}`)');
  });

  it('localizes icon-only edit and delete action labels in English and Spanish', async () => {
    const source = await readSavingsCardSource();

    expect(source).toContain("aria-label={t('card.editActionLabel')}");
    expect(source).toContain("title={t('card.editActionLabel')}");
    expect(source).toContain("aria-label={t('card.deleteActionLabel')}");
    expect(source).toContain("title={t('card.deleteActionLabel')}");
    expect(source).toContain('<EditIcon aria-hidden="true"');
    expect(source).toContain('<TrashIcon aria-hidden="true"');

    expect(savingsEn.card.editActionLabel).toBe('Edit goal');
    expect(savingsEn.card.deleteActionLabel).toBe('Delete goal');
    expect(savingsEs.card.editActionLabel).toBe('Editar objetivo');
    expect(savingsEs.card.deleteActionLabel).toBe('Eliminar objetivo');
  });
});
