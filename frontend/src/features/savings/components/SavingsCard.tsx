import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SavingsGoal } from '@/types/savings';
import { ProgressBar } from './ProgressBar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EditIcon, TrashIcon, PlusIcon, MinusIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import { useDeleteAnimation } from '@/hooks/useDeleteAnimation';

interface SavingsCardProps {
  goal: SavingsGoal;
  onDelete: (id: string) => void;
  onAddFunds: (goal: SavingsGoal) => void;
  onWithdrawFunds: (goal: SavingsGoal) => void;
}

export const SavingsCard = ({ goal, onDelete, onAddFunds, onWithdrawFunds }: SavingsCardProps) => {
  const { t } = useTranslation('savings');
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const { handleDelete: handleDeleteWithAnimation, isDeleting } = useDeleteAnimation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: goal.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = () => {
    if (!goal.deadline) return null;
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isComplete = goal.progress_percentage >= 100;

  return (
    <Card
      className={`animate-slide-up transition-all duration-300 hover:shadow-lg ${
        isDeleting(goal.id) ? 'animate-slide-out-left' : ''
      } ${!goal.is_active ? 'opacity-60' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {goal.name}
            </h3>
            {goal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>

          {/* Actions (show on hover) */}
          <div className={`flex items-center gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/savings/edit/${goal.id}`)}
              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteWithAnimation(goal.id, () => onDelete(goal.id))}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <ProgressBar
            current={goal.current_amount}
            target={goal.target_amount}
            percentage={goal.progress_percentage}
            currency={goal.currency}
            size="md"
          />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Deadline */}
          {goal.deadline && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.deadline')}</p>
                <p className={`text-sm font-semibold ${
                  isOverdue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {formatDate(goal.deadline)}
                </p>
                {daysRemaining !== null && (
                  <p className={`text-xs ${
                    isOverdue 
                      ? 'text-red-600 dark:text-red-400' 
                      : daysRemaining <= 30
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {isOverdue 
                      ? t('card.daysOverdue', { count: Math.abs(daysRemaining) })
                      : t('card.daysLeft', { count: daysRemaining })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Saved In */}
          {goal.saved_in && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.savedIn')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {goal.saved_in}
                </p>
              </div>
            </div>
          )}

          {/* Required Monthly Savings */}
          {goal.required_monthly_savings && !isComplete && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.requiredMonthlySavings')}</p>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(goal.required_monthly_savings)}{t('card.perMonth')}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {goal.is_active && (
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAddFunds(goal)}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              {t('card.addFundsButton')}
            </Button>
            {goal.current_amount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onWithdrawFunds(goal)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <MinusIcon className="w-4 h-4" />
                {t('card.withdrawButton')}
              </Button>
            )}
          </div>
        )}

        {/* Status Badge */}
        {!goal.is_active && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              {t('card.archivedBadge')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
