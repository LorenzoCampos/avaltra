import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

describe('Layout desktop sidebar navigation', () => {
  it('provides a persisted accessible collapse control for the desktop sidebar', async () => {
    const layout = await readSource('components/Layout.tsx');

    expect(layout).toContain("DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = 'avaltra-desktop-sidebar-collapsed'");
    expect(layout).toContain('useState(getInitialDesktopSidebarCollapsed)');
    expect(layout).toContain('localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY');
    expect(layout).toContain('aria-expanded={!isDesktopSidebarCollapsed}');
    expect(layout).toContain('aria-label={isDesktopSidebarCollapsed');
    expect(layout).toContain('setIsDesktopSidebarCollapsed((isCollapsed) => !isCollapsed)');
  });

  it('uses shared lucide navigation icons instead of collapsed first-letter labels', async () => {
    const layout = await readSource('components/Layout.tsx');

    expect(layout).toContain('Home, Activity, DollarSign, TrendingUp, Wallet, Tag, BarChart3, PiggyBank, Settings, CreditCard');
    expect(layout).toContain('icon: Home');
    expect(layout).toContain('icon: Wallet');
    expect(layout).toContain('const Icon = link.icon');
    expect(layout).toContain('<Icon aria-hidden="true"');
    expect(layout).toContain('{!isDesktopSidebarCollapsed && <span>{link.label}</span>}');
    expect(layout).not.toContain('link.label.slice(0, 1)');
  });

  it('uses theme-aware sidebar surfaces instead of forcing a dark sidebar in light mode', async () => {
    const layout = await readSource('components/Layout.tsx');

    expect(layout).toContain('bg-white text-gray-900 dark:bg-gray-950 dark:text-white');
    expect(layout).toContain('border-gray-200 dark:border-gray-800');
    expect(layout).toContain('bg-brand-subtle text-brand-primary dark:bg-white dark:text-brand-primary');
    expect(layout).toContain('text-gray-700 hover:bg-gray-100 hover:text-brand-primary dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white');
    expect(layout).not.toContain('md:w-72 md:flex-col bg-gray-950 text-white');
  });

  it('renders desktop navigation in a sidebar with preserved tour anchors', async () => {
    const layout = await readSource('components/Layout.tsx');

    expect(layout).toContain('aria-label={t(\'labels.primaryNavigation\', \'Primary navigation\')}');
    expect(layout).toContain('hidden md:flex');
    expect(layout).toContain('data-tour={link.dataTour}');
    expect(layout).toContain("dataTour: 'expenses-desktop'");
    expect(layout).toContain("dataTour: 'incomes-desktop'");
    expect(layout).toContain("dataTour: 'reports-desktop'");
    expect(layout).toContain("dataTour: 'settings-desktop'");
    expect(layout).not.toContain('Desktop Navigation Links');
  });

  it('keeps mobile header controls and BottomNav outside the desktop sidebar', async () => {
    const layout = await readSource('components/Layout.tsx');

    expect(layout).toContain('Mobile Header');
    expect(layout).toContain('md:hidden');
    expect(layout).toContain('<BottomNav />');
    expect(layout).toContain('<BrandMark showName markSize="sm" />');
  });
});
