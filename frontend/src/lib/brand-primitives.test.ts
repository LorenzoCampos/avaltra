import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { BrandLogo } from '../components/BrandLogo';
import { BRAND } from './brand';

const readSource = (relativePath: string) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const extractCssVariable = (css: string, selector: ':root' | '.dark', variable: string) => {
  const block = css.match(new RegExp(`${selector.replace('.', '\\.') }\\s*\\{(?<body>[\\s\\S]*?)\\}`))?.groups?.body;
  const value = block?.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6});`))?.[1];

  if (!value) {
    throw new Error(`Missing ${variable} in ${selector}`);
  }

  return value.toLowerCase();
};

describe('semantic brand tokens and primitives', () => {
  it('defines semantic brand color and focus utilities without changing status color semantics', async () => {
    const css = await readSource('index.css');

    expect(css).toContain('--color-brand-primary: #003366;');
    expect(css).toContain('--color-brand-accent: #008080;');
    expect(css).toContain('--color-brand-text-primary: #003366;');
    expect(css).toContain('--color-brand-text-accent: #008080;');
    expect(css).toContain('--color-on-brand: #ffffff;');
    expect(css).toContain('.bg-brand-primary');
    expect(css).toContain('.bg-brand-accent');
    expect(css).toContain('.text-on-brand');
    expect(css).toContain('.focus-ring-brand');
    expect(css).toContain('#22c55e');
    expect(css).toContain('#f59e0b');
  });

  it('keeps used semantic brand foreground/background pairs WCAG AA compliant in light and dark themes', async () => {
    const [css, layout, bottomNav, moreMenu, authLogin, authRegister, authForgot, authReset, authVerify, onboardingWizard, welcomeStep, createAccountStep, firstExpenseStep, completedStep] = await Promise.all([
      readSource('index.css'),
      readSource('components/Layout.tsx'),
      readSource('components/BottomNav.tsx'),
      readSource('components/MoreMenu.tsx'),
      readSource('features/auth/Login.tsx'),
      readSource('features/auth/Register.tsx'),
      readSource('features/auth/ForgotPassword.tsx'),
      readSource('features/auth/ResetPassword.tsx'),
      readSource('features/auth/VerifyEmail.tsx'),
      readSource('features/onboarding/OnboardingWizard.tsx'),
      readSource('features/onboarding/steps/WelcomeStep.tsx'),
      readSource('features/onboarding/steps/CreateAccountStep.tsx'),
      readSource('features/onboarding/steps/FirstExpenseStep.tsx'),
      readSource('features/onboarding/steps/CompletedStep.tsx'),
    ]);
    const usedSurfaceSource = [layout, bottomNav, moreMenu, authLogin, authRegister, authForgot, authReset, authVerify, onboardingWizard, welcomeStep, createAccountStep, firstExpenseStep, completedStep].join('\n');

    expect(usedSurfaceSource).toContain('text-brand-primary');
    expect(usedSurfaceSource).toContain('hover:text-brand-accent');
    expect(usedSurfaceSource).toContain('bg-brand-primary');

    const lightTextPrimary = extractCssVariable(css, ':root', '--color-brand-text-primary');
    const lightTextAccent = extractCssVariable(css, ':root', '--color-brand-text-accent');
    const lightBrandBackground = extractCssVariable(css, ':root', '--color-brand-primary');
    const lightSurface = extractCssVariable(css, ':root', '--color-bg-primary');
    const darkTextPrimary = extractCssVariable(css, '.dark', '--color-brand-text-primary');
    const darkTextAccent = extractCssVariable(css, '.dark', '--color-brand-text-accent');
    const darkBrandBackground = extractCssVariable(css, '.dark', '--color-brand-primary');
    const darkSurface = extractCssVariable(css, '.dark', '--color-bg-secondary');
    const onBrand = extractCssVariable(css, ':root', '--color-on-brand');

    const checkedPairs = [
      { name: 'light text-brand-primary on app surface', foreground: lightTextPrimary, background: lightSurface },
      { name: 'light text-brand-accent hover on app surface', foreground: lightTextAccent, background: lightSurface },
      { name: 'light text-on-brand on brand primary background', foreground: onBrand, background: lightBrandBackground },
      { name: 'dark text-brand-primary on dark-capable surface', foreground: darkTextPrimary, background: darkSurface },
      { name: 'dark text-brand-accent hover on dark-capable surface', foreground: darkTextAccent, background: darkSurface },
      { name: 'dark text-on-brand on brand primary background', foreground: onBrand, background: darkBrandBackground },
    ];

    expect(checkedPairs.map(({ name, foreground, background }) => ({
      name,
      foreground,
      background,
      ratio: Number(contrastRatio(foreground, background).toFixed(2)),
    }))).toEqual([
      { name: 'light text-brand-primary on app surface', foreground: '#003366', background: '#ffffff', ratio: 12.61 },
      { name: 'light text-brand-accent hover on app surface', foreground: '#008080', background: '#ffffff', ratio: 4.77 },
      { name: 'light text-on-brand on brand primary background', foreground: '#ffffff', background: '#003366', ratio: 12.61 },
      { name: 'dark text-brand-primary on dark-capable surface', foreground: '#66e0e0', background: '#111827', ratio: 11.24 },
      { name: 'dark text-brand-accent hover on dark-capable surface', foreground: '#5eead4', background: '#111827', ratio: 11.99 },
      { name: 'dark text-on-brand on brand primary background', foreground: '#ffffff', background: '#005a73', ratio: 7.75 },
    ]);

    for (const pair of checkedPairs) {
      expect(contrastRatio(pair.foreground, pair.background), pair.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps shared Button and Input primary/focus accents on semantic brand utilities', async () => {
    const [buttonSource, inputSource] = await Promise.all([
      readSource('components/ui/Button.tsx'),
      readSource('components/ui/Input.tsx'),
    ]);

    expect(buttonSource).toContain('bg-brand-primary');
    expect(buttonSource).toContain('text-on-brand');
    expect(buttonSource).toContain('focus-ring-brand');
    expect(inputSource).toContain('focus-ring-brand');
    expect(`${buttonSource}\n${inputSource}`).not.toMatch(/blue-(400|500|600|700)/);
    expect(inputSource).toContain('focus:ring-red-500');
  });

  it('renders approved brand logo variants with accessible defaults', () => {
    const icon = BrandLogo({ variant: 'icon', size: 'sm' });
    const wordmark = BrandLogo({ variant: 'wordmark', darkSurfaceSafe: true });

    expect(icon.type).toBe('img');
    expect(icon.props.src).toBe(BRAND.assets.iconSvg);
    expect(icon.props.alt).toBe(BRAND.name);
    expect(icon.props.width).toBe(32);
    expect(icon.props.height).toBe(32);

    expect(wordmark.type).toBe('img');
    expect(wordmark.props.src).toBe(BRAND.assets.wordmarkSvg);
    expect(wordmark.props.alt).toBe(BRAND.name);
    expect(wordmark.props.width).toBe(180);
    expect(wordmark.props.height).toBe(40);
    expect(wordmark.props.className).toContain('brand-logo--dark-surface-safe');
  });
});
