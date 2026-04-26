import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormSkeleton } from '@/components/ui/Skeleton';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useIncomes, useIncomeCategories, useFamilyMembers } from '@/hooks/useIncomes';
import { useAccountStore } from '@/stores/account.store';
import { useUser } from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import type { ActionFeedbackState } from '@/hooks/useActionFeedback';
import { incomeSchema } from '@/schemas/income.schema';
import type { CreateIncomeRequest } from '@/types/income';
import type { Currency } from '@/schemas/account.schema';

export const IncomeForm = () => {
  const { t } = useTranslation('incomes');
  const { incomeId } = useParams<{ incomeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount } = useAccountStore();
  const { data: user } = useUser();
  const { accounts } = useAccounts();
  const {
    createIncomeAsync,
    isCreatingIncome,
    updateIncomeAsync,
    isUpdatingIncome,
    useIncome,
  } = useIncomes();

  const { data: incomeData, isLoading: isLoadingIncome, error: loadIncomeError } = useIncome(incomeId);
  const { data: categories, isLoading: isLoadingCategories } = useIncomeCategories();
  const { data: familyMembers, isLoading: isLoadingFamilyMembers } = useFamilyMembers();

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<ActionFeedbackState['actionFeedback']>();
  const isEditing = !!incomeId;

  // ============================================================================
  // DEFAULTS INTELIGENTES
  // ============================================================================
  // Prioridad: 1) Active Account (si está seleccionado manualmente)
  //            2) Default Account del usuario (de Settings)
  //            3) Primera cuenta disponible
  const defaultAccount = activeAccount 
                      || accounts.find(a => a.id === user?.default_account_id) 
                      || accounts[0];
  const defaultCurrency = defaultAccount?.currency || 'ARS' as Currency;
  const defaultDate = new Date().toISOString().split('T')[0]; // HOY
  const lastCategoryId = localStorage.getItem('lastIncomeCategoryId') || null;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateIncomeRequest>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: defaultCurrency,
      date: defaultDate,
      category_id: lastCategoryId ?? undefined,
      family_member_id: undefined,
    },
    mode: 'onChange',
  });

  const selectedCurrency = watch('currency');
  const showMultiCurrencyFields = activeAccount && selectedCurrency !== activeAccount.currency;

  // ============================================================================
  // AUTO-COMPLETAR CURRENCY basado en default account (solo para nuevos ingresos)
  // ============================================================================
  useEffect(() => {
    if (!isEditing && defaultAccount) {
      setValue('currency', defaultAccount.currency);
    }
  }, [defaultAccount, isEditing, setValue]);

  // Load income data if editing
  useEffect(() => {
    if (isEditing && incomeData) {
      setValue('description', incomeData.description);
      setValue('amount', incomeData.amount);
      setValue('currency', incomeData.currency);
      setValue('date', incomeData.date);
      setValue('category_id', incomeData.category_id ?? undefined);
      setValue('family_member_id', incomeData.family_member_id ?? undefined);
      
      // Load amount_in_primary_currency if it exists (multi-currency)
      if (incomeData.amount_in_primary_currency !== null && 
          incomeData.amount_in_primary_currency !== undefined &&
          incomeData.amount_in_primary_currency !== incomeData.amount) {
        setTimeout(() => {
          setValue('amount_in_primary_currency', incomeData.amount_in_primary_currency);
        }, 0);
      }
    }
  }, [isEditing, incomeData, setValue]);

  // Handle duplicate: pre-fill form with existing data (except date)
  useEffect(() => {
    const duplicateData = location.state?.duplicateFrom;
    if (duplicateData && !isEditing) {
      setValue('description', duplicateData.description);
      setValue('amount', duplicateData.amount);
      setValue('currency', duplicateData.currency);
      if (duplicateData.category_id) {
        setValue('category_id', duplicateData.category_id);
      }
      if (duplicateData.family_member_id) {
        setValue('family_member_id', duplicateData.family_member_id);
      }
      // Date uses default (today) - not copied from original
    }
  }, [location.state, isEditing, setValue]);

  useEffect(() => {
    if (redirectCountdown === null) {
      return;
    }

    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(countdownInterval);
          navigate('/incomes', {
            state: pendingFeedback ? { actionFeedback: pendingFeedback } : undefined,
          });
          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownInterval);
  }, [redirectCountdown, navigate, pendingFeedback]);

  const onSubmit = async (data: CreateIncomeRequest) => {
    // ============================================================================
    // GUARDAR ÚLTIMA CATEGORÍA USADA (para próxima vez)
    // ============================================================================
    if (data.category_id) {
      localStorage.setItem('lastIncomeCategoryId', data.category_id);
    }

    try {
      const savedIncome = isEditing && incomeId
        ? await updateIncomeAsync({
            id: incomeId,
            ...data,
          })
        : await createIncomeAsync(data);

      setPendingFeedback({
        action: isEditing ? 'updated' : 'created',
        itemId: savedIncome.id,
      });
      setRedirectCountdown(3);
    } catch {
      // Error toast is handled in the hook mutation.
    }
  };

  const categoryOptions = categories?.map(cat => ({ label: cat.name, value: cat.id })) || [];
  const memberOptions = familyMembers?.map(member => ({ label: member.name, value: member.id })) || [];

  const currencyOptions = [
    { label: t('form.currency.ars'), value: 'ARS' },
    { label: t('form.currency.usd'), value: 'USD' },
    { label: t('form.currency.eur'), value: 'EUR' },
  ];

  if (isLoadingIncome || isLoadingCategories || isLoadingFamilyMembers) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/incomes')}>
            ← {t('form.backToList')}
          </Button>
        </div>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  if (loadIncomeError) {
    const errorMsg = (loadIncomeError as Error).message || t('form.error.unknown');
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{t('form.error.loading')}: {errorMsg}</p>
          <Button onClick={() => navigate('/incomes')}>{t('form.backToList')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/incomes')}>
          ← {t('form.backToList')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('form.titleEdit') : t('form.titleCreate')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {redirectCountdown !== null && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-scale-in">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  ✅ {t(`form.success.${isEditing ? 'update' : 'create'}`)}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  {t('form.success.redirectingIn', { seconds: redirectCountdown })}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.description')}
                </label>
                <InfoTooltip content={t('tooltips.description')} />
              </div>
              <Input
                type="text"
                placeholder={t('form.descriptionPlaceholder')}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.amount')}
                </label>
                <InfoTooltip content={t('tooltips.amount')} />
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder={t('form.amountPlaceholder')}
                error={errors.amount?.message}
                {...register('amount', { valueAsNumber: true })}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.currencyLabel')}
                </label>
                <InfoTooltip content={t('tooltips.currency')} />
              </div>
              <Select
                options={currencyOptions}
                error={errors.currency?.message}
                {...register('currency')}
              />
            </div>

            {showMultiCurrencyFields && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3 transition-colors duration-200">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 text-sm">💱</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                      {t('form.multiCurrency.title')}
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                      {t('form.multiCurrency.description', { 
                        incomeCurrency: selectedCurrency, 
                        accountCurrency: activeAccount?.currency 
                      })}
                    </p>
                  </div>
                </div>

                <Input
                  label={t('form.multiCurrency.amountLabel', { currency: activeAccount?.currency })}
                  type="number"
                  step="0.01"
                  placeholder={t('form.multiCurrency.amountPlaceholder', { currency: activeAccount?.currency })}
                  error={errors.amount_in_primary_currency?.message}
                  {...register('amount_in_primary_currency', { valueAsNumber: true })}
                  helperText={t('form.multiCurrency.helper')}
                />

                <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                  <strong>{t('form.multiCurrency.exampleLabel')}:</strong> {t('form.multiCurrency.exampleText')}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.date')}
                </label>
                <InfoTooltip content={t('tooltips.date')} />
              </div>
              <Input
                type="date"
                error={errors.date?.message}
                {...register('date')}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.category')}
                </label>
                <InfoTooltip content={t('tooltips.category')} />
              </div>
              <Select
                options={[{ label: t('common:common.noCategory'), value: '' }, ...categoryOptions]}
                error={errors.category_id?.message}
                {...register('category_id')}
                disabled={isLoadingCategories}
                helperText={isLoadingCategories ? t('form.loadingCategories') : undefined}
              />
            </div>

            {activeAccount?.type === 'family' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('form.familyMember')}
                  </label>
                  <InfoTooltip content={t('tooltips.familyMember')} />
                </div>
                <Select
                  options={[{ label: t('form.noMember'), value: '' }, ...memberOptions]}
                  error={errors.family_member_id?.message}
                  {...register('family_member_id')}
                  disabled={isLoadingFamilyMembers}
                  helperText={isLoadingFamilyMembers ? t('form.loadingMembers') : undefined}
                />
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isCreatingIncome || isUpdatingIncome}
              disabled={redirectCountdown !== null}
            >
              {isEditing ? t('form.submitEdit') : t('form.submitCreate')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
