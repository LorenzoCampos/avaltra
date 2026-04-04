import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Wallet, Tag, BarChart3, PiggyBank, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoreMenu = ({ isOpen, onClose }: MoreMenuProps) => {
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const user = useAuthStore((state) => state.user);

  // Check if tour is active
  const isTourActive = () => {
    const tourRequested = localStorage.getItem('tourRequested') === 'true';
    const tourCompleted = localStorage.getItem('tourCompleted') === 'true';
    const allowClose = localStorage.getItem('tourAllowMenuClose') === 'true';
    return tourRequested && !tourCompleted && !allowClose;
  };

  const handleBackdropClick = () => {
    // Don't close if tour is active (unless explicitly allowed)
    if (!isTourActive()) {
      onClose();
    }
  };

  const handleClose = () => {
    // Don't close if tour is active (unless explicitly allowed)
    if (!isTourActive()) {
      onClose();
    }
  };

  const moreItems = [
    { to: '/accounts', label: t('moreMenu.accounts.label'), icon: Wallet, description: t('moreMenu.accounts.description'), dataTour: undefined },
    { to: '/categories', label: t('moreMenu.categories.label'), icon: Tag, description: t('moreMenu.categories.description'), dataTour: undefined },
    { to: '/reports', label: t('moreMenu.reports.label'), icon: BarChart3, description: t('moreMenu.reports.description'), dataTour: 'reports' },
    { to: '/savings', label: t('moreMenu.savings.label'), icon: PiggyBank, description: t('moreMenu.savings.description'), dataTour: undefined },
    { to: '/settings', label: t('moreMenu.settings.label'), icon: Settings, description: t('moreMenu.settings.description'), dataTour: 'settings' },
  ];

  const handleNavigate = (to: string) => {
    navigate(to);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!isOpen) return null;

  // Check if tour is active to adjust z-index
  const tourActive = isTourActive();

  return (
    <>
      {/* Backdrop - When tour is active, it should be BELOW Joyride overlay (z-10000) */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 animate-fade-in ${tourActive ? 'z-[9998]' : 'z-40'}`}
        onClick={handleBackdropClick}
        data-more-menu-backdrop="true"
      />

      {/* Bottom Sheet - When tour is active, it should be ABOVE Joyride overlay so buttons are clickable */}
      <div className={`md:hidden fixed inset-x-0 bottom-0 animate-slide-up ${tourActive ? 'z-[10002]' : 'z-50'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('bottomNav.more')}</h2>
            <button
              onClick={handleClose}
              data-more-menu-close="true"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label={t('common:buttons.close')}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);

              return (
                <button
                  key={item.to}
                  onClick={() => handleNavigate(item.to)}
                  data-tour={item.dataTour}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={`font-semibold ${
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-gray-200 dark:border-gray-700" />
            </div>

            {/* User Info + Logout */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user?.name || 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-semibold"
              >
                <LogOut className="w-5 h-5" />
                {t('common:buttons.logout')}
              </button>
            </div>
          </div>

          {/* Bottom Padding for safe area */}
          <div className="h-20" />
        </div>
      </div>
    </>
  );
};
