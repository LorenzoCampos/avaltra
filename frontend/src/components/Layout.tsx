import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/Button';
import { DarkModeToggle } from './DarkModeToggle';
import { BottomNav } from './BottomNav';

export const Layout = () => {
  const { t } = useTranslation('navigation');
  const user = useAuthStore((state) => state.user);
  const activeAccount = useAccountStore((state) => state.activeAccount);
  const { logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: t('menu.dashboard') },
    { to: '/activity', label: t('menu.activity') },
    { to: '/accounts', label: t('menu.accounts') },
    { to: '/expenses', label: t('menu.expenses') },
    { to: '/incomes', label: t('menu.incomes') },
    { to: '/categories', label: t('menu.categories') },
    { to: '/reports', label: t('menu.reports') },
    { to: '/savings', label: t('menu.goals') },
    { to: '/settings', label: t('menu.settings') },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                Bolsillo Claro
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Mobile: Active Account + Dark Mode */}
              <div className="md:hidden flex items-center gap-2">
                {activeAccount && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none">{t('common:common.account')}</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-tight">{activeAccount.name}</span>
                  </div>
                )}
                <DarkModeToggle />
              </div>

              {/* Desktop: Dark Mode + Account + User + Logout */}
              <div className="hidden md:flex items-center gap-4">
                <DarkModeToggle />
                
                {activeAccount && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none">{t('common:common.account')}</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 leading-tight">{activeAccount.name}</span>
                  </div>
                )}
                
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {user?.name}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                >
                  {t('common:buttons.logout', 'Logout')}
                </Button>
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
    </div>
  );
};
