import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Wallet, Tag, BarChart3, PiggyBank, Settings } from 'lucide-react';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoreMenu = ({ isOpen, onClose }: MoreMenuProps) => {
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();
  const location = useLocation();

  const moreItems = [
    { to: '/accounts', label: t('moreMenu.accounts.label'), icon: Wallet, description: t('moreMenu.accounts.description') },
    { to: '/categories', label: t('moreMenu.categories.label'), icon: Tag, description: t('moreMenu.categories.description') },
    { to: '/reports', label: t('moreMenu.reports.label'), icon: BarChart3, description: t('moreMenu.reports.description') },
    { to: '/savings', label: t('moreMenu.savings.label'), icon: PiggyBank, description: t('moreMenu.savings.description') },
    { to: '/settings', label: t('moreMenu.settings.label'), icon: Settings, description: t('moreMenu.settings.description') },
  ];

  const handleNavigate = (to: string) => {
    navigate(to);
    onClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('bottomNav.more')}</h2>
            <button
              onClick={onClose}
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
          </div>

          {/* Bottom Padding for safe area */}
          <div className="h-20" />
        </div>
      </div>
    </>
  );
};
