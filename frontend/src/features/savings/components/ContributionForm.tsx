import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { SavingsGoal, AddFundsRequest } from '@/types/savings';
import { addFundsSchema, type AddFundsSchema } from '@/schemas/savings.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XIcon } from 'lucide-react';

interface ContributionFormProps {
  goal: SavingsGoal;
  type: 'add' | 'withdraw';
  onSubmit: (data: AddFundsRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ContributionForm = ({
  goal,
  type,
  onSubmit,
  onCancel,
  isLoading,
}: ContributionFormProps) => {
  const { t } = useTranslation('savings');
  const today = new Date().toISOString().split('T')[0];
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddFundsSchema>({
    resolver: zodResolver(addFundsSchema),
    defaultValues: {
      amount: 0,
      description: '',
      date: today,
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: goal.currency,
    }).format(amount);
  };

  const handleFormSubmit = (data: AddFundsSchema) => {
    onSubmit(data);
  };

  const maxWithdraw = type === 'withdraw' ? goal.current_amount : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {type === 'add' ? t('contribution.titleAdd') : t('contribution.titleWithdraw')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {goal.name}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Current Amount Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">{t('contribution.currentAmount')}</span>{' '}
              {formatCurrency(goal.current_amount)}
            </p>
            {type === 'withdraw' && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {t('contribution.maxWithdrawal', { amount: formatCurrency(maxWithdraw!) })}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribution.amountLabel')}
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={t('contribution.amountPlaceholder')}
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message}
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribution.descriptionLabel')}
            </label>
            <Input
              type="text"
              placeholder={type === 'add' ? t('contribution.descriptionPlaceholderAdd') : t('contribution.descriptionPlaceholderWithdraw')}
              {...register('description')}
              error={errors.description?.message}
            />
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribution.dateLabel')}
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              {t('contribution.cancelButton')}
            </Button>
            <Button
              type="submit"
              variant={type === 'add' ? 'primary' : 'danger'}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading 
                ? (type === 'add' ? t('contribution.adding') : t('contribution.withdrawing')) 
                : (type === 'add' ? t('contribution.addButton') : t('contribution.withdrawButton'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
