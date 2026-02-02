/**
 * ============================================================================
 * USER SETTINGS
 * ============================================================================
 * Configuración del usuario: perfil, seguridad, preferencias
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  useUser, 
  useUpdateProfile, 
  useChangePassword, 
  useSetDefaultAccount,
  useDeleteAccount 
} from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import type { UpdateProfileRequest, ChangePasswordRequest, SetDefaultAccountRequest, DeleteAccountRequest } from '@/types/user';

type TabType = 'profile' | 'security' | 'preferences' | 'danger';

export default function UserSettings() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ⚙️ {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← {t('common:buttons.back')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <TabButton
          icon="👤"
          label={t('tabs.profile')}
          isActive={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
        <TabButton
          icon="🔒"
          label={t('tabs.security')}
          isActive={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
        />
        <TabButton
          icon="🎨"
          label={t('tabs.preferences')}
          isActive={activeTab === 'preferences'}
          onClick={() => setActiveTab('preferences')}
        />
        <TabButton
          icon="⚠️"
          label={t('tabs.danger')}
          isActive={activeTab === 'danger'}
          onClick={() => setActiveTab('danger')}
          variant="danger"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'preferences' && <PreferencesTab />}
      {activeTab === 'danger' && <DangerZoneTab />}
    </div>
  );
}

// ============================================================================
// TAB BUTTON COMPONENT
// ============================================================================

interface TabButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function TabButton({ icon, label, isActive, onClick, variant = 'default' }: TabButtonProps) {
  const activeColor = variant === 'danger'
    ? 'border-red-600 text-red-600 dark:text-red-400'
    : 'border-blue-600 text-blue-600 dark:text-blue-400';

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
        isActive
          ? activeColor
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ============================================================================
// PROFILE TAB
// ============================================================================

function ProfileTab() {
  const { t } = useTranslation('settings');
  const { data: user, isLoading } = useUser();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState('');

  // Cargar nombre del usuario cuando se obtiene
  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    const data: UpdateProfileRequest = {
      name: name.trim(),
    };

    updateProfile.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.email')}
            </label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('profile.emailHelper')}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.name')} *
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              required
            />
          </div>

          {/* Member Since */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.memberSince')}
            </label>
            <Input
              type="text"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
              disabled
              className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfile.isPending || !name.trim() || name.trim() === user?.name}
            >
              {updateProfile.isPending ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SECURITY TAB
// ============================================================================

function SecurityTab() {
  const { t } = useTranslation('settings');
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    if (newPassword.length < 8) {
      return;
    }

    const data: ChangePasswordRequest = {
      current_password: currentPassword,
      new_password: newPassword,
    };

    changePassword.mutate(data, {
      onSuccess: () => {
        // Limpiar form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
    });
  };

  const passwordsMatch = newPassword === confirmPassword;
  const isNewPasswordValid = newPassword.length >= 8;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('security.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('security.currentPassword')} *
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('security.currentPasswordPlaceholder')}
              required
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('security.newPassword')} *
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('security.newPasswordPlaceholder')}
              required
              minLength={8}
            />
            {newPassword && !isNewPasswordValid && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {t('security.passwordMinLength')}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('security.confirmPassword')} *
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('security.confirmPasswordPlaceholder')}
              required
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {t('security.passwordsMismatch')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                changePassword.isPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                !passwordsMatch ||
                !isNewPasswordValid
              }
            >
              {changePassword.isPending ? t('security.submitting') : t('security.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PREFERENCES TAB
// ============================================================================

function PreferencesTab() {
  const { t } = useTranslation('settings');
  const { data: user, isLoading: userLoading } = useUser();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const setDefaultAccount = useSetDefaultAccount();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem('preferred_language') || 'es'
  );

  // Cargar cuenta por defecto cuando se obtiene el usuario
  useEffect(() => {
    if (user?.default_account_id) {
      setSelectedAccountId(user.default_account_id);
    }
  }, [user]);

  const handleSave = () => {
    const data: SetDefaultAccountRequest = {
      account_id: selectedAccountId || null,
    };

    // Guardar idioma en localStorage
    localStorage.setItem('preferred_language', selectedLanguage);
    
    // Cambiar idioma inmediatamente
    import('i18next').then((i18n) => {
      i18n.default.changeLanguage(selectedLanguage);
    });

    setDefaultAccount.mutate(data);
  };

  const hasChanges = 
    selectedAccountId !== (user?.default_account_id || '') ||
    selectedLanguage !== (localStorage.getItem('preferred_language') || 'es');

  if (userLoading || accountsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('preferences.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            🌍 {t('preferences.language')}
          </label>
          <Select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="es">🇦🇷 Español</option>
            <option value="en">🇺🇸 English</option>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('preferences.languageHelper')}
          </p>
        </div>

        {/* Default Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('preferences.defaultAccount')}
          </label>
          <Select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">{t('preferences.defaultAccountNone')}</option>
            {accounts && accounts.length > 0 ? (
              accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))
            ) : null}
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('preferences.defaultAccountHelper')}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={setDefaultAccount.isPending || !hasChanges}
          >
            {setDefaultAccount.isPending ? t('preferences.saving') : t('preferences.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DANGER ZONE TAB
// ============================================================================

function DangerZoneTab() {
  const { t } = useTranslation('settings');
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (!password || confirmation !== 'DELETE') {
      return;
    }

    const data: DeleteAccountRequest = {
      password,
      confirmation,
    };

    deleteAccount.mutate(data);
  };

  const canDelete = password && confirmation === 'DELETE';

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">⚠️ {t('danger.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
            {t('danger.deleteAccount')}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400">
            {t('danger.warning')}
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 mt-2 space-y-1">
            <li>{t('danger.deleteItems.accounts')}</li>
            <li>{t('danger.deleteItems.categories')}</li>
            <li>{t('danger.deleteItems.recurring')}</li>
            <li>{t('danger.deleteItems.goals')}</li>
            <li>{t('danger.deleteItems.profile')}</li>
          </ul>
        </div>

        {!showConfirm ? (
          <Button
            variant="danger"
            onClick={() => setShowConfirm(true)}
          >
            {t('danger.confirmButton')}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('danger.passwordLabel')} *
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('danger.passwordPlaceholder')}
                required
              />
            </div>

            {/* Confirmation Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('danger.confirmationLabel')} <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">DELETE</code> *
              </label>
              <Input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={t('danger.confirmationPlaceholder')}
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setPassword('');
                  setConfirmation('');
                }}
                disabled={deleteAccount.isPending}
              >
                {t('danger.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteAccount.isPending || !canDelete}
              >
                {deleteAccount.isPending ? t('danger.deleting') : t('danger.delete')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
