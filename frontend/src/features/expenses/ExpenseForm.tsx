import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormSkeleton } from '@/components/ui/Skeleton';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useExpenses, useExpenseCategories, useFamilyMembers } from '@/hooks/useExpenses';
import { useAccountStore } from '@/stores/account.store';
import { useUser } from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import { usePaymentContainers } from '@/hooks/usePaymentContainers';
import type { ActionFeedbackState } from '@/hooks/useActionFeedback';
import { expenseSchema } from '@/schemas/expense.schema';
import type { Currency } from '@/schemas/account.schema';
import { buildExpenseSubmitPayload } from './formSubmissions';

type ExpenseFormInput = z.input<typeof expenseSchema>;
type ExpenseFormData = z.output<typeof expenseSchema>;

export const ExpenseForm = () => {
  const { t } = useTranslation('expenses');
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount } = useAccountStore();
  const { data: user } = useUser();
  const { accounts } = useAccounts();
  const {
    createExpenseAsync,
    isCreatingExpense,
    updateExpenseAsync,
    isUpdatingExpense,
    useExpense,
  } = useExpenses();

  const { data: expenseData, isLoading: isLoadingExpense, error: loadExpenseError } = useExpense(expenseId);
  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategories();
  const { data: familyMembers, isLoading: isLoadingFamilyMembers } = useFamilyMembers();
  const { data: paymentContainers, isLoading: isLoadingPaymentContainers } = usePaymentContainers({ includeInactive: true });

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<ActionFeedbackState['actionFeedback']>();
  const isEditing = !!expenseId;

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
  const lastCategoryId = localStorage.getItem('lastExpenseCategoryId') || null;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ExpenseFormInput, unknown, ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: defaultCurrency,
      date: defaultDate,
      category_id: lastCategoryId ?? undefined,
      family_member_id: undefined,
      source_container_id: undefined,
    },
    mode: 'onChange',
  });

  const selectedCurrency = watch('currency');
  const selectedSourceContainerId = watch('source_container_id');
  const showMultiCurrencyFields = activeAccount && selectedCurrency !== activeAccount.currency;
  const allPaymentContainers = paymentContainers?.payment_containers ?? [];
  const activePaymentContainers = allPaymentContainers.filter((container) => container.is_active);
  const defaultExpenseContainer = defaultAccount?.default_expense_container_id
    ? allPaymentContainers.find((container) => container.id === defaultAccount.default_expense_container_id)
    : null;
  const activeDefaultExpenseContainer = defaultExpenseContainer?.is_active ? defaultExpenseContainer : null;
  const showInactiveDefaultWarning = Boolean(
    defaultAccount?.default_expense_container_id && (!defaultExpenseContainer || !defaultExpenseContainer.is_active),
  );
  const hasActivePaymentContainers = activePaymentContainers.length > 0;

  // ============================================================================
  // AUTO-COMPLETAR CURRENCY basado en default account (solo para nuevos gastos)
  // ============================================================================
  useEffect(() => {
    if (!isEditing && defaultAccount) {
      setValue('currency', defaultAccount.currency);
    }
  }, [defaultAccount, isEditing, setValue]);

  useEffect(() => {
    if (!isEditing && activeDefaultExpenseContainer && !selectedSourceContainerId) {
      setValue('source_container_id', activeDefaultExpenseContainer.id, { shouldValidate: true });
    }
  }, [activeDefaultExpenseContainer, isEditing, selectedSourceContainerId, setValue]);

  // Load expense data if editing
  useEffect(() => {
    if (isEditing && expenseData) {
      setValue('description', expenseData.description);
      setValue('amount', expenseData.amount);
      setValue('currency', expenseData.currency);
      setValue('date', expenseData.date);
      setValue('category_id', expenseData.category_id ?? undefined);
      setValue('family_member_id', expenseData.family_member_id ?? undefined);
      setValue('source_container_id', expenseData.source_container_id ?? undefined);
      
      // Load amount_in_primary_currency if it exists (for multi-currency expenses)
      // Set with a small delay to ensure the multi-currency field is rendered first
      if (expenseData.amount_in_primary_currency !== null && expenseData.amount_in_primary_currency !== undefined) {
        // Only set if it's different from the regular amount (indicating a multi-currency transaction)
        if (expenseData.amount_in_primary_currency !== expenseData.amount) {
          setTimeout(() => {
            setValue('amount_in_primary_currency', expenseData.amount_in_primary_currency);
          }, 0);
        }
      }
    }
  }, [isEditing, expenseData, setValue]);

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
      if (duplicateData.source_container_id) {
        setValue('source_container_id', duplicateData.source_container_id);
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
          navigate('/expenses', {
            state: pendingFeedback ? { actionFeedback: pendingFeedback } : undefined,
          });
          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownInterval);
  }, [redirectCountdown, navigate, pendingFeedback]);

  const onSubmit = async (data: ExpenseFormData) => {
    // ============================================================================
    // GUARDAR ÚLTIMA CATEGORÍA USADA (para próxima vez)
    // ============================================================================
    if (data.category_id) {
      localStorage.setItem('lastExpenseCategoryId', data.category_id);
    }

    try {
      const payload = buildExpenseSubmitPayload(data, isEditing, {
        containerId: expenseData?.source_container_id,
      });

      const savedExpense = isEditing && expenseId
        ? await updateExpenseAsync({
            id: expenseId,
            ...payload,
          })
        : await createExpenseAsync(payload);

      setPendingFeedback({
        action: isEditing ? 'updated' : 'created',
        itemId: savedExpense.id,
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

  const paymentContainerOptions = [
    { label: t('form.paymentContext.sourceContainer.empty'), value: '' },
    ...activePaymentContainers.map((container) => ({ label: container.name, value: container.id })),
  ];
  if (isLoadingExpense || isLoadingCategories || isLoadingFamilyMembers || isLoadingPaymentContainers) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
            ← {t('form.backToList')}
          </Button>
        </div>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  if (loadExpenseError) {
    const errorMsg = (loadExpenseError as Error).message || t('form.error.unknown');
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-red-600 mb-4">{t('form.error.loading')}: {errorMsg}</p>
          <Button onClick={() => navigate('/expenses')}>{t('form.backToList')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
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
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 animate-scale-in">
                <p className="text-sm text-green-800 font-medium">
                  ✅ {t(`form.success.${isEditing ? 'update' : 'create'}`)}
                </p>
                <p className="text-xs text-green-700 mt-1">
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
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3 transition-colors duration-200">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">💱</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      {t('form.multiCurrency.title')}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                      {t('form.multiCurrency.description', { 
                        expenseCurrency: selectedCurrency, 
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

                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
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

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.paymentContext.sourceContainer.label')}
                </label>
                <InfoTooltip content={t('form.paymentContext.sourceContainer.help')} />
              </div>
              <Select
                options={paymentContainerOptions}
                error={errors.source_container_id?.message}
                {...register('source_container_id')}
                helperText={activeDefaultExpenseContainer ? t('form.paymentContext.sourceContainer.defaultHelp') : undefined}
              />
            </div>

            {!hasActivePaymentContainers && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <p>{t('form.paymentContext.noActivePlaces')}</p>
                <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => navigate('/payment-containers')}>
                  {t('form.paymentContext.createPlaceCta')}
                </Button>
              </div>
            )}

            {showInactiveDefaultWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                {t('form.paymentContext.inactiveDefaultWarning')}
              </div>
            )}

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
              isLoading={isCreatingExpense || isUpdatingExpense}
              disabled={redirectCountdown !== null || !hasActivePaymentContainers}
            >
              {isEditing ? t('form.submitEdit') : t('form.submitCreate')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
