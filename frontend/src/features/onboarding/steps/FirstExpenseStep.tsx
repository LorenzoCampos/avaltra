/**
 * ============================================================================
 * ONBOARDING - FIRST EXPENSE STEP
 * ============================================================================
 * Paso 3: Agregar primer gasto (opcional)
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { ExpenseData } from '../types';

const firstExpenseSchema = z.object({
  description: z.string().min(1, 'validation.descriptionRequired'),
  amount: z.number().positive('validation.amountPositive'),
});

type FirstExpenseFormData = z.infer<typeof firstExpenseSchema>;

interface FirstExpenseStepProps {
  expenseData: ExpenseData;
  currency: string;
  onNext: (data: ExpenseData) => void;
  onSkip: () => void;
  onBack: () => void;
}

export const FirstExpenseStep = ({
  expenseData,
  currency,
  onNext,
  onSkip,
  onBack,
}: FirstExpenseStepProps) => {
  const { t } = useTranslation('onboarding');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstExpenseFormData>({
    resolver: zodResolver(firstExpenseSchema),
    defaultValues: expenseData,
  });

  const onSubmit = (data: FirstExpenseFormData) => {
    onNext(data as ExpenseData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <Card className="max-w-2xl w-full animate-slide-up shadow-xl">
        <CardHeader className="text-center pb-4">
          {/* Progress */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('firstExpense.subtitle')}
            </p>
          </div>

          {/* Icon */}
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full">
              <span className="text-3xl">📝</span>
            </div>
          </div>

          {/* Title */}
          <CardTitle className="text-2xl font-bold mb-3">
            {t('firstExpense.title')}
          </CardTitle>

          {/* Hint */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto mb-2">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 {t('firstExpense.hint')}
            </p>
          </div>

          {/* Optional badge */}
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t('firstExpense.optional')}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Description */}
            <div>
              <Input
                label={t('firstExpense.descriptionLabel')}
                placeholder={t('firstExpense.descriptionPlaceholder')}
                {...register('description')}
                error={errors.description?.message ? t(`firstExpense.${errors.description.message}`) : undefined}
                autoFocus
              />
            </div>

            {/* Amount */}
            <div>
              <Input
                type="number"
                step="0.01"
                label={`${t('firstExpense.amountLabel')} (${currency})`}
                placeholder={t('firstExpense.amountPlaceholder')}
                {...register('amount', { valueAsNumber: true })}
                error={errors.amount?.message ? t(`firstExpense.${errors.amount.message}`) : undefined}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onBack}
                  className="w-1/3"
                >
                  {t('firstExpense.back')}
                </Button>

                <Button
                  type="submit"
                  className="w-2/3"
                >
                  {t('firstExpense.add')} →
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                className="w-full text-gray-600 dark:text-gray-400"
              >
                {t('firstExpense.skip')}
              </Button>
            </div>
          </form>

          {/* Progress indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
              <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
