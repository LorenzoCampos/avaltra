import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSavings } from '@/hooks/useSavings';
import { useAccountStore } from '@/stores/account.store';
import {
  createSavingsGoalSchema,
  type CreateSavingsGoalSchema,
} from '@/schemas/savings.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ArrowLeftIcon } from 'lucide-react';
import { usePaymentContainers } from '@/hooks/usePaymentContainers';
import { buildSavingsGoalStoragePayload } from './savingsPlaceStorage';

type ApiError = { response?: { data?: { error?: string } } };

export const SavingsForm = () => {
  const { t } = useTranslation('savings');
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const isEditMode = !!goalId;

  const { activeAccount, activeAccountId } = useAccountStore();
  const { useSavingsGoal, createSavingsGoal, updateSavingsGoal, isCreating, isUpdating } =
    useSavings();
  const { data: containersData, isLoading: isLoadingContainers } = usePaymentContainers({ enabled: !!activeAccountId });

  // Fetch goal data if editing
  const {
    data: goalData,
    isLoading: isLoadingGoal,
    error: goalError,
  } = useSavingsGoal(goalId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateSavingsGoalSchema>({
    resolver: zodResolver(createSavingsGoalSchema),
    defaultValues: {
      name: '',
      target_amount: 0,
      description: '',
      deadline: '',
      saved_container_id: null,
    },
  });

  const deadlineValue = watch('deadline');
  const placeOptions = (containersData?.payment_containers ?? [])
    .filter((container) => container.is_active || container.id === goalData?.saved_container_id)
    .map((container) => ({
      label: container.is_active ? container.name : `${container.name} (${t('form.inactivePlaceLabel')})`,
      value: container.id,
    }));

  // Populate form when editing
  useEffect(() => {
    if (goalData && isEditMode) {
      reset({
        name: goalData.name,
        target_amount: goalData.target_amount,
        description: goalData.description || '',
        deadline: goalData.deadline || '',
        saved_container_id: goalData.saved_container_id ?? '',
      });
    }
  }, [goalData, isEditMode, reset]);

  const onSubmit = (data: CreateSavingsGoalSchema) => {
    // Clean up empty optional fields
    const cleanData = {
      ...data,
      description: data.description || undefined,
      deadline: data.deadline || undefined,
      ...buildSavingsGoalStoragePayload(data.saved_container_id),
    };

    if (isEditMode && goalId) {
      updateSavingsGoal(
        { goalId, data: cleanData },
        {
          onSuccess: () => {
            navigate('/savings');
          },
        }
      );
    } else {
      createSavingsGoal(cleanData, {
        onSuccess: () => {
          navigate('/savings');
        },
      });
    }
  };

  if (!activeAccountId || !activeAccount) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? t('form.titleEdit') : t('form.titleNew')}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('form.noAccount')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('form.noAccountDescription')}
            </p>
            <Button onClick={() => navigate('/accounts')}>{t('form.goToAccounts')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditMode && isLoadingGoal) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('form.titleEdit')}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('form.loadingGoal')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditMode && goalError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('form.titleEdit')}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
              {t('form.errorLoadingGoal')}
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {(goalError as ApiError)?.response?.data?.error ||
                (goalError as Error).message ||
                t('form.errorGeneric')}
            </p>
            <Button onClick={() => navigate('/savings')}>{t('form.backToSavings')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/savings')}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('form.backButton')}
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? t('form.titleEdit') : t('form.titleNew')}
        </h1>
      </div>

      {/* Form */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>{t('form.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.goalNameLabel')}
                </label>
                <InfoTooltip content={t('tooltips.savingsGoal')} />
              </div>
              <Input
                type="text"
                placeholder={t('form.goalNamePlaceholder')}
                {...register('name')}
                error={errors.name?.message}
                autoFocus
              />
            </div>

            {/* Target Amount */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.targetAmountLabel', { currency: activeAccount.currency })}
                </label>
                <InfoTooltip content={t('tooltips.targetAmount')} />
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder={t('form.targetAmountPlaceholder')}
                {...register('target_amount', { valueAsNumber: true })}
                error={errors.target_amount?.message}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.descriptionLabel')}
              </label>
              <textarea
                {...register('description')}
                placeholder={t('form.descriptionPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Deadline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.deadlineLabel')}
                </label>
                <InfoTooltip content={t('tooltips.deadline')} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    {...register('deadline')}
                    error={errors.deadline?.message}
                  />
                </div>
                {deadlineValue && (
                  <button
                    type="button"
                    onClick={() => setValue('deadline', '')}
                    className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title="Clear deadline"
                  >
                    {t('form.clearButton')}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('form.deadlineHelp')}
              </p>
            </div>

            {/* Savings Place */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.savedPlaceLabel')}
              </label>
              <Select
                options={[{ label: t('form.unassignedPlaceOption'), value: '' }, ...placeOptions]}
                {...register('saved_container_id')}
                error={errors.saved_container_id?.message}
                disabled={isLoadingContainers}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('form.savedPlaceHelp')}
              </p>
              {isEditMode && goalData?.saved_in && !goalData.saved_container_id && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  {t('form.legacySavedInHelp', { value: goalData.saved_in })}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">{t('form.tipTitle')}</span> {t('form.tipDescription')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/savings')}
                disabled={isCreating || isUpdating}
                className="flex-1"
              >
                {t('form.cancelButton')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isCreating || isUpdating}
                className="flex-1"
              >
                {isCreating || isUpdating
                  ? isEditMode
                    ? t('form.updating')
                    : t('form.creating')
                  : isEditMode
                  ? t('form.updateButton')
                  : t('form.createButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
