/**
 * ============================================================================
 * ONBOARDING - CREATE ACCOUNT STEP
 * ============================================================================
 * Paso 2: Crear primera cuenta
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { AccountData } from '../types';

const createAccountSchema = z.object({
  name: z.string().min(3, 'validation.nameMinLength').min(1, 'validation.nameRequired'),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  type: z.enum(['personal', 'family']),
});

type CreateAccountFormData = z.infer<typeof createAccountSchema>;

interface CreateAccountStepProps {
  accountData: AccountData;
  onNext: (data: AccountData) => void;
  onBack: () => void;
}

export const CreateAccountStep = ({
  accountData,
  onNext,
  onBack,
}: CreateAccountStepProps) => {
  const { t } = useTranslation('onboarding');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: accountData,
  });

  const onSubmit = (data: CreateAccountFormData) => {
    onNext(data as AccountData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <Card className="max-w-2xl w-full animate-slide-up shadow-xl">
        <CardHeader className="text-center pb-4">
          {/* Progress */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('createAccount.subtitle')}
            </p>
          </div>

          {/* Icon */}
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-3xl">💰</span>
            </div>
          </div>

          {/* Title */}
          <CardTitle className="text-2xl font-bold mb-3">
            {t('createAccount.title')}
          </CardTitle>

          {/* Hint */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 {t('createAccount.hint')}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Name */}
            <div>
              <Input
                label={t('createAccount.nameLabel')}
                placeholder={t('createAccount.namePlaceholder')}
                {...register('name')}
                error={errors.name?.message ? t(`createAccount.${errors.name.message}`) : undefined}
                autoFocus
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createAccount.currencyLabel')}
              </label>
              <select
                {...register('currency')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="ARS">🇦🇷 Peso Argentino (ARS)</option>
                <option value="USD">🇺🇸 Dólar Estadounidense (USD)</option>
                <option value="EUR">🇪🇺 Euro (EUR)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('createAccount.currencyHint')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                className="w-1/3"
              >
                {t('createAccount.back')}
              </Button>

              <Button
                type="submit"
                className="w-2/3"
              >
                {t('createAccount.next')} →
              </Button>
            </div>
          </form>

          {/* Progress indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
              <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
