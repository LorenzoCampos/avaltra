import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

describe('brand key surface integration', () => {
  it('brands app shell and mobile navigation with the approved logo and semantic nav accents', async () => {
    const [layout, bottomNav, moreMenu] = await Promise.all([
      readSource('components/Layout.tsx'),
      readSource('components/BottomNav.tsx'),
      readSource('components/MoreMenu.tsx'),
    ]);

    expect(layout).toContain("import { BrandMark } from './BrandLogo'");
    expect(layout).toContain('<BrandMark showName={!isDesktopSidebarCollapsed} markSize="sm" />');
    expect(layout).toContain('<BrandMark showName markSize="sm" />');
    expect(`${layout}\n${bottomNav}\n${moreMenu}`).toContain('text-brand-primary');
    expect(`${layout}\n${bottomNav}\n${moreMenu}`).toContain('bg-brand-primary');
    expect(`${layout}\n${bottomNav}\n${moreMenu}`).toContain('focus-visible-ring-brand');
    expect(`${layout}\n${bottomNav}\n${moreMenu}`).not.toMatch(/blue-(50|100|200|300|400|500|600|700|800|900)/);
  });

  it('replaces auth text-only identity with approved logo usage and semantic brand links', async () => {
    const authSources = await Promise.all([
      'features/auth/Login.tsx',
      'features/auth/Register.tsx',
      'features/auth/ForgotPassword.tsx',
      'features/auth/ResetPassword.tsx',
      'features/auth/VerifyEmail.tsx',
    ].map(readSource));
    const combined = authSources.join('\n');

    for (const source of authSources) {
      expect(source).toContain("import { BrandMark } from '@/components/BrandLogo'");
      expect(source).toContain('<BrandMark');
    }
    expect(combined).not.toContain('<CardTitle className="text-center">Avaltra</CardTitle>');
    expect(combined).toContain('text-brand-primary');
    expect(combined).toContain('focus-visible-ring-brand');
    expect(combined).not.toMatch(/text-blue-(300|400|500|600)/);
  });

  it('keeps onboarding branded through semantic gradients, spinners, focus and progress accents only', async () => {
    const onboardingSources = await Promise.all([
      'features/onboarding/OnboardingWizard.tsx',
      'features/onboarding/steps/WelcomeStep.tsx',
      'features/onboarding/steps/CreateAccountStep.tsx',
      'features/onboarding/steps/FirstExpenseStep.tsx',
      'features/onboarding/steps/CompletedStep.tsx',
    ].map(readSource));
    const combined = onboardingSources.join('\n');

    expect(combined).toContain('bg-gradient-brand-surface');
    expect(combined).toContain('<BrandMark');
    expect(combined).toContain('bg-brand-primary');
    expect(combined).toContain('border-brand-primary');
    expect(combined).toContain('text-brand-primary');
    expect(combined).toContain('focus-ring-brand');
    expect(combined).not.toMatch(/from-blue|to-indigo|border-blue|bg-blue|text-blue|focus:ring-blue/);
  });

  it('preserves the active theme persistence key without legacy migration until a legacy key is discovered', async () => {
    const themeStore = await readSource('stores/theme.store.ts');

    expect(themeStore).toContain("name: 'avaltra-theme'");
    expect(themeStore).not.toMatch(/legacy|bolsillo-theme|brand-theme/);
  });
});
