import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Activity, DollarSign, TrendingUp, MoreHorizontal } from 'lucide-react';
import { MoreMenu } from './MoreMenu';

export const BottomNav = () => {
  const { t } = useTranslation('navigation');
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: t('bottomNav.home'), icon: Home, dataTour: undefined },
    { to: '/activity', label: t('bottomNav.activity'), icon: Activity, dataTour: undefined },
    { to: '/expenses', label: t('bottomNav.expenses'), icon: DollarSign, dataTour: 'expenses' },
    { to: '/incomes', label: t('bottomNav.incomes'), icon: TrendingUp, dataTour: 'incomes' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Check if current path is in "more" section
  const morePages = ['/accounts', '/categories', '/reports', '/savings', '/settings'];
  const isMoreActive = morePages.some(page => location.pathname.startsWith(page));

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.dataTour}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            data-more-menu-trigger="true"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isMoreActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <MoreHorizontal className={`w-6 h-6 ${isMoreActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className={`text-xs mt-1 ${isMoreActive ? 'font-semibold' : 'font-normal'}`}>
              {t('bottomNav.more')}
            </span>
          </button>
        </div>
      </nav>

      {/* More Menu */}
      <MoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </>
  );
};
