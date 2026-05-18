import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/Button';
import { DarkModeToggle } from './DarkModeToggle';
import { BottomNav } from './BottomNav';
import { FeatureTour } from './FeatureTour';
import { BrandMark } from './BrandLogo';
import { Home, Activity, DollarSign, TrendingUp, Wallet, Tag, BarChart3, PiggyBank, Settings, CreditCard } from 'lucide-react';

export const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = 'avaltra-desktop-sidebar-collapsed';

const getInitialDesktopSidebarCollapsed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const Layout = () => {
  const { t } = useTranslation('navigation');
  const user = useAuthStore((state) => state.user);
  const activeAccount = useAccountStore((state) => state.activeAccount);
  const { logout } = useAuth();
  const location = useLocation();
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(getInitialDesktopSidebarCollapsed);

  const navLinks = [
    { to: '/dashboard', label: t('menu.dashboard'), icon: Home, dataTour: undefined },
    { to: '/activity', label: t('menu.activity'), icon: Activity, dataTour: undefined },
    { to: '/accounts', label: t('menu.accounts'), icon: Wallet, dataTour: undefined },
    { to: '/payment-containers', label: t('menu.paymentContainers'), icon: CreditCard, dataTour: undefined },
    { to: '/expenses', label: t('menu.expenses'), icon: DollarSign, dataTour: 'expenses-desktop' },
    { to: '/incomes', label: t('menu.incomes'), icon: TrendingUp, dataTour: 'incomes-desktop' },
    { to: '/categories', label: t('menu.categories'), icon: Tag, dataTour: undefined },
    { to: '/reports', label: t('menu.reports'), icon: BarChart3, dataTour: 'reports-desktop' },
    { to: '/savings', label: t('menu.goals'), icon: PiggyBank, dataTour: undefined },
    { to: '/settings', label: t('menu.settings'), icon: Settings, dataTour: 'settings-desktop' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY, String(isDesktopSidebarCollapsed));
    } catch {
      // Keep navigation usable even when storage is blocked by the browser.
    }
  }, [isDesktopSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 md:flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-white border-r border-gray-200 dark:border-gray-800 shadow-xl transition-[width] duration-300 ${isDesktopSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>
        <div className={`flex h-full flex-col py-6 ${isDesktopSidebarCollapsed ? 'px-3' : 'px-5'}`}>
          <div className={`flex items-center gap-3 ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link to="/dashboard" className="focus-visible-ring-brand rounded-sm">
              <BrandMark showName={!isDesktopSidebarCollapsed} markSize="sm" />
            </Link>

            <button
              type="button"
              aria-expanded={!isDesktopSidebarCollapsed}
              aria-label={isDesktopSidebarCollapsed ? 'Expand desktop sidebar' : 'Collapse desktop sidebar'}
              title={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setIsDesktopSidebarCollapsed((isCollapsed) => !isCollapsed)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-100 focus-visible-ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {isDesktopSidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          <nav aria-label={t('labels.primaryNavigation', 'Primary navigation')} className="mt-8 flex flex-1 flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  data-tour={link.dataTour}
                  aria-label={isDesktopSidebarCollapsed ? link.label : undefined}
                  title={isDesktopSidebarCollapsed ? link.label : undefined}
                  className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible-ring-brand ${isDesktopSidebarCollapsed ? 'justify-center' : 'gap-3'} ${
                    isActive(link.to)
                      ? 'bg-brand-subtle text-brand-primary dark:bg-white dark:text-brand-primary shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-brand-primary dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                  {!isDesktopSidebarCollapsed && <span>{link.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className={`mb-4 flex items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isDesktopSidebarCollapsed && (
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('common:common.theme', 'Theme')}</span>
              )}
              <DarkModeToggle />
            </div>

            {activeAccount && !isDesktopSidebarCollapsed && (
              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 leading-none">{t('common:common.account')}</span>
                <span className="mt-1 block text-sm font-semibold text-gray-900 dark:text-white leading-tight">{activeAccount.name}</span>
              </div>
            )}

            {!isDesktopSidebarCollapsed && <div className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</div>}

            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-center text-gray-700 hover:bg-gray-100 hover:text-brand-primary dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-white">
              {t('common:buttons.logout', 'Logout')}
            </Button>
          </div>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 transition-[padding] duration-300 ${isDesktopSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
      {/* Mobile Header */}
      <nav className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="focus-visible-ring-brand rounded-sm">
                <BrandMark showName markSize="sm" />
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Mobile: Active Account + Dark Mode */}
              <div className="md:hidden flex items-center gap-2">
                {activeAccount && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none">{t('common:common.account')}</span>
                    <span className="text-xs font-semibold text-brand-primary leading-tight">{activeAccount.name}</span>
                  </div>
                )}
                <DarkModeToggle />
              </div>

            </div>
          </div>
        </div>

      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />

      {/* Feature Tour */}
      <FeatureTour />
      </div>
    </div>
  );
};
